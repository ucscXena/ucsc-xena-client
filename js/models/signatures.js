
var _ = require('../underscore_ext').default;
var fieldFetch = require('../fieldFetch');
var Rx = require('../rx').default;
var {datasetProbeSignature, datasetGeneSignature} = require('../xenaQuery');

var immediate = x => Rx.Observable.of(x, Rx.Scheduler.asap);
import {toArrays} from './denseMatrix';

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

function samplesAsData({samples}) {
	return {
		req: {
			values: [_.range(samples.length)]
		},
		codes: samples
	};
}

var sigProbeResult = dataValues => {
	return {
		req: toArrays([dataValues])
	};
};

var sigGeneResult = ({scores}) => sigProbeResult(scores);

var sigFetch = {
	probes: (...args) => datasetProbeSignature(...args).map(sigProbeResult),
	genes: (...args) => datasetGeneSignature(...args).map(sigGeneResult)
};

function evalexp(ctx, expression) {
	return m({
		'in': list => immediate(evalIn(ctx, list)),
		'data': data => immediate(data),
		'samples': () => immediate(samplesAsData(ctx)),
		'geneSignature': (dsID, probes, weights) =>
			sigFetch[ctx.column.fieldType](dsID, ctx.samples, probes, weights)
	}, expression);
}

function fetchSignature(column, samples) {
	return evalexp({samples, column}, column.signature);
}

fieldFetch.add('signature', fetchSignature);
