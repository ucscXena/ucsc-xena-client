'use strict';

import Rx from '../rx';
import { make, mount, compose } from './utils';
import { servers } from '../defaultServers';
import { cohortSummary, probemapList } from '../xenaQuery';
import { assoc, assocIn, assocInAll, getIn, object, pluck } from "../underscore_ext";
import Worker from 'worker-loader!./import-worker';

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

const importFileDone = (state, result) =>
	updateIn(state, ['form'], form =>
		assoc(form,
			  'errorCheckInprogress', false,
			  'errors', get(result, 'errors', []),
			  'warnings', get(spy('load result', result), 'warnings', []),
			  'errorSnippets', get(result, 'snippets', []),
			  'serverError', get(result, 'serverError', undefined),
			  'probemapError', get(result, 'probemapError', undefined)));

const retryFileDone = (state, [{fileContent}, errors]) =>
    importFileDone(assocInAll(state, ['fileContent'], fileContent), errors);

const getCohortArray = cohorts => cohorts.map(c => c.cohort);
const getValueLabelList = (items) => items
    .map(item => ({label: item.label, userlevel: item.userlevel, value: {name: item.name, hash: item.hash}}));

const getDefaultCustomCohort = (localCohorts, name = defaultStudyName, number = 1) => {
    return !localCohorts.includes(name) ? name : getDefaultCustomCohort(localCohorts, `${defaultStudyName} (${number})`, ++number);
};

const importControls = {
	// XXX Important: this controller is stateful, due to maintaining a
	// web worker.
    'file': (state, fileHandle) => assocInAll(state, ['file'], fileHandle, ['fileName'], fileHandle.name),
    'import-file-post!': (serverBus, state, newState) =>
		serverBus.next(['import-file-done',
			sendMessage(['postFile', newState.fileName, newState.form, newState.localProbemaps])]),

	// Merge in any errors & status from the file save.
    'import-file-done': importFileDone,
    'read-file-post!': (serverBus, state, newState, fileHandle) =>
		serverBus.next(['read-file-done', sendMessage(['loadFile', newState.probemaps, fileHandle])]),
	// XXX add spinner to file snippet & make sure back/forward make
	// sense while waiting on this.
	'read-file-done': (state, [{recommended, form}, fileContent]) =>
		({...state, fileContent, recommended, form: {...state.form, ...form}}),
    'set-status': (state, status) => assocIn(state, ['status'], status),
    'wizard-page': (state, newPage) => assocIn(state, ['wizardPage'], newPage),
    'wizard-page-history': (state, newHistory) => assocIn(state, ['wizardHistory'], newHistory),
    'file-content': (state, content) => assocIn(state, ['fileContent'], content),
    'clear-metadata': (state) => assocIn(state, ['form'], {}),
	// XXX form state is probably messed up at this point. Need a way
	// to merge in new inference when file changes.
    'retry-file-post!': (serverBus, state, newState, fileHandle) =>
		serverBus.next(['retry-file-done', sendMessage(['loadFile', newState.probemaps, fileHandle])
				.flatMap(newFile => sendMessage(['postFile', newState.fileName, newState.form, newState.localProbemaps]).map(errors => ([newFile, errors])))]),
    'retry-file-done': retryFileDone,
    'set-default-custom-cohort': (state) =>
        assocIn(state, ['form', 'customCohort'], getDefaultCustomCohort(getIn(state, ['localCohorts']))),
    'reset-import-state': (state) => getDefaultState(state),
    'load-with-warnings-post!': (serverBus, state, newState) =>
		serverBus.next(['import-file-done',
			sendMessage(['postFile', newState.fileName, newState.form, newState.localProbemaps, true])])
};

const query = {
    'get-local-cohorts-post!': serverBus => serverBus.next(['local-cohorts', cohortSummary(servers.localHub, [])]),
    'local-cohorts': (state, cohorts) => {
        const localCohorts = getCohortArray(cohorts);
        return assocInAll(state,
            ['localCohorts'], localCohorts,
            ['form', 'customCohort'], getDefaultCustomCohort(localCohorts));
    },
    'get-probemaps-post!': serverBus => {
        serverBus.next(['set-probemaps', probemapList(referenceHost)]);
        serverBus.next(['set-local-probemaps', probemapList(servers.localHub)]);
    },
    'set-probemaps': (state, probemaps) => assocIn(state, ['probemaps'], getValueLabelList(probemaps)),
     'set-local-probemaps': (state, probemaps) => assoc(state, 'localProbemaps', object(pluck(probemaps, 'hash'), probemaps)),
};

const changeFormProp = propName => (state, propValue) => assocIn(state, ['form', propName], propValue);

const formControls = {
    'file-format': changeFormProp('fileFormat'),
    'data-type': changeFormProp('dataType'),
    'cohort-radio': changeFormProp('cohortRadio'),
    'import-cohort': changeFormProp('cohort'),
    'custom-cohort': changeFormProp('customCohort'),
    'errors': changeFormProp('errors'),
    'probemap': changeFormProp('probemap'),
    'assembly': changeFormProp('assembly'),
    'error-check-inprogress': changeFormProp('errorCheckInprogress')
};


export default mount(compose(
    make(importControls),
    make(query),
    make(formControls)), ['import']);
