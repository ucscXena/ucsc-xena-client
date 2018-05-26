/* eslint-disable */ 
'use strict';
import Rx from '../rx';
import { make, mount, compose } from './utils';
import { localHub } from '../defaultServers';

const postFile = (file) => {
    return Rx.Observable.ajax.post(`${localHub}/upload`, file).map(r => console.log(r));
}

var importControls = {
    'import-file-post!': (serverBus, state, newState, data) => {
        console.log('success');
    }
}

module.exports = compose(mount(make(importControls), ['import']));