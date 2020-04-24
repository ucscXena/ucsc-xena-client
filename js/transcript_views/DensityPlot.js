
var React = require('react');
var _ = require('../underscore_ext');
var styles = require('./DensityPlot.module.css');
var sc = require('science');

const plotHeight = 35;
const plotWidth = 200;
const zoomFactor = 3;
const topColor = "#BAA0CF";
const bottomColor = "#79C6C5";

function calculateHeights(data, max, min, plotWidth) {
	let pxWidth = (max - min) / plotWidth;
	let aHeights = data.studyA.map(exp =>
			exp.expA.length ?
			sc.stats.kde().sample(exp.expA)(_.range(min, max + pxWidth, pxWidth)).map(kdep => kdep[1]) :
			[]);
	let bHeights = data.studyB.map(exp =>
			exp.expB.length ?
			sc.stats.kde().sample(exp.expB)(_.range(min, max + pxWidth, pxWidth)).map(kdep => kdep[1]) :
			[]);

	return {
		aHeights: aHeights,
		bHeights: bHeights
	};
 }

function densitySvg(yHeights, height, totalWidth, vscale, A) {
	let binWidth = plotWidth / yHeights.length,
		polylinePoints = [`20,${height}`, ...yHeights.map((y, i) => `${i * binWidth + 20},${(1 - y / vscale) * height}`), `${plotWidth + 20},${height}`].join(' ');
	return (
		<svg width={totalWidth} height={height}>
			<polyline points={polylinePoints} fill={A ? topColor : bottomColor}/>
		</svg>);
}

var drawDensityPlot = (min, max, totalWidth, getNameZoom) => (aHeight, bHeight, nameAndZoom) => {
	let height = nameAndZoom.zoom ? plotHeight * zoomFactor : plotHeight,
		rowClass = nameAndZoom.zoom ? "densityPlot--row--zoom" : "densityPlot--row",
		vscale = Math.max(...aHeight.filter(x => !isNaN(x)), ...bHeight.filter(x => !isNaN(x)));

	return (
		<div key={nameAndZoom.name} className={styles[rowClass]} style={{width: `${totalWidth}px`}} onClick={() => getNameZoom(nameAndZoom.name)}>
			<div className={styles["densityPlot--scale--Axis"]} style={{height: 2 * height - 2, left: "18px"}}/>
			<div className={styles["densityPlot--row--xAxis"]} style={{width: `${plotWidth * 100 / totalWidth}%`, left: "20px"}}/>

			{isFinite(vscale) ? <div className={styles["densityPlot--vscal--label"]} style={{left: "15px"}}>
				{vscale.toFixed(2)}</div> : null}
			{isFinite(vscale) ? <div className={styles["densityPlot--vscal--tick"]}
				style={{left: "15px", top: '1px'}}/> : null}
			{isFinite(vscale) ? <div className={styles["densityPlot--vscal--tick"]}
				style={{left: "15px", top: `${2 * height - 2}px`}}/> : null}

			<div className={styles["densityPlot--row--studyA"]} style={{width: totalWidth}}>
				{densitySvg(aHeight, height, totalWidth, vscale, true)}
			</div>

			<div className={styles["densityPlot--row--studyB"]} style={{width: totalWidth}}>
				{densitySvg(bHeight, height, totalWidth, vscale, false)}
			</div>
		</div>);
};

class DensityPlot extends React.PureComponent {
	render() {
		let {getNameZoom, min, max} = this.props,
			totalWidth = plotWidth + 20,
			data = this.props.data ? this.props.data : null,
			{aHeights, bHeights} = calculateHeights(data, max, min, plotWidth),
			drawPlot = drawDensityPlot(min, max, totalWidth, getNameZoom),
			rows = _.mmap(aHeights, bHeights, data.nameAndZoom, drawPlot);

		return (
			<div className={styles.densityPlot}>
				{rows}
			</div>);
 	}
}

module.exports = {DensityPlot, bottomColor, topColor, plotWidth};
