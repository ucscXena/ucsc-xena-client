'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var styles = require('./DensityPlot.module.css');
var sc = require('science');

const bin = 20; //number of bins
const plotHeight = 35;
const plotWidth = 200;
const zoomFactor = 3;
const topColor = "#BAA0CF";
const bottomColor = "#79C6C5";

function calculateHeight(exp, max, min, plotHt, plotWidth, unit) {
	let minValue = unit === "tpm" ? Math.log2(0.001) : min;
	let pxWidth = (max - minValue) / plotWidth;
	let newExp = exp.filter(e => e > minValue);
	let percentNonZero = newExp.length / exp.length;
	let kdePoints = newExp.length ? sc.stats.kde().sample(newExp)(_.range(minValue, max + pxWidth, pxWidth)) : [];
	let yHeights = kdePoints.map(kdep => kdep[1] * percentNonZero);
	//  let binWidth = plotWidth / yHeights.length;
	let zPxWidth = 5; // draw zero at 5 px width
	let zeroWidth = pxWidth * zPxWidth;
	let zeroHeight = (1 - percentNonZero) / zeroWidth;
  //    let vscale = Math.max(zeroHeight, ...yHeights);
  //    //polyline points here
  //    let polylinePoints = [`0,${plotHt}`, ...yHeights.map((y, i) => `${i * binWidth},${(1 - y / vscale) * plotHt}`), `${plotWidth},${plotHt}`].join(' ');
  //
  // //   For debugging the scaling. The 'sum' should be 1: area under the curve
  // //   of a density plot should always be 1. We take the values from kde and scale
  // //   them by percentNonZero, then compute zeroHeight to perserve the correct area.
  // //
  // //   We then scale the y axis by the max y value, to ensure that the data is
  // //   not clipped (for a sharp spike), or drawn too small to see (for a uniform
  // //   distribution).
  // //
  // //   pxSum and zPxSum compute the pixel area for zero and non-zero points. They
  // //   should have the same ratio as zeroSum and nonZeroSum if we've scaled correctly.
  // //
  // //   var zeroSum = zeroWidth * zeroHeight;
  // //   var nonZeroSum = _.sum(kdePoints.map(([, y]) => y * pxWidth)) * percentNonZero;
  // //   var pxSum = _.sum(yHeights.map(y => y * plotHt * binWidth));
  // //   var zPxSum = zPxWidth * zeroHeight * plotHt;
  // //   console.log('sum', nonZeroSum + zeroSum, JSON.stringify({nonZeroSum, zeroSum}));
  // //   console.log(JSON.stringify({nz: pxSum / (pxSum + zPxSum), z: zPxSum / (pxSum + zPxSum)}));
  //    return {
  //      polylinePoints: polylinePoints,
  //      zeroWidth: zPxWidth,
  //      zeroHeight: zeroHeight / vscale * plotHt
  //    };
	return {
		yHeights,
		zeroWidth: zPxWidth,
		zeroHeight
	};
 }

function calculateFrequency(exp, max, min) {
	var stepSize = (max - min) / bin,
		freq = _.times(bin, _.constant(0));

	// We could do this immutably with reduce/assoc, but it would cause
	// many array copies. Could also do groupBy/count, but it seems excessive.
	exp.forEach(value => {
		freq[Math.floor((value - min) / stepSize)]++;
	});
	freq.forEach(( value, index) => {
		freq[index] = freq[index] / exp.length; //eslint-disable-line local/no-property-assignments
	});
	return freq;
}

function densitySvg(heights, height, totalWidth, vscale, A) {
	let {yHeights, zeroWidth, zeroHeight} = heights,
		binWidth = plotWidth / yHeights.length,
		polylinePoints = [`20,${height}`, ...yHeights.map((y, i) => `${i * binWidth + 20},${(1 - y / vscale) * height}`), `${plotWidth + 20},${height}`].join(' '),
		scaledZeroHeight = zeroHeight / vscale * height;
	return (
		<svg width={totalWidth} height={height}>
			<rect x="0" y={height - scaledZeroHeight} width={zeroWidth} height={scaledZeroHeight} fill={A ? topColor : bottomColor}/>
			<polyline points={polylinePoints} fill={A ? topColor : bottomColor}/>
		</svg>);
}

var drawDensityPlot = (min, max, totalWidth, unit, getNameZoom) => (studyA, studyB, nameAndZoom) => {
	let height = nameAndZoom.zoom ? plotHeight * zoomFactor : plotHeight,
		rowClass = nameAndZoom.zoom ? "densityPlot--row--zoom" : "densityPlot--row",
		aHeight = calculateHeight(studyA.expA, max, min, height, plotWidth, unit),
		bHeight = calculateHeight(studyB.expB, max, min, height, plotWidth, unit),
		vscale = Math.max(aHeight.zeroHeight, bHeight.zeroHeight, ...aHeight.yHeights, ...bHeight.yHeights);
	return (
		<div key={nameAndZoom.name} className={styles[rowClass]} style={{width: `${totalWidth}px`}} onClick={() => getNameZoom(nameAndZoom.name)}>
			<div className={styles["densityPlot--row--xAxis"]} style={{width: `${plotWidth * 100 / totalWidth}%`, left: "20px"}}/>

			<div className={styles["densityPlot--row--studyA"]} style={{width: totalWidth}}>
				{densitySvg(aHeight, height, totalWidth, vscale, true)}
			</div>

			<div className={styles["densityPlot--row--studyB"]} style={{width: totalWidth}}>
				{densitySvg(bHeight, height, totalWidth, vscale, false)}
			</div>
		</div>);
};

var histogramRowBin = backgroundColor => freq => (
	<div className={styles["densityPlot--row--bin"]}
		style={{
			height: (freq * 100) + "%",
			width: (1 / bin * 100) + "%",
			backgroundColor}}/>);

var drawHistogram = (min, max) => (studyA, studyB) => {
	let freqA = calculateFrequency(studyA.expA, max, min),
		freqB = calculateFrequency(studyB.expB, max, min);
	return (
		<div className={styles["densityPlot--row"]}>
			<div className={styles["densityPlot--row--xAxis"]}/>

			<div className={styles["densityPlot--row--studyA"]}>
				{freqA.map(histogramRowBin(topColor))}
			</div>

			<div className={styles["densityPlot--row--studyB"]}>
				{freqB.map(histogramRowBin(bottomColor))}
			</div>
		</div>);
};

class DensityPlot extends React.PureComponent {
	render() {
		let {unit, getNameZoom, type} = this.props,
			totalWidth = plotWidth + 20,
			data = this.props.data ? this.props.data : null,
			max = _.max(_.flatten(_.pluck(data.studyA, "expA").concat(_.pluck(data.studyB, "expB")))),
			min = _.min(_.flatten(_.pluck(data.studyA, "expA").concat(_.pluck(data.studyB, "expB")))),
			drawPlot = (type === 'density' ? drawDensityPlot : drawHistogram)(min, max, totalWidth, unit, getNameZoom),
			rows = _.mmap(data.studyA, data.studyB, data.nameAndZoom, drawPlot);
		return (
			<div className={styles.densityPlot}>
				{rows}
			</div>);
 	}
}

module.exports = {DensityPlot, bottomColor, topColor, plotWidth};
