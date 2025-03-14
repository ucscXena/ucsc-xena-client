var dataUtils = require('./dataUtils');
var highchartsHelper = require('./highcharts_helper');
var sCell = require('./singleCell');
var _ = require('../underscore_ext').default;

var BOXLEN = 5;

var nobox = new Array(BOXLEN).fill(NaN);

function boxplotPoint(data) {
	var m = data.length;
	data.sort((a, b) => a - b);

	// http://onlinestatbook.com/2/graphing_distributions/boxplots.html
	var median = data[Math.floor( m / 2)],
		lower =  data[Math.floor( m / 4)],
		upper =  data[Math.floor( 3 * m / 4)],
		whisker = 1.5 * (upper - lower),
		upperwhisker = data[
		_.findIndexDefault(data, x => x > upper + whisker, data.length) - 1],
		lowerwhisker = data[
		_.findLastIndexDefault(data, x => x < lower - whisker, -1) + 1];

	// This must match BOX order
	return [lowerwhisker, lower, median, upper, upperwhisker];
}

// poor man's lazy seq
function* constantly (fn) {
	while (true) {
		yield fn();
	}
}

function getMatrices({ydata, groups, yexpression, ynonexpressed}) {
	// matrices, row is x and column is y:
	// mean
	// median
	// upper --  75 percentile
	// lower --  25 percentile
	// upperwhisker --  upperwhisker percentile
	// lowerwhisker --  lowerwhisker percentile
	// std
	// nNumber -- number of data points (real data points) for dataMatrix

	// init average matrix std matrix // row is x by column y
	var [meanMatrix, stdMatrix, nNumberMatrix, expressionMatrix, detectionMatrix] =
			constantly(() =>
				_.times(groups.length, () => new Array(ydata.length).fill(NaN))),
		boxes = _.times(groups.length, () => new Array(ydata.length));

	var isSingleCell = yexpression === 'singleCell';

	// Y data and fill in the matrix
	ydata.forEach((ydataElement, k) => {
		// Single cell mode (dot plot only):
		// Retrieve non-expressed indices for the ydata element, and filter those indices from groups, then compute the binned values.
		// Track how many non-expressed samples were removed from each group.
		// Bulk mode:
		// Just compute the binned values.
		let nonExpressedSet = ynonexpressed ? ynonexpressed[k] : null,
			nonExpressedCountByGroup = new Map(),
			expressedGroupsOrGroups = isSingleCell ? _.map(groups, (group, g) => {
				nonExpressedCountByGroup.set(g, 0);
				return _.filter(group, i => {
					if (nonExpressedSet.has(i)) {
						nonExpressedCountByGroup.set(g, nonExpressedCountByGroup.get(g) + 1);
						return false;
					}
					return true;
				});
			}) : groups,
			ybinnedSample = dataUtils.groupValues(ydataElement, expressedGroupsOrGroups);

		// Note that xCategories has already been null filtered on x, so it's not
		// the same as xcodemap.
		ybinnedSample.forEach((data, i) => {
			let m = data.length;
			nNumberMatrix[i][k] = m;
			boxes[i][k] = m ? boxplotPoint(data) : nobox;
			if (m) {
				let average =  highchartsHelper.average(data);
				meanMatrix[i][k] = average;
				stdMatrix[i][k] = highchartsHelper.standardDeviation(data, average);
				if (isSingleCell) {
					let nonExpressedCount = nonExpressedCountByGroup.get(i) || 0,
						totalCount = m + nonExpressedCount;
					detectionMatrix[i][k] = sCell.computePctExpr(m, totalCount);
					expressionMatrix[i][k] = sCell.computeAvgExpr(data);
				}
			}
		});
	});
	return {detectionMatrix, expressionMatrix, meanMatrix, boxes, stdMatrix, nNumberMatrix};
}

module.exports = {
	getMatrices
};
