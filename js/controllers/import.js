/* eslint-disable */ 
'use strict';
import Rx from '../rx';
import { make, mount, compose } from './utils';
import { encodeObject } from '../util';
import { isArray, merge } from "../underscore_ext";
import { servers } from '../defaultServers';


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

var importControls = {
    'import-file-post!': (serverBus, state, newState, file) => serverBus.next(['import-file-done', postFile(file)]),
    'import-file-done': (a, b, c) => {
        console.log(b);
    }
}

export default mount(make(importControls), ['import']);