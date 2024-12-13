var _ = require('../underscore_ext').default;
var fieldFetch = require('../fieldFetch');
var Rx = require('../rx').default;
var {datasetProbeSignature, datasetGeneSignature} = require('../xenaQuery');
import {isSet, listToBitmap, setBit} from './bitmap';
import {toArrays} from './denseMatrix';

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

function membershipSum(n, lists) {
	var ret = new Float32Array(n);
	for (var i = 0; i < n; ++i) {
		ret[i] = lists.reduce((acc, list, j) => acc += isSet(list, i) ? 1 << j : 0, 0);
	};

	return ret;
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

// Given sample list b and bitmaps over b, compute equivalent bitmaps over sample
// list a.
function matchSamples(a, b, bmaps) {
	var amaps = bmaps.map(() => listToBitmap(a.length, []));
	for (var ai = 0, bi = 0; ai < a.length && bi < b.length;) {
		if (a[ai] === b[bi]) {
			amaps.forEach((amap, i) => {
				if (isSet(bmaps[i], bi)) {
					setBit(amap, ai);
				}
			});
			++ai; ++bi;
		} else if (a[ai] < b[bi]) {
			++ai;
		} else {
			++bi;
		}
	}

	return amaps;
}

function evalCross({samples}, matches, exprs, filterSamples) {
	var nMatches = matchSamples(samples, filterSamples, matches);

	return {
		req: {
			values: [membershipSum(samples.length, nMatches)]
		},
		codes: booleanCross(exprs)
	};
}

function samplesAsData({samples}) {
	return {
		req: {
			values: [Float32Array.from(_.range(samples.length))]
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
		'cross': (...args) => immediate(evalCross(ctx, ...args)),
		'samples': () => immediate(samplesAsData(ctx)),
		'geneSignature': (dsID, probes, weights) =>
			sigFetch[ctx.column.fieldType](dsID, ctx.samples, probes, weights)
	}, expression);
}

function fetchSignature(column, samples) {
	return evalexp({samples, column}, column.signature);
}

fieldFetch.add('signature', fetchSignature);
