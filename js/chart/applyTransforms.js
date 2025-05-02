import * as _ from '../underscore_ext.js';
import { fastats } from '../xenaWasm.js';
import {v} from './utils.js';

var expMethods = {
	exp2: data => _.map(data, d => _.map(d, x => isNaN(x) ? x : Math.pow(2, x))),
	log2: data => _.map(data, d => _.map(d, x => isNaN(x) ? x : Math.log2(x + 1))),
	none: _.identity
};

var applyExp = (data, setting) =>
	expMethods[_.get(setting, 'value', 'none')](data);

var passAsArray = fn => (v, ...args) => fn([v], ...args)[0];

// transform data, compute stats
export default function applyTransforms(ydata, yexp, ynorm, xdata, xexp) {
	ydata = applyExp(ydata, yexp);
	xdata = xdata && applyExp(xdata, xexp);
	var yavg = fastats(ydata);

	var transform = ynorm === 'subset_stdev' ?
		(data, std, mean) => data.map(x => isNaN(x) ? x : (x - mean) / std) :
		(data, std, mean) => data.map(x => isNaN(x) ? x : x - mean);
	var statTransform = passAsArray(transform);

	if (v(ynorm)) {
		ydata = _.mmap(ydata, yavg.sd, yavg.mean, transform);
		yavg = _.mapObject(yavg, vs => _.mmap(vs, yavg.sd, yavg.mean, statTransform));
	}

	return {ydata, xdata, yavg};
}
