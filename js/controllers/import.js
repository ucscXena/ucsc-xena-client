/* eslint-disable */
'use strict';
import Rx from '../rx';
import { make, mount, compose } from './utils';
import { servers } from '../defaultServers';
import { cohortSummary } from '../xenaQuery';
import { assocIn, assocInAll, getIn } from "../underscore_ext";

import getErrors from '../import/errorChecking';

const postFile = (file) => {
    const payload = {
        url: `${servers.localHub}/upload/`,
        body: file,
        responseType: 'text',
        method: 'POST',
        crossDomain: true
    };

    return Rx.Observable.ajax(payload).map(r => r.status);
};

const updateFile = (fileName) => {
    const payload = {
        url: `${servers.localHub}/update/`,
        body: {'filename': fileName},
        responseType: 'text',
        method: 'POST',
        crossDomain: true
    };
    return Rx.Observable.ajax(payload).map(r => r.status);
};

const readFileObs = (fileHandle) => {
    return Rx.Observable.create(obs => {
        const reader = new FileReader();
        reader.onload = (e) => {
            obs.next(e.target.result);
            obs.complete();
        };
        //TODO show these errors 
        reader.onerror = (e) => {}; 
        reader.readAsBinaryString(fileHandle);
        return () => {};
    });
};

const checkForErrors = (file, fileContent, fileFormat) => {  
    return Rx.Observable.create(obs => {
        const errors = getErrors(file, fileContent, fileFormat);
        setTimeout(() => {
            obs.next(errors);
            obs.complete();
        }, 0);
         
        return () => {};
    }).map(e => e);
};

const getCohortArray = cohorts => cohorts.map(c => c.cohort);

const getDefaultCustomCohort = (localCohorts, name='New Study', number=1) => {
    return !localCohorts.includes(name) ? name : getDefaultCustomCohort(localCohorts, `New Study (${number})`, ++number);
};

const importControls = {
    'file': (state, fileHandle) => assocInAll(state, ['file'], fileHandle, ['fileName'], fileHandle.name),
    'import-file-post!': (serverBus, state, newState, file) => serverBus.next(['import-file-done', postFile(file)]),
    'import-file-done': (state) => assocIn(state, ['status'], 'File successfully saved!'),
    'update-file-post!': (serverBus, state, newState, fileName) => serverBus.next(['update-file-done', updateFile(fileName)]),
    'update-file-done': (state) => assocIn(state, ['status'], 'File successfully saved!'),
    'read-file-post!': (serverBus, state, newState, fileHandle) => serverBus.next(['read-file-done', readFileObs(fileHandle)]),
    'read-file-done': (state, fileContent) => 
        assocInAll(state, 
            ['status'], 'File successfully read!',
            ['fileContent'], fileContent),
    'set-status': (state, status) => assocIn(state, ['status'], status),
    'wizard-page': (state, newPage) => assocIn(state, ['wizardPage'], newPage),
    'file-content': (state, content) => assocIn(state, ['fileContent'], content),
    'check-errors-post!': (serverBus, state, newState, file, fileContent, fileFormat) => 
        serverBus.next(['check-errors-done', checkForErrors(file, fileContent, fileFormat)]),
    'check-errors-done': (state, errors) => 
        assocInAll(state, 
            ['status'], (errors.length ? 'There was some error found in the file' : ''),
            ['form', 'errors'], errors,
            ['form', 'errorCheckInprogress'], false),
    'clear-metadata': (state) => assocIn(state, ['form'], {}),
    'retry-file-post!': (serverBus, state, newState, fileHandle) => 
        serverBus.next(['retry-file-done',
            readFileObs(fileHandle).flatMap(content => Rx.Observable.zip(
                    checkForErrors(fileHandle, content, getIn(state, ['form', 'dataType'])),
                    Rx.Observable.of(content),
                    Rx.Observable.of(fileHandle.name)
            ))
        ]),
    'retry-file-done': (state, [errors, fileContent, fileName]) =>  assocInAll(state, 
            ['fileContent'], fileContent,
            ['form', 'errors'], errors,
            ['fileName'], fileName),
    'set-default-custom-cohort': (state) => 
        assocIn(state, ['form', 'customCohort'], getDefaultCustomCohort(getIn(state, ['localCohorts'])))
    
};

const query = {
    'get-local-cohorts-post!': (serverBus, state, newState) => serverBus.next(['local-cohorts', cohortSummary(servers.localHub, [])]),
    'local-cohorts': (state, cohorts) => {
        const localCohorts = getCohortArray(cohorts);
        return assocInAll(state, 
            ['localCohorts'], localCohorts,
            ['form', 'customCohort'], getDefaultCustomCohort(localCohorts));
    }
}

const changeFormProp = propName => (state, propValue) => assocIn(state, ['form', propName], propValue);

const formControls = {
    'file-format': changeFormProp('fileFormat'),
    'data-type': changeFormProp('dataType'),
    'custom-data-type': changeFormProp('customDataType'),
    'cohort': changeFormProp('cohort'),
    'custom-cohort': changeFormProp('customCohort'),
    'probemap-file': changeFormProp('probeMapFile'),
    'display-name': changeFormProp('displayName'),
    'description': changeFormProp('description'),
    'errors': changeFormProp('errors'),
    'genes': changeFormProp('genes'),
    'probes': changeFormProp('probes'),
    'assembly': changeFormProp('assembly'),
    'error-check-inprogress': changeFormProp('errorCheckInprogress')
}


export default  mount(compose(
    make(importControls), 
    make(query),
    make(formControls)), ['import']);