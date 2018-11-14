'use strict';

import 'babel-polyfill';
import {agnes, treeOrder} from '../agnes';
import {jStat} from 'jStat';
import {getIn} from '../underscore_ext.js';
import Rx from '../rx';

var {fromEvent} = Rx.Observable;

var pearson = (a, b) => 1 - jStat.corrcoeff(a, b);

var fillNulls = (data, mean) =>
	data.map((row, i) => row.map(v => v == null ? mean(i) : v));

// filter and create map of old index to new index, plus list of
// elided indices.
var filterWithMap = (list, pred) => {
	var out = [],
		map = [],
		omitted = [];
	list.forEach((v, i) => {
		if (pred(v, i)) {
			out.push(v);
			map.push(i);
		} else {
			omitted.push(i);
		}
	});
	return [out, map, omitted];
};

var cmds = {
	cluster: data => {
		var mean = getIn(data, ['req', 'mean'], []),
			all = getIn(data, ['req', 'values'], []),
			// null columns will have null mean. Filter them out before
			// trying to cluster. Tack them on the end, later.
			[cols, mapping, omit] = filterWithMap(all, (_, i) => mean[i] != null),
			values = fillNulls(cols, i => mean[mapping[i]]);

		if (!values.length) {
			return omit;
		}
		var c = agnes(values, pearson);
		return treeOrder(c).map(i => mapping[i]).concat(omit);
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
