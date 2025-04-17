var dataUtils = require('./dataUtils');
var highchartsHelper = require('./highcharts_helper');
var sCell = require('./singleCell');
var {isSet} = require('../models/bitmap');
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
	var [meanMatrix, stdMatrix, nNumberMatrix, expressionMatrix, totalMatrix] =
			constantly(() =>
				_.times(groups.length, () => new Array(ydata.length).fill(NaN))),
		boxes = _.times(groups.length, () => new Array(ydata.length));

	var isSingleCell = yexpression === 'singleCell';

	// Y data and fill in the matrix
	ydata.forEach((ydataElement, k) => {
		// Bulk mode: compute the binned values from groups.
		let expressedGroupsOrGroups = groups;

		// Single cell mode (dot plot only): filter non-expressed indices from groups, then compute the binned values.
		if (isSingleCell) {
			var bitmap = ynonexpressed[k];
			expressedGroupsOrGroups = _.map(groups, group => _.filter(group, i => !isSet(bitmap, i)));
		}

		// look up y from indicies & drop where y is NaN
		var ybinnedSample = dataUtils.groupValues(ydataElement, expressedGroupsOrGroups);

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
					let nonExpressedCount = groups[i].length - expressedGroupsOrGroups[i].length,
						totalCount = m + nonExpressedCount;
					totalMatrix[i][k] = totalCount;
					expressionMatrix[i][k] = sCell.computeAvgExpr(data);
				}
			}
		});
	});
	return {totalMatrix, expressionMatrix, meanMatrix, boxes, stdMatrix, nNumberMatrix};
}

module.exports = {
	getMatrices
};
