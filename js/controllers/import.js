/* eslint-disable */ 
'use strict';
import Rx from '../rx';
import { make, mount, compose } from './utils';
import { servers } from '../defaultServers';


const postFile = (file) => {
    const payload = {
        //headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        url: `${servers.localHub}/upload/`,
        body: file,
        method: 'POST',
        crossDomain: true
    }

    return Rx.Observable.ajax(payload).map(r => console.log(r));
}

var importControls = {
    'import-file-post!': (serverBus, state, newState, file) => serverBus.next(['import-file', postFile(file)]),
    'import-file': (a, b, c) => {
        console.log(a);
    }
}

export default mount(make(importControls), ['import']);