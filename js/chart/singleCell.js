var {mapToBitmap} = require('../models/bitmap');
var _ = require('../underscore_ext').default;

/**
 * Methods for computing non-expressed indices.
 * "bulk" mode returns null.
 * "singleCell" mode returns, for each data array, a bitmap where bits are set for indices where the value is ≤ 0.
 */
var expressionMethods = {
	bulk: () => null,
	singleCell: data => _.map(data, d => mapToBitmap(_.range(d.length), i => d[i] <= 0)),
};

/**
 * Apply the appropriate expression method based on the given mode.
 * @param data - Array of numeric arrays (one per series).
 * @param expression - Either "bulk" or "singleCell".
 * @returns For each data array, a bitmap where bits are set for non-expressed indices.
 */
var applyExpression = (data, expression = 'bulk') => expressionMethods[expression](data);

/**
 * Compute the average expression from non-zero values.
 * @param expressedData - Array of expression values.
 * @returns The average expression, or 0 if the array is empty.
 */
function computeAvgExpr(expressedData) {
	if (expressedData.length === 0) {
		return 0;
	}
	return expressedData.reduce((sum, v) => sum + v, 0) / expressedData.length;
}

/**
 * Compute the percentage of expressed cells.
 * @param expressedCount - Count of cells with expression > 0.
 * @param totalCount - Total cell count (expressed + non-expressed).
 * @returns The fraction of cells that are expressed.
 */
function computePctExpr(expressedCount, totalCount) {
	if (totalCount === 0) {
		return 0;
	}
	return expressedCount / totalCount;
}

module.exports = {
	applyExpression,
	computeAvgExpr,
	computePctExpr,
};
