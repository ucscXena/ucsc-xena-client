/* eslint-disable */ 
'use strict';
import Rx from '../rx';
import { make, mount, compose } from './utils';
import { encodeObject } from '../util';
import { isArray, merge } from "../underscore_ext";
import { servers } from '../defaultServers';

import { assocIn, updateIn } from "../underscore_ext";

const postFile = (file) => {
    const payload = {
        url: `${servers.localHub}/upload/`,
        body: file,
        responseType: 'text',
        method: 'POST',
        crossDomain: true
    }

    return Rx.Observable.ajax(payload).map(r => r.status);
}

const updateFile = (fileName) => {
    const payload = {
        url: `${servers.localHub}/update/`,
        body: {'filename': fileName},
        responseType: 'text',
        method: 'POST',
        crossDomain: true
    }
    return Rx.Observable.ajax(payload).map(r => r.status);
}

const importControls = {
    'import-file-post!': (serverBus, state, newState, file) => serverBus.next(['import-file-done', postFile(file)]),
    'import-file-done': (state, b, c) => {
        return state;
    },
    'update-file-post!': (serverBus, state, newState, fileName) => serverBus.next(['update-file-done', updateFile(fileName)]),
    'update-file-done': (state, b, c) => assocIn(state, ['status'], 'File successfully saved!'),
    'set-status': (state, status, x) => assocIn(state, ['status'], status),
    'wizard-page': (state, newPage) => assocIn(state, ['wizardPage'], newPage),
    'file-content': (state, content) => assocIn(state, ['fileContent'], content)
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