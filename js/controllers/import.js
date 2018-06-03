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

const update = (file) => {
    const payload = {
        url: `${servers.localHub}/update/`,
        body: file,
        responseType: 'text',
        method: 'POST',
        crossDomain: true
    }

    return Rx.Observable.ajax(payload).map(r => r.status);
}

var importControls = {
    'import-file-post!': (serverBus, state, newState, file) => serverBus.next(['import-file-done', postFile(file)]),
    'import-file-done': (state, b, c) => {
        return state;
    },
    'update-file-post!': (serverBus, state, newState, file) => serverBus.next(['update-file-done', update(file)]),
    'update-file-done': (state, b, c) => {
        return state;
    },
    'set-status': (state, status, x) => assocIn(state, ['status'], status),
}

export default mount(make(importControls), ['import']);