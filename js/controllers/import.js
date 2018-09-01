'use strict';

import Rx from '../rx';
import { make, mount, compose } from './utils';
import { servers } from '../defaultServers';
import { cohortSummary, probemapList } from '../xenaQuery';
import { assoc, assocIn, assocInAll, has, getIn, object, pluck } from "../underscore_ext";
import infer from '../import/infer.js';
import { FILE_FORMAT } from '../import/constants';

import getErrors from '../import/errorChecking';

const referenceHost = 'https://reference.xenahubs.net',
    defaultStudyName = 'My Study';

const getDefaultState = () => ({
    wizardPage: 0,
    wizardHistory: []
});

const getBaseProbemapName = name => name ? name.replace(/(.*[/])/, '') : null;

const createMetaDataFile = (state) => {
    const probemap = getBaseProbemapName(getIn(state, ['probemap', 'name']));
    return JSON.stringify({
        version: new Date().toISOString().split('T')[0],
        cohort: state.cohortRadio === 'newCohort' ? state.customCohort : state.cohort,
        dataSubType: state.dataType,
        type: state.fileFormat,
        assembly: state.assembly || void 0,
        probemap: probemap ? probemap : void 0
    }, null, 4);
};

const readFileObs = (fileHandle) => {
    return Rx.Observable.create(obs => {
        const reader = new FileReader();
        reader.onload = (e) => {
            obs.next(e.target.result);
            obs.complete();
        };
        reader.onerror = () => {};
        reader.readAsBinaryString(fileHandle);
        return () => {};
    });
};

const postFile = (file) => {
    const payload = {
        url: `${servers.localHub}/upload/`,
        body: file,
        responseType: 'text',
        method: 'POST',
        crossDomain: true
    };

    return Rx.Observable.ajax(payload);
};

const updateFile = (fileName) => {
    const payload = {
        url: `${servers.localHub}/update/`,
        body: {'file': fileName},
        responseType: 'text',
        method: 'POST',
        crossDomain: true
    };
    return Rx.Observable.ajax(payload);
};

const checkForErrors = (fileContent, fileFormat, dataType) => {
    return Rx.Observable.create(obs => {
        const result = getErrors(fileContent, fileFormat, dataType);
        setTimeout(() => {
            obs.next(result);
            obs.complete();
        }, 0);
        return () => {};
    });
};

const importFile = ({ fileName, fileContent, file, form }, ignoreWarnings = false) => {
    const formData = new FormData();

    formData.append("file", new Blob([fileContent]), fileName);
    formData.append("file", new Blob([createMetaDataFile(form)]), fileName + '.json');

    return checkForErrors(fileContent, form.fileFormat, form.dataType)
        .flatMap(checkingRes => {
            const { errors, warnings, snippets } = checkingRes;

            if (errors.length) {
                return Rx.Observable.of({ errors, snippets });
            } else if (warnings.length && !ignoreWarnings) {
                return Rx.Observable.of({ warnings });
            } else {
                return postFile(formData).concat(updateFile(fileName))
                    .catch(error => Rx.Observable.of({serverError: error.message}));
            }
        }
    ).catch(error => Rx.Observable.of({ serverError: error.message }, Rx.Scheduler.asap));
};

const retryFile = (state, fileHandle) => {
    return readFileObs(fileHandle).flatMap(content => Rx.Observable.zip(
        importFile({
            fileName: fileHandle.name,
            fileContent: content,
            file: fileHandle,
            form: getIn(state, ['form'])
        }),

        Rx.Observable.of(content),
        Rx.Observable.of(fileHandle.name)
    ));
};

const importFileDone = (state, result) => {
    state = assocIn(state, ['form', 'errorCheckInprogress'], false);
    state = assocInAll(state, ['form', 'errors'], [],
                                ['form', 'warnings'], [],
                                ['form', 'errorSnippets'], []);

    if(result.errors) {
        const snippets = result.snippets || [];
        return assocInAll(state, ['form', 'errors'], result.errors,
                                ['form', 'errorSnippets'], snippets);
    } else if (result.warnings) {
        return assocIn(state, ['form', 'warnings'], result.warnings);
    } else if (result.serverError) {
        return assocIn(state, ['form', 'serverError'], result.serverError);
    }
    return state;
};

const retryFileDone = (state, [errors, fileContent, fileName]) => {
    state = assocInAll(state, ['fileContent'], fileContent,
                            ['fileName'], fileName);
    return importFileDone(state, errors);
};

const download = (host, name) => Rx.Observable.ajax({
    url: host + '/download/' + name,
    responseType: 'text',
    method: 'GET',
    crossDomain: true
});

const uploadProbemapFile = ({ name }) => {
    return Rx.Observable.zip(download(referenceHost, name), download(referenceHost, name + '.json'))
        .flatMap(([data, json]) => {
            const formData = new FormData();
            var fileName = getBaseProbemapName(name);

            formData.append("file", new Blob([data.response]), fileName);
            formData.append("file", new Blob([json.response]), fileName + '.json');

            return postFile(formData).concat(updateFile(fileName));
        });
};
const getCohortArray = cohorts => cohorts.map(c => c.cohort);
const getValueLabelList = (items) => items
    .map(item => ({label: item.label, userlevel: item.userlevel, value: {name: item.name, hash: item.hash}}));

const getDefaultCustomCohort = (localCohorts, name = defaultStudyName, number = 1) => {
    return !localCohorts.includes(name) ? name : getDefaultCustomCohort(localCohorts, `${defaultStudyName} (${number})`, ++number);
};

// XXX This is a bit rough, just demonstrating how we might approach incorporating
// the inferences on data format. We may get a suggestion of where the samples are
// (1st column or 1st row), an ordered list of matching probemaps (or undefined),
// and an ordered list of matching cohorts (or undefined). We stash all of these,
// and pre-populate some form fields, like cohortRadio and fileFormat. We could
// pre-poulate probemap, but due to the current probemap wizard screen it would
// require first identifying the correct radio button (gene/transcript or probe).
// We probably want to refactor that screen, instead. There's more we might
// infer, e.g. if we match probemaps, it probably isn't a segmented or mutation
// dataset, and we could drop those from the data type selection.
const inferForm = (state, fileContent) => {
	var inference = infer(fileContent),
		{samples, probemaps, cohorts} = inference || {},
		inferredOrientation = samples === 'row' ?
				  FILE_FORMAT.GENOMIC_MATRIX : undefined,
		cohort = getIn(cohorts, [0, 'name']),
        probemap = getIn(probemaps, [0, 'name']);

    probemap = getIn(
            getIn(state, ['probemaps']).find(p => getIn(p, ['value', 'name']) === probemap),
            ['value']
        );

	return assocIn(state,
			['recommended'], inference,
			['form', 'fileFormat'], inferredOrientation,
			['form', 'cohortRadio'], cohort ? 'existingPublicCohort' : undefined,
			['form', 'cohort'], cohort,
			['form', 'probemap'], probemap);
};

const importControls = {
    'file': (state, fileHandle) => assocInAll(state, ['file'], fileHandle, ['fileName'], fileHandle.name),
    'import-file-post!': (serverBus, state, newState) =>
        serverBus.next(['import-file-done',
            newState.form.probemap && !has(newState.localProbemaps, newState.form.probemap.hash) ?
                uploadProbemapFile(newState.form.probemap).concat(importFile(state)) : importFile(state)]),
    'import-file-done': importFileDone,
    'update-file-post!': (serverBus, state, newState, fileName) => serverBus.next(['update-file-done', updateFile(fileName)]),
    'update-file-done': (state) => assocIn(state, ['status'], 'File successfully saved!'),
    'read-file-post!': (serverBus, state, newState, fileHandle) => serverBus.next(['read-file-done', readFileObs(fileHandle)]),
    'read-file-done': (state, fileContent) =>
        assocInAll(inferForm(state, fileContent),
            ['fileContent'], fileContent),
    'set-status': (state, status) => assocIn(state, ['status'], status),
    'wizard-page': (state, newPage) => assocIn(state, ['wizardPage'], newPage),
    'wizard-page-history': (state, newHistory) => assocIn(state, ['wizardHistory'], newHistory),
    'file-content': (state, content) => assocIn(state, ['fileContent'], content),
    'clear-metadata': (state) => assocIn(state, ['form'], {}),
    'retry-file-post!': (serverBus, state, newState, fileHandle) => serverBus.next(['retry-file-done', retryFile(state, fileHandle)]),
    'retry-file-done': retryFileDone,
    'set-default-custom-cohort': (state) =>
        assocIn(state, ['form', 'customCohort'], getDefaultCustomCohort(getIn(state, ['localCohorts']))),
    'reset-import-state': (state) => getDefaultState(state),
    'load-with-warnings-post!': (serverBus, state) => serverBus.next(['import-file-done', importFile(state, true)])
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
