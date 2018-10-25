'use strict';


import {agnes, treeOrder} from '../agnes';
import {jStat} from 'jStat';
import {getIn, meannull} from '../underscore_ext.js';
import Rx from '../rx';

var {fromEvent} = Rx.Observable;

var pearson = (a, b) => {
	return isNaN(a[0]) || isNaN(b[0]) ? Infinity :
		1 - jStat.corrcoeff(a, b);
};

var fillNulls = data =>
	data.map(row => {
		var mean = meannull(row),
			replValue = mean == null ? NaN : mean; // handle null column
		return row.map(v => v == null ? replValue : v);
	});

var cmds = {
	cluster: data => {
		// check for empty or null values
		var values = fillNulls(getIn(data, ['req', 'values'], []));
		if (!values.length) {
			return [];
		}
		var c = agnes(values, pearson);
		return treeOrder(c);
	}
};

// currently only have one method to dispatch, so this is a bit of overkill,
// but whatever.
function dispatch(ev) {
	var {msg, id} = ev,
		[tag, ...args] = msg;
	try {
		return {id, msg: cmds[tag](...args)};
	} catch(err) {
		return {id, msg: {workerError: err.message}};
	}
}

var recvQ = fromEvent(self, 'message').map(({data}) => data);

recvQ.map(dispatch)
	.subscribe(ev => postMessage(ev));
