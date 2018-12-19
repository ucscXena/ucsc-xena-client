'use strict';

import Rx from '../rx';
import { make, mount, compose } from './utils';
import { servers } from '../defaultServers';
import { cohortSummary, probemapList, datasetStatus } from '../xenaQuery';
import { Let, assoc, assocIn, assocInAll, get, getIn, has, isArray, last, object, pluck, updateIn } from "../underscore_ext";
import Worker from 'worker-loader!./import-worker';

var loaderSocket = Rx.Observable.webSocket("ws://localhost:7222/load-events");

var watchQueueFor = file =>
	loaderSocket.takeWhile(({queue}) => queue.find(([name]) => name === file))
		.last(null, null, 'done');

const worker = new Worker();

// XXX error handling? What do we do with errors in the worker?
// For import, we collect & report, so in theory there aren't any.
// For read file, unclear.. what if there's a permissions error,
// or something? Is this possible?
const workerObs = Rx.Observable.fromEvent(worker, 'message').share();
var msgId = 0;

// sendMessage wraps worker messages in ajax-like observables, by assigning
// unique ids to each request, and waiting for a single response with the
// same id. The worker must echo the id in the response.
const sendMessage = msg => {
	var id = msgId++;
	worker.postMessage({msg, id});
	return workerObs.filter(ev => ev.data.id === id).take(1).map(ev => ev.data.msg);
};

const referenceHost = 'https://reference.xenahubs.net',
    defaultStudyName = 'My Study';

const getDefaultState = () => ({
    wizardPage: 0,
    wizardHistory: []
});

const getDefaultCustomCohort = (localCohorts, name = defaultStudyName, number = 1) => {
    return !localCohorts.includes(name) ? name : getDefaultCustomCohort(localCohorts, `${defaultStudyName} (${number})`, ++number);
};

const importFileDone = (state, result) =>
	updateIn(state, ['form'], form =>
		assoc(form,
			'errorCheckInprogress', false,
			'errors', get(result, 'errors', []),
			'warnings', get(result, 'warnings', []),
			'errorSnippets', get(result, 'snippets', []),
			'serverError', get(result, 'serverError', undefined),
			'probemapError', get(result, 'probemapError', undefined)));

const fileQueued = (fileName, queue) =>
	isArray(queue) && get(last(queue), 0) === fileName;

const readFileDone = (state, result) =>
	has(result, 'serverError') ?
		assocIn(state, ['form', 'serverError'], result.serverError) :
		Let(([{recommended, form}, fileContent] = result) =>
		 ({...state, fileContent, recommended, fileReadInProgress: false, form: {...state.form, ...form}}));

// XXX handle 'inference'
const retryFileDone = (state, [[{recommended, form}, fileContent], errors]) => {
    const stateWithInference = assocInAll(state,
        ['recommended'], recommended,
        ['retryForm'], form
    );
    return importFileDone(assocInAll(stateWithInference, ['fileContent'], fileContent), errors);
};

const onRetryMetaData = (state) => {
    let retryForm = getIn(state, ['retryForm']) || {};
    retryForm = {
        ...retryForm,
        newCohort: getDefaultCustomCohort(getIn(state, ['localCohorts']))
    };
    return assocInAll(state, ['form'], retryForm, ['retryForm'], undefined);
};


function parseServerErrors(resp) {
	const [{status, text}] = resp,
		// Ignoring loader warnings, for now, since we can only have loader warnings
		// if the user chose to ignore warnings before loading.
		{/*loader, */error} = JSON.parse(text);
	return status === 'loaded' ? {} : {
		serverError: error || 'Unknown server error'
	};
}

// emits error result in form {error, serverError, ...}
const postFile = ({fileName, form, localProbemaps}, ignoreWarnings) =>
	sendMessage(['postFile', fileName, form, localProbemaps, ignoreWarnings])
	.flatMap(result => fileQueued(fileName, result) ?
			watchQueueFor(fileName)
				.switchMapTo(datasetStatus(servers.localHub, fileName))
				.map(parseServerErrors)
		: Rx.Observable.of(result));

const getCohortArray = cohorts => cohorts.map(c => c.cohort);
const getValueLabelList = (items) => items
    .map(item => ({label: item.label, value: {name: item.name, hash: item.hash}}));

const fetchLocalProbemaps = serverBus =>
        serverBus.next(['set-local-probemaps', probemapList(servers.localHub)]);

//var t0;
const importControls = {
	// XXX Important: this controller is stateful, due to maintaining a
	// web worker.
    'file': (state, fileHandle) => assocInAll(state, ['file'], fileHandle, ['fileName'], fileHandle.name),
    'import-file-post!': (serverBus, state, newState) => {
//		t0 = Date.now();
		serverBus.next(['import-file-done', postFile(newState)]);
	},

	// Merge in any errors & status from the file save.
    'import-file-done': importFileDone,
	// on dataset error, we may have loaded a probemap
	'import-file-done-post!': (serverBus, state, newState) => {
		fetchLocalProbemaps(serverBus, state, newState);
//		console.log(`load time ${(Date.now() - t0) / 1000} sec`);
	},
	'read-file': state => assocIn(state, ['form', 'serverError'], undefined),
    'read-file-post!': (serverBus, state, newState, fileHandle) =>
        serverBus.next(['read-file-done', sendMessage(['loadFile', newState.probemaps, fileHandle])]),
    'file-read-inprogress': state => assocIn(state, ['fileReadInProgress'], true),
	// XXX add spinner to file snippet & make sure back/forward make
	// sense while waiting on this.
	'read-file-done': readFileDone,
    'set-status': (state, status) => assocIn(state, ['status'], status),
    'wizard-page': (state, newPage) => assocIn(state, ['wizardPage'], newPage),
    'wizard-page-history': (state, newHistory) => assocIn(state, ['wizardHistory'], newHistory),
    'file-content': (state, content) => assocIn(state, ['fileContent'], content),
    'clear-metadata': (state) => assocIn(state, ['form'], {}),
	// XXX form state is probably messed up at this point. Need a way
	// to merge in new inference when file changes.
    'retry-file-post!': (serverBus, state, newState, fileHandle) =>
		serverBus.next(['retry-file-done', sendMessage(['loadFile', newState.probemaps, fileHandle])
				.flatMap(newFile => postFile(newState).map(errors => ([newFile, errors])))]),
    'retry-file-done': retryFileDone,
    // on dataset error, we may have loaded a probemap
    'retry-file-done-post!': fetchLocalProbemaps,
    'retry-meta-data': onRetryMetaData,
    'reset-import-state': (state) => getDefaultState(state),
    'load-with-warnings-post!': (serverBus, state, newState) =>
		serverBus.next(['import-file-done', postFile(newState, true)])
};

const query = {
    'get-local-cohorts-post!': serverBus => serverBus.next(['local-cohorts', cohortSummary(servers.localHub, [])]),
    'local-cohorts': (state, cohorts) => {
        const localCohorts = getCohortArray(cohorts);
        return assocInAll(state,
            ['localCohorts'], localCohorts,
            ['form', 'newCohort'], getDefaultCustomCohort(localCohorts));
    },
    'get-probemaps-post!': serverBus => {
        serverBus.next(['set-probemaps', probemapList(referenceHost)]);
        fetchLocalProbemaps(serverBus);
    },
    'set-probemaps': (state, probemaps) => assocIn(state, ['probemaps'], getValueLabelList(probemaps)),
     'set-local-probemaps': (state, probemaps) => assoc(state, 'localProbemaps', object(pluck(probemaps, 'hash'), probemaps)),
};

const changeFormProp = propName => (state, propValue) => assocIn(state, ['form', propName], propValue);

const formControls = {
    'file-format': changeFormProp('fileFormat'),
    'data-type': changeFormProp('dataType'),
    'cohort-radio': changeFormProp('cohortRadio'),
    'import-publicCohort': changeFormProp('publicCohort'),
    'import-localCohort': changeFormProp('localCohort'),
    'import-newCohort': changeFormProp('newCohort'),
    'errors': changeFormProp('errors'),
    'probemap': changeFormProp('probemap'),
    'assembly': changeFormProp('assembly'),
	// We can only set this 'true' from the UI. It is reset from an action handler, after import.
    'error-check-inprogress': state =>
		// importFileDone will clear the error state if no errors are passed for the second arg.
		assocIn(importFileDone(state), ['form', 'errorCheckInprogress'], true)
};


export default mount(compose(
    make(importControls),
    make(query),
    make(formControls)), ['import']);
