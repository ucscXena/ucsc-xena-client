'use strict';

var _ = require('../underscore_ext');
var fieldFetch = require('../fieldFetch');
var Rx = require('../rx');
var {datasetProbeSignature, nanstr} = require('../xenaQuery');

var immediate = x => Rx.Observable.of(x, Rx.Scheduler.asap);

// dispatch on variant type (data, not genetic, variant)
var m = (methods, exp, defaultMethod) => {
	let [type, ...args] = exp,
		method = methods[type];
	return method ? method(...args) : defaultMethod(exp);
};

// We have some expression in form
// [type, ...exps]
// To be recursive while supporting async, it needs CPS transform.
// So, an expression like
// ['add', ['signature', ds0, ...genes], ['signature', ds1, ...genes]]
// needs to look like
// Rx.zip(fetch(ds0, genes), fetch(ds1, genes)).map(add)
// This would allow signatures across different hubs or datasets,
// for example.

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

var sigResult = dataValues => {
	var values = _.map(dataValues, nanstr),
		mean = _.meannull(values);

	return {
		req: {
			values: [values],
			mean: [mean]
		}
	};
};

function evalexp(ctx, expression) {
	return m({
		'in': list => immediate(evalIn(ctx, list)),
		'samples': () => immediate(samplesAsData(ctx)),
		'geneSignature': (dsID, probes, weights) =>
			datasetProbeSignature(dsID, ctx.samples, probes, weights)
				.map(sigResult)
	}, expression);
}

function fetchSignature(column, samples) {
	return evalexp({samples}, column.signature);
}

fieldFetch.add('signature', fetchSignature);
