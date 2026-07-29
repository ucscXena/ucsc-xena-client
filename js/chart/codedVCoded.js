import * as _ from '../underscore_ext.js';

// Compute count and percentage matrices for categorical x categorical dot plot.
// observed[yIdx][xIdx], so we transpose to get countMatrix[xIdx][yIdx].
// shareOf 'column' normalizes by xMargin (each xIdx sums to 1);
// 'row' normalizes by yMargin (each yIdx sums to 1); 'total' by the grand total.
// x is rendered on the horizontal axis and y on the vertical axis
// (highchartView.js#codedVCodedDotplot), matching the visual meaning of
// 'column'/'row' here -- see chartControls.js#shareOfOptions.
function getCodedMatrices({observed, xMargin, shareOf}) {
	var countMatrix = observed.length
		? observed[0].map((_, xIdx) => observed.map(row => row[xIdx]))
		: [];
	var pctMatrix;
	if (shareOf === 'total') {
		var total = _.sum(xMargin);
		pctMatrix = countMatrix.map(row =>
			row.map(count => total ? count / total : NaN));
	} else if (shareOf === 'row') {
		var yMargin = observed.map(row => _.sum(row));
		pctMatrix = countMatrix.map(row =>
			row.map((count, yIdx) => yMargin[yIdx] ? count / yMargin[yIdx] : NaN));
	} else {
		pctMatrix = countMatrix.map((row, xIdx) =>
			row.map(count => xMargin[xIdx] ? count / xMargin[xIdx] : NaN));
	}
	return {countMatrix, pctMatrix};
}

export { getCodedMatrices };
