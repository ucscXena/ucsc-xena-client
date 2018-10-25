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
	var set = _.object(list, list); // XXX use Set?
	return {
		req: {
			values: [_.map(samples, s => _.has(set, s) ? 1 : 0)]
		},
		codes: ['false', 'true']
	};
}

// cross product of boolean terms, as text, e.g. for 2 terms,
// !a !b, a !b, !a b, a b
function booleanCross(terms, i = 0, acc = []) {
	return i === terms.length ? acc :
		booleanCross(terms, i + 1,
			acc.length === 0 ? ['false', 'true'] :
				acc.map(t => `${t};false`).concat(
					acc.map(t => `${t};true`)));
}

function evalCross({samples}, lists, exprs) {
	var sets = lists.map(l => new Set(l)),
		bits = _.times(lists.length, i => 1 << i); // 1, 2

	console.log(bits);
	return {
		req: {
			values: [_.map(samples, s => _.sum(bits.filter((v, i) => sets[i].has(s))))]
		},
		codes: booleanCross(exprs)
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
		'cross': (lists, exprs) => immediate(evalCross(ctx, lists, exprs)),
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
