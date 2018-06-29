/* eslint-disable */
'use strict';
import Rx from '../rx';
import { make, mount, compose } from './utils';
import { servers } from '../defaultServers';
import { assocIn, assocInAll } from "../underscore_ext";

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

const readFile = (serverBus, state, newState, fileHandle) => {
    if (fileHandle) {
        const reader = new FileReader();
        reader.onload = (e) => serverBus.next(['read-file-done', Rx.Observable.of(e.target.result)]);
        reader.onerror = (e) => serverBus.next(['set-status', e.toString()]);
        reader.readAsBinaryString(fileHandle);
    }
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

const importControls = {
    'import-file-post!': (serverBus, state, newState, file) => serverBus.next(['import-file-done', postFile(file)]),
    'import-file-done': (state, b, c) => assocIn(state, ['status'], 'File successfully saved!'),
    'update-file-post!': (serverBus, state, newState, fileName) => serverBus.next(['update-file-done', updateFile(fileName)]),
    'update-file-done': (state, b, c) => assocIn(state, ['status'], 'File successfully saved!'),
    'read-file-post!': readFile,
    'read-file-done': (state, fileContent) => 
        assocInAll(state, 
            ['status'], 'File successfully read!',
            ['fileContent'], fileContent),
    'set-status': (state, status, x) => assocIn(state, ['status'], status),
    'wizard-page': (state, newPage) => assocIn(state, ['wizardPage'], newPage),
    'file-content': (state, content) => assocIn(state, ['fileContent'], content),
    'check-errors-post!': (serverBus, state, newState, file, fileContent, fileFormat) => 
        serverBus.next(['check-errors-done', checkForErrors(file, fileContent, fileFormat)]),
    'check-errors-done': (state, errors) => 
        assocInAll(state, 
            ['status'], (errors.length ? 'There was some error found in the file' : ''),
            ['form', 'errors'], errors)
}

const changeFormProp = propName => (state, propValue) => assocIn(state, ['form', propName], propValue);

const formControls = {
    'file': changeFormProp('file'),
    'file-format': changeFormProp('fileFormat'),
    'data-type': changeFormProp('dataType'),
    'custom-data-type': changeFormProp('customDataType'),
    'cohort': changeFormProp('cohort'),
    'custom-cohort': changeFormProp('customCohort'),
    'probemap-file': changeFormProp('probeMapFile'),
    'display-name': changeFormProp('displayName'),
    'description': changeFormProp('description'),
    'errors': changeFormProp('errors')
}


export default  mount(compose(
    make(importControls), 
    make(formControls)), ['import']);