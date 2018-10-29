'use strict';

import {range, times} from './underscore_ext';

/*
 * Store lower triangle as a flat array.
 * Have to compute (i, j) coords to a single coord.
 *
 * x x x x
 * 0 x x x
 * 1 2 x x
 * 3 4 5 x
 */
/*
[1, 0] -> 0 = 0 + 0
[2, 0] -> 1 = 1 + 0
[2, 1] -> 2 = 1 + 1
[3, 0] -> 3 = (2 + 1) + 0
[3, 1] -> 4 = (2 + 1) + 1
[3, 2] -> 5 = (2 + 1) + 2

At each coord i, we do the sum i  + i  - 1 + ... = (i * (i - 1)) / 2
Then add j
*/

var toCoord = (i, j) => i * (i - 1) / 2 + j;

function invCoord(d) {
	// solving d = i * (i - 1) / 2, for i
	// This looks expensive, but doesn't show up in the profiles.
	var i = Math.floor((1 + Math.sqrt(1 + 8 * d)) / 2),
		offset = i * (i - 1) / 2;
	return {i, j: d - offset};
}

/* Should test storing the lower triangle as nested arrays, instead.
 * Would be less math, but slightly more memory. Would still have to
 * do the inverse coord computation when sorting, so not much less math.
 * [[x], [x x], [x x x], ...]
 */
export function differenceMatrix(data, diff) {
	var len = data.length,
		dlen = (len * (len - 1)) / 2,
		d = new Array(dlen),
		I = diff(data[0], data[0]); // compute single value for identity.

	/* compute lower triangle */
	for (var i = 1; i < len; ++i) {
		for (var j = 0; j < i; ++j) {
			d[toCoord(i, j)] = diff(data[i], data[j]);
		}
	}
	return [I, d];
}

export var lookUpDiff = ([I, d]) => (i, j) =>
	i > j ? d[toCoord(i, j)] :
	i < j ? d[toCoord(j, i)] :
	I;

function setP(nodes, p) {
	if (nodes.length === 0) {
		return;
	}
	var n = nodes.shift();
	n.p = p;
	if (n.left) {
		nodes.push(n.left);
		nodes.push(n.right);
	}
	return setP(nodes, p);
}

// agnes method with simple linkage. Since simple linkage is the global minimum
// difference between any two points, we compute the distance matrix, sort it,
// and walk it in order to build clusters. I suspect this is n^2 log n, but not
// positive, as I haven't thought about the setP step, which updates a subtree
// with new cluster identity after a merge. Difference matrix is n^2. Sort
// is n^2 log n^2 = n^2 2 log n -> n^2 log n.
//
// Do we actually need to hold the full tree, just to extract the order?
// Maybe we can reduce the memory requirements?
function join(d, leaves, order, tree, n = leaves.length - 1, oi = 0) {
	var k = order[oi],
		{i, j} = invCoord(k),
		li = leaves[i],
		lj = leaves[j];
		if (li.p !== lj.p || li.p === undefined) { // not already in same cluster
			// place cluster according to dendsort MOLO rules, Sakai, et al
			tree =
				li.p ?
					(lj.p ?
						// two clusters; put tightest on left
						(li.p.d < lj.p.d ?
							{left: li.p, right: lj.p, d: li.p.d + d[k]} :
							{left: lj.p, right: li.p, d: lj.p.d + d[k]}) :
						// cluster in i; put it on left
						{left: li.p, right: lj, d: li.p.d + d[k]}) :
					lj.p ?
						// cluster in j, put it on left
						{left: lj.p, right: li, d: lj.p.d + d[k]} :
						// two leaves; put lower index (j) on left(?)
						{left: lj, right: li, d: d[k]};

			setP([tree.left, tree.right], tree);

			return n > 1 ? join(d, leaves, order, tree, n - 1, oi + 1) :
				tree;
		}
		return join(d, leaves, order, tree, n, oi + 1);
}

export function agnes(data, diff) {
	var [, d] = differenceMatrix(data, diff),
		order = range(d.length).sort((i, j) => d[i] - d[j]),
		leaves = times(data.length, i => ({i, p: undefined}));

	return join(d, leaves, order);
}

function treeOrderN(nodes, acc = []) {
	if (!nodes.length) {
		return acc;
	}
	var n = nodes.pop();
	if (!n.left) {
		acc.push(n.i);
	} else {
		nodes.push(n.right);
		nodes.push(n.left);
	}
	return treeOrderN(nodes, acc);
}

export var treeOrder = tree => treeOrderN([tree]);
