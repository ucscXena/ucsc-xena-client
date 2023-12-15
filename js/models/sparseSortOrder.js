// Utility to sort sparse data & generate a dense representation of
// the order.

var {Let, range} = require('../underscore_ext').default;

var newArr = n => new Float32Array(n);
// mutating array 'set' that returns the array
var set = (arr, i, v) => (arr[i] = v, arr);

var assignOrder = (data, order, cmpfn, i = 0, n = order.length,
		acc = newArr(order.length)) =>
	i === order.length ? acc :
	data[order[i]] == null ?
		assignOrder(data, order, cmpfn, i + 1, n, set(acc, order[i], NaN)) :
	cmpfn(order[i], order[i - 1]) ?
		assignOrder(data, order, cmpfn, i + 1, n - 1, set(acc, order[i], n - 1)) :
	assignOrder(data, order, cmpfn, i + 1, n, set(acc, order[i], n));

export default cmp => (column, data, index, sampleCount) =>
	index && Let((cmpfn = cmp(column, data, index),
			order = range(sampleCount).sort(cmpfn)) =>
		({req: {values: [assignOrder(index.bySample, order, cmpfn)]}}));
