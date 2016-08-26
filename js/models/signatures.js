/*global require: false, module: false */
'use strict';

var _ = require('../underscore_ext');
var fieldFetch = require('../fieldFetch');
var Rx = require('rx');

// dispatch on variant type (data, not genetic, variant)
var m = (methods, exp, defaultMethod) => {
	let [type, ...args] = exp,
		method = methods[type];
	return method ? method(...args) : defaultMethod(exp);
};

function evalIn({samples}, list) {
	var set = _.object(list, list);
	return {
		req: {
			values: [_.map(samples, s => _.has(set, s) ? 1 : 0)]
		},
		codes: ['false', 'true']
	};
}

function samplesAsData({samples}) {
	return {
		req: {
			values: [_.range(samples.length)]
		},
		codes: samples
	};
}

function evalexp(ctx, expression) {
	return m({
		'in': list => evalIn(ctx, list),
		'samples': () => samplesAsData(ctx)
	}, expression);
}

function fetchSignature(column, [samples]) {
	return Rx.Observable.return(evalexp({samples}, column.signature),
			Rx.Scheduler.timeout);
}

fieldFetch.add('signature', fetchSignature);
