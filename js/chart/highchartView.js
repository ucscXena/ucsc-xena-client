import PureComponent from '../PureComponent';
var _ = require('../underscore_ext').default;
var Highcharts = require('highcharts/highstock');
require('highcharts/highcharts-more')(Highcharts);
var highchartsHelper =  require ('./highcharts_helper');
require('highcharts/modules/boost')(Highcharts);
require('highcharts/modules/heatmap')(Highcharts);
import {xenaColor} from '../xenaColor';
var jStat = require('../jStatShim');
import {isSet, bitCount} from '../models/bitmap';
import multi from '../multi';
import {div, el} from './react-hyper';
var compStyles = require('./highchartView.module.css');

import {kde} from '../models/kde';
var fvc = require('./fvc');
var {groupValues} = require('./dataUtils');
var defaultColor = xenaColor.BLUE_PRIMARY;

// Implement a custom 'legendRadius' to override the marker.radius
// in the legend.
Highcharts.wrap(Highcharts.Series.prototype, 'drawLegendSymbol',
	function (proceed, legend) {
		var lr = _.getIn(legend, ['chart', 'userOptions', 'plotOptions',
			'scatter', 'marker', 'legendRadius']);
		if (lr) {
			var r = this.options.marker.radius;
			this.options.marker.radius = lr;
			proceed.call(this, legend);
			this.options.marker.radius = r;
		} else {
			proceed.call(this, legend);
		}
	});


var newChart = (...args) =>
	new Highcharts.Chart(_.deepMerge(highchartsHelper.chartOptions, ...args));

function sizeChartView() {
	var chartViewEl = document.getElementById('chartView');
	if (!chartViewEl) {return;}
	var chartViewRect = chartViewEl.getBoundingClientRect();
	var height = window.innerHeight - window.scrollY - chartViewRect.top;
	chartViewEl.style.setProperty('height', `${height}px`);
}

// group field0 by code0, where field1 has value
function groupIndexWithValue(field0, field1) {
	var indicies = _.range(field0.length).filter(i => !isNaN(field1[i]));
	var groups = _.groupBy(indicies, i => field0[i]);
	delete groups.NaN;
	return groups;
}

// XXX We should really group by value, and covert values
// to codes late, but the current implementation uses
// codes early. See groupIndex.
function groupIndexByCode(field, codes) {
	var groups = _.groupBy(_.range(field.length), i => codes[field[i]]);
	delete groups[undefined];
	return groups;
}

function groupIndex(field) {
	var groups = _.groupBy(_.range(field.length), i => field[i]);
	delete groups.NaN;
	return groups;
}

// utility function to calculate p value from a given coefficient using "Testing using Student's t-distribution" method
// spearman rank https://en.wikipedia.org/wiki/Spearman's_rank_correlation_coefficient#Determining_significance
// pearson correlation https://en.wikipedia.org/wiki/Pearson_correlation_coefficient#Testing_using_Student's_t-distribution
function pValueFromCoefficient(coeff, length) {
	var tScore = coeff * (Math.sqrt(length - 2) / Math.sqrt(1 - (coeff * coeff)));
	var pValue;

	if (isFinite(tScore)) { // If the value of tScore is Finite, then the pValue is calculated from the t Test
		pValue = jStat.ttest(tScore, length - 2, 2); //p value from t value with n-2 dof and 2 tails
	} else { // If the value of tScore is Infinite, then pValue is 0
		pValue = 0;
	}
	return(pValue);
}

//scatter plot stats Pearson's rho/r, Spearman rank rho/ρ value
function printPearsonAndSpearmanRho(xlabel, yfields, xVector, ydata) {
	var ret = '';
	[...Array(yfields.length).keys()].forEach(i => {
		var ylabel = yfields[i],
			yVector = ydata[i],
			[xlist, ylist] = _.unzip(_.filter(_.zip(xVector, yVector), function (x) {return !isNaN(x[0]) && !isNaN(x[1]);})),
			rho = jStat.corrcoeff(xlist, ylist), // r Pearson's Rho correlation coefficient
			spearmanRho = jStat.spearmancoeff(xlist, ylist), // (spearman's) rank correlation coefficient, rho
			pValueRho = pValueFromCoefficient(rho, ylist.length), // P value from pearson's rho value and length of ylist
			pValueSpearmanRho = pValueFromCoefficient(spearmanRho, ylist.length); // P value from spearman rho value and length of ylist

		if (ret !== '') {
			ret += '\n'  + '\n';
		}
		ret +=
			xlabel + ' ~ ' + ylabel + '\n' +
			'Pearson\'s rho\n' +
			'r = ' + rho.toPrecision(4) + '  ' +
			'(p = ' + pValueRho.toPrecision(4) + ')' + '\n' +
			'Spearman\'s rank rho\n' +
			'rho = ' + spearmanRho.toPrecision(4) + '  ' +
			'(p = ' + pValueSpearmanRho.toPrecision(4) + ')' + '\n';
	});
	return ret;
}

// p value when there is only 2 group comparison student t-test
// https://en.wikipedia.org/wiki/Welch%27s_t-test
function welch({meanMatrix, stdMatrix, nNumberMatrix}, yfields) {
	var ret = 'Welch\'s t-test\n';
	_.range(yfields.length).map(k => {
		if (nNumberMatrix[0][k] > 1 && nNumberMatrix[1][k] > 1) {
			let yfield = yfields[k];
			// p value calculation using Welch's t-test
			let x1 = meanMatrix[0][k], // mean1
				x2 = meanMatrix[1][k], // mean2
				v1 = stdMatrix[0][k] * stdMatrix[0][k], //variance 1
				v2 = stdMatrix[1][k] * stdMatrix[1][k], //variance 2
				n1 = nNumberMatrix[0][k], // number 1
				n2 = nNumberMatrix[1][k], // number 2
				vCombined = v1 / n1 + v2 / n2, // pooled variance
				sCombined = Math.sqrt(vCombined), //pool sd
				tStatistics = (x1 - x2) / sCombined, // t statistics,
				dof = vCombined * vCombined / ((v1 / n1) * (v1 / n1) / (n1 - 1)
					+ (v2 / n2) * (v2 / n2) / (n2 - 1)), // degree of freedom
				cdf = jStat.studentt.cdf(tStatistics, dof),
				pValue = 2 * (cdf > 0.5 ? (1 - cdf) : cdf);

			ret += (
				(yfields.length > 1 ? ('\n' + yfield + '\n') : '') +
				'p = ' + pValue.toPrecision(4) + ' ' +
				'(t = ' + tStatistics.toPrecision(4) + ')\n'
			);
		}
	});
	return ret;
}

// p value for >2 groups one-way ANOVA
// https://en.wikipedia.org/wiki/One-way_analysis_of_variance
function anova({matrices: {nNumberMatrix, meanMatrix, stdMatrix},
		yfields, ydata, groups}) {
	var ret;
	ret = 'One-way Anova\n';
	_.range(yfields.length).map(k => {
		let yfield = yfields[k],
			ydataElement = ydata[k],
			ybinnedSample = groupValues(ydataElement, groups);

		let flattenArray = _.flatten(ybinnedSample),
			// Calculate the overall mean
			totalMean = flattenArray.reduce((sum, el) => sum + el, 0) / flattenArray.length,
			//Calculate the "between-group" sum of squared differences
			sB = _.range(groups.length).reduce((sum, index) => {
				if (nNumberMatrix[index][0] > 0) {
					return sum + nNumberMatrix[index][k] * Math.pow((meanMatrix[index][k] - totalMean), 2);
				} else {
					return sum;
				}
			}, 0),
			// between-group degrees of freedom
			fB = _.range(groups.length).filter(index => nNumberMatrix[index][k] > 0).length - 1,
			// between-group mean square differences
			msB = sB / fB,
			// Calculate the "within-group" sum of squares
			sW = _.range(groups.length).reduce((sum, index) => {
				if (nNumberMatrix[index][k] > 0) {
					return sum + Math.pow(stdMatrix[index][k], 2) * nNumberMatrix[index][k];
				} else {
					return sum;
				}
			}, 0),
			// within-group degrees of freedom
			fW = _.range(groups.length).reduce((sum, index) => {
				if (nNumberMatrix[index][k] > 0) {
					return sum + nNumberMatrix[index][k] - 1;
				} else {
					return sum;
				}
			}, 0),
			// within-group mean difference
			msW = sW / fW,
			//  F-ratio
			fScore = msB / msW,
			// p value
			pValue = jStat.ftest(fScore, fB, fW);

		ret += (
			(yfields.length > 1 ? ('\n' + yfield + '\n') : '') +
			'p = ' + pValue.toPrecision(4) + ' ' +
			'(f = ' + fScore.toPrecision(4) + ')\n'
		);
	});
	return ret;
}

const LOWERWHISKER = 0;
const LOWER = 1;
const MEDIAN = 2;
const UPPER = 3;
const UPPERWHISKER = 4;

function sortMatrices(xCategories, groups, colors, matrices) {
	let {boxes} = matrices,
		sortedIndex = _.sortBy(
				_.range(boxes.length).filter(i => !isNaN(boxes[i][0][MEDIAN])),
				i => boxes[i][0][MEDIAN]),
			reorder = m => _.map(sortedIndex, i => m[i]);

	return [reorder(xCategories), reorder(groups), reorder(colors),
			   _.mapObject(matrices, m => reorder(m))];
}

function boxplot({xCategories, matrices, yfields, colors, chart}) {
	var {boxes, nNumberMatrix} = matrices;

	xCategories.forEach((code, i) => {
		// http://onlinestatbook.com/2/graphing_distributions/boxplots.html
		var nNumberSeries = nNumberMatrix[i],
			color = colors[i],
			dataSeries = boxes[i];

		if (nNumberSeries[0]) {
			highchartsHelper.addSeriesToColumn({
				chart,
				type: 'boxplot',
				name: code,
				data: dataSeries,
				yIsCategorical: false,
				showDataLabel: yfields.length * xCategories.length < 30,
				showInLegend: code != null,
				color,
				description: nNumberSeries[0]});
		}
	});
}

function dotplot({ chart, matrices: { meanMatrix, nNumberMatrix, expressionMatrix: exprMatrix, detectionMatrix }, xCategories, yexpression, yfields }) {
	// determine the appropriate matrix for the selected data type
	var isSingleCellData = yexpression === 'singleCell',
		expressionMatrix = isSingleCellData ? exprMatrix : meanMatrix;

	// flatten the expression matrix, filter out NaN values, and determine min and max values for scaling
	var meanValues = expressionMatrix.flat().filter(v => !Number.isNaN(v)),
		minMean = _.min(meanValues),
		maxMean = _.max(meanValues),
		range = maxMean - minMean || 1;

	// retrieve marker scale settings from the chart configuration with default values
	var {
		opacity: { max: maxOpacity = 1, min: minOpacity = 0.2 } = {},
		radius: { max: maxRadius = 10, min: minRadius = 2 } = {}
	} = chart.markerScale || {};

	// add the series to the chart
	xCategories.forEach((category, categoryIndex) => {
		var nNumberSeries = nNumberMatrix[categoryIndex];
		highchartsHelper.addSeriesToColumn({
			chart,
			name: category,
			data: yfields.map((feature, featureIndex) => {
				// retrieve the expression value for the current category and feature
				var value = expressionMatrix[categoryIndex][featureIndex],
					// for single cell data, get the detection rate
					detectionValue = detectionMatrix?.[categoryIndex]?.[featureIndex],
					normalizedValue = (value - minMean) / range,
					opacity = normalizedValue * (maxOpacity - minOpacity) + minOpacity,
					color = Highcharts.color(defaultColor).setOpacity(opacity).get(),
					// choose the metric for radius: detection rate for single cell data or normalized expression for bulk data
					radiusMetric = isSingleCellData ? detectionValue : normalizedValue,
					radius = radiusMetric * (maxRadius - minRadius) + minRadius;
				return {
					color,
					custom: {expressedInCells: detectionValue, n: nNumberSeries[0]},
					marker: {radius},
					value,
					x: featureIndex,
					y: categoryIndex,
				};
			}),
			showInLegend: false,
			type: 'scatter',
		});
	});

	// update the x-axis scale to match the min and max expression values
	chart.colorAxis[0].update({min: minMean, max: maxMean, tickPositions: [minMean, maxMean]});
}

var violinSamples = 30;

function violinplot({xCategories, yfields, matrices: {boxes, nNumberMatrix},
		ydata, groups, chart, colors}) {

	// build kde and sample it
	var data = yfields.map((field, i) => {
		// XXX this duplicates the grouping done in initFVCMatrices. We need
		// the matricies to draw the iqr and whiskers.
		//
		// XXX this is also duplicated in the anova stats
		let ybinnedSample = groupValues(ydata[i], groups);

		return ybinnedSample.map(g => {
			// Only sample the region having data, for each group. Don't extend
			// to the global data range. This helps visually indicate the data range,
			// and reduces compute.
			var gmin = _.min(g),
				gmax = _.max(g),
				step = (gmax - gmin) / violinSamples,
				innerRange = _.times(violinSamples + 1, i => gmin + i * step);

			return kde().sample(g)(innerRange);
		});
	});

	// place groups across the x axis, and scale violin peak
	data = data.map((yfield, i) => {
		var offset = i * (groups.length + 1);
		return yfield.map((group, j) => {
			var y0 = offset + j;
			var upper = _.max(group.map(([, y]) => y));
			return group.map(([x, y]) => {
				// scale to fixed width. This prevents direct comparison
				// of two violins, but makes the shape more apparent. Without
				// this scaling, the graph width is essentially unbounded, since
				// a cluster of points will cause a very wide peak.
				var width = y / (upper * groups.length);
				return [x, y0 + width, y0 - width];
			});
		});
	}).flat();


	// here we're taking a flatted list of violin data. We align it with
	// boxplot data by some math. The flatted list is by mapping
	// yfields & x catageories.
	data.forEach((data, i) => {
		var cat = i % groups.length,
			code = xCategories[cat],
			field = Math.floor(i / groups.length),
			color = colors[cat],
			[lowerwhisker, lower, median, upper, upperwhisker] = boxes[cat][field],
			stats = {
				code,
				field: yfields[field],
				n: nNumberMatrix[cat][field],
				lowerwhisker,
				lower,
				median,
				upper,
				upperwhisker
			};
		// draw the body of the violin
		highchartsHelper.addSeriesToColumn({
			chart,
			type: 'areasplinerange',
			name: code, // for legend
			data,
			showDataLabel: yfields.length * groups.length < 30,
			showInLegend: code != null && i < groups.length,
			color,
			marker: {enabled: false},
			description: stats});
	});

	// here we iterate yfields & x catgories, and pull from boxplot data
	// for each. We use the x categories to project to the right offset.
	yfields.forEach((yfield, i) => {
		xCategories.forEach((code, j) => {
			var y = i * (groups.length + 1) + j;
			// draw the inner quartile range
			highchartsHelper.addSeriesToColumn({
				boost: {enabled: true},
				chart,
				type: 'line',
				color: 'black',
				lineWidth: 3,
				data: [[boxes[j][i][LOWER], y], [boxes[j][i][UPPER], y]]
			});
			// draw the whisker range
			highchartsHelper.addSeriesToColumn({
				chart,
				type: 'line',
				color: 'black',
				lineWidth: 1,
				data: [[boxes[j][i][LOWERWHISKER], y],
					[boxes[j][i][UPPERWHISKER], y]]
			});
		});
	});
	// here we again iterate y fields & x categories, and pull from the
	// boxplot data, flattening into a single series.
	var medians =
		yfields.flatMap((yfield, i) => groups.map((code, j) => {
			var y = i * (groups.length + 1) + j;
			return [boxes[j][i][MEDIAN], y] ;
		}));
	highchartsHelper.addSeriesToColumn({
				chart,
				type: 'scatter',
				marker: {
					symbol: 'circle',
					fillColor: 'white',
					radius: 1.5
				},
				data: medians});
}

var fvcOptions = chartType => ({
	boxplot: highchartsHelper.boxplotOptions,
	dot: highchartsHelper.dotOptions,
	violin: highchartsHelper.violinOptions
}[chartType]);

var fvcChart = chartType => ({
	boxplot,
	dot: dotplot,
	violin: violinplot
}[chartType]);

// It might make sense to split this into three functions instead of having
// two polymorphic calls in here, and not much else.
function boxOrDotOrViolin({chartType = 'boxplot',
		inverted, subtitle, yexpression, yfields, ydata, xlabel, ylabel,
		ynorm, chartData}) {

	var {xCategories, groups, colors, matrices} = chartData;

	var chartOptions = fvcOptions(chartType)({inverted, series:
		xCategories.length, categories: yfields, xAxis: {categories: yfields},
		xAxisTitle: xlabel, yAxis: {categories: xCategories}, yAxisTitle:
		ylabel, yexpression, ynorm});

	var chart = newChart(chartOptions, {subtitle: {text: subtitle}});

	fvcChart(chartType)({xCategories, groups, matrices, yexpression, yfields,
		ydata, colors, chart});

	return chart;
}

function floatVCodedData({xCategories, colors, ydata, groups, yexpression,
		yfields, ynonexpressed}) {
	var matrices = fvc.getMatrices({ydata, groups, yexpression, ynonexpressed});

	// sort by median of xCategories if yfields.length === 1
	if (xCategories.length > 0 && yfields.length === 1) {
		[xCategories, groups, colors, matrices] = sortMatrices(xCategories,
			groups, colors, matrices);
	}

	var stats = xCategories.length === 2 ? welch(matrices, yfields) :
		xCategories.length > 2 ? anova({matrices, yfields, ydata, groups}) :
		null;

	return {chartData: {xCategories, groups, colors, matrices}, stats};
}

function computeFloatVCoded({xdata, xcodemap, xcolor, ...params}) {
	var groupsByValue = groupIndex(xdata[0]),
		values = _.range(xcodemap.length).filter(v => groupsByValue[v]),
		xCategories = values.map(v => xcodemap[v]),
		groups = values.map(v => groupsByValue[v]);

	var colors = values.map(xcolor);
	return floatVCodedData({groups, xCategories, colors, ...params});
}

function floatVCoded(params) {
	return boxOrDotOrViolin(params);
}

var inRange = (number, {max, min}) => number >= min && number <= max;

// pick metrics that are in the display range.
var pickMetrics = (yavg, range) => _.pick(yavg, ([value]) => inRange(value, range));

function densityplot({yavg, yfields: [field], ylabel: Y, ydata: [data], subtitle}) {
	var nndata = _.filter(data, x => !isNaN(x)),
		min = _.min(nndata),
		max = _.max(nndata),
		points = 100, // number of points to interpolate, on screen
		density = kde().sample(nndata)(_.range(min, max, (max - min) / points));

	var chartOptions = highchartsHelper.densityChart({
		yavg: pickMetrics(yavg, {min, max}),
		yaxis: field, Y});

	var chart = newChart(chartOptions, {subtitle: {text: subtitle}});
	highchartsHelper.addSeriesToColumn({
		chart,
		color: defaultColor,
		type: 'areaspline',
		data: density,
		marker: {enabled: false}});
	return chart;
}

function summaryBoxplot(params) {
	var {cohortSamples} = params,
		groups = [_.range(0, cohortSamples.length)],
		colors = ['rgba(0, 0, 255, .5)', 'blue'],
		xCategories = [null];
	var {chartData} = floatVCodedData({groups, xCategories, colors, ...params});
	return boxOrDotOrViolin({...params, chartData});
}

function summaryColumn({ydata, ycodemap, xlabel, ylabel, subtitle}) {
	var lengths = _.mapObject(groupIndexByCode(ydata[0], ycodemap), g => g.length),
		categories = ycodemap.filter(c => _.has(lengths, c)),
		total = _.sum(_.values(lengths)),
		nNumberSeries = categories.map(code => lengths[code]),
		dataSeries = nNumberSeries.map(len => len * 100 / total);

	var chartOptions = highchartsHelper.columnChartOptions(
		categories.map(code => `${code} (${lengths[code]})`),
		xlabel, "Distribution", ylabel, false);

	var chart = newChart(chartOptions, {subtitle: {text: subtitle}});

	highchartsHelper.addSeriesToColumn({
		chart,
		type: 'column',
		name: ' ',
		data: dataSeries,
		yIsCategorical: true,
		showDataLabel: categories.length < 30,
		showInLegend: false,
		color: defaultColor,
		description: nNumberSeries});
	return chart;
}

export var summaryMode = ({ycodemap, yfields}) =>
	ycodemap ? 'column' :
	yfields.length > 1 ? 'boxplot' :
	'density';

var summary = multi(summaryMode);

summary.add('column', summaryColumn);
summary.add('boxplot', summaryBoxplot);
summary.add('density', densityplot);

function codedVCodedData({xdata, ydata}) {
	var ybins = groupIndex(ydata[0]),
		xbins = groupIndexWithValue(xdata[0], ydata[0]),
		yMargin = _.map(ybins, bin => bin.length),
		total = _.sum(yMargin),
		xMargin = _.map(xbins, bin => bin.length),
		xRatio = xMargin.map(count => count / total),
		expected = jStat.outer(yMargin, xRatio),
		observed =  _.map(ybins,
			ybin => _.map(xbins, xbin => _.intersection(xbin, ybin).length));

	return {observed, expected, xMargin, xbins, ybins};
}

// Pearson's chi-squared
// https://en.wikipedia.org/wiki/Pearson's_chi-squared_test note, another
// version of pearson's chi-squared test is G-test, Likelihood-ratio test,
// https://en.wikipedia.org/wiki/Likelihood-ratio_test
function codedVCodedStats({expected, observed}) {
	var dof = (observed.length - 1) * (observed[0].length - 1);
	if (dof) {
		var chisquareStats = jStat(observed).subtract(expected).pow(2)
			.map((v, i, j) => v / expected[i][j]).sum(true);

		var pValue = 1 - jStat.chisquare.cdf(chisquareStats, dof);
		return 'Pearson\'s chi-squared test\n' +
				'p = ' + pValue.toPrecision(4) + ' ' +
				'(χ2 = ' + chisquareStats.toPrecision(4) + ')';
	}
}

function computeCodedVCoded(params) {
	var chartData = codedVCodedData(params),
		stats = codedVCodedStats(chartData);
	return {chartData, stats};
}

function codedVCoded({xcodemap, ycodemap, ycolor,
	xlabel, ylabel, subtitle, chartData}) {

	var {xbins, ybins, observed, xMargin} = chartData;

	var chartOptions = highchartsHelper.columnChartOptions(
		_.keys(xbins).map((v, i) => `${xcodemap[v]} (${xMargin[i]})`),
		xlabel, 'Distribution', ylabel, true);

	var chart = newChart(chartOptions, {subtitle: {text: subtitle}});

	_.keys(ybins).map((v, i) => {
		var ycodeSeries = _.mmap(xMargin, observed[i], (xMarg, obs) =>
			xMarg && obs ? parseFloat(((obs / xMarg) * 100).toPrecision(3)) : 0);

		highchartsHelper.addSeriesToColumn({
			chart,
			type: 'column',
			name: ycodemap[v],
			data: ycodeSeries,
			yIsCategorical: true,
			showDataLabel: observed.length * observed[0].length < 30,
			showInLegend: true,
			color: ycolor(v),
			description: observed[i]});
	});

	return chart;
}

var nullStr = v => v !== v ? 'null' : v;

function computeFloatVFloat({xfield, yfields, xdata, ydata}) {
	var stats;
	// pearson rho value when there are <= 10 series x y scatter plot
	if (yfields.length <= 10 && xdata[0].length > 1) {
		if (xdata[0].length >= 5000) {
			stats = () => printPearsonAndSpearmanRho(xfield, yfields, xdata[0], ydata);
		} else {
			stats = printPearsonAndSpearmanRho(xfield, yfields, xdata[0], ydata);
		}
	}
	return {stats};
}

function floatVFloat({xdata, yfields, ydata, xlabel, ylabel,
	scatterColor, samplesMatched, cohortSamples, subtitle}) {

	var yfield,
		i, k,
		average, stdDev,
		chart;

	var sampleLabels = cohortSamples,
		x, y;

	var chartOptions = highchartsHelper.scatterChart(xlabel, ylabel, cohortSamples.length);

	if (yfields.length > 1) { // y multi-subcolumns -- only happen with genomic y data
		chart = newChart(chartOptions, {subtitle: {text: subtitle}});

		for (k = 0; k < yfields.length; k++) {
			var series = [];

			yfield = yfields[k];
			for (i = 0; i < xdata[0].length; i++) {
				x = xdata[0][i];
				y = ydata[k][i];
				if (!isNaN(x) && !isNaN(y)) {
					series.push({
						name: sampleLabels[i],
						x: x,
						y: y
					});
				}

			}
			chart.addSeries({
				name: yfield,
				data: series
			}, false);
		}
	} else { // y single subcolumn  --- coloring with a 3rd column
		var multiSeries = {},
			colorScale,
			highlightSeries = [],
			colorCode, colorMin, color, colorLabel,
			useCodedSeries = !scatterColor || scatterColor.codemap,
			gray = 'rgb(150,150,150)',
			bin;

		if (!useCodedSeries) {
			average = highchartsHelper.average(scatterColor.data);
			stdDev = highchartsHelper.standardDeviation(scatterColor.data, average);
			colorMin = _.min(scatterColor.data);
			bin = stdDev * 0.1;
			colorScale = v => isNaN(v) ? 'gray' : scatterColor.scale(v);
		}

		chart = newChart(chartOptions, {legend: {title: {text: ''}},
			subtitle: {text: subtitle}});

		yfield = yfields[0];
		for (i = 0; i < xdata[0].length; i++) {
			x = xdata[0][i];
			y = ydata[0][i];
			if (scatterColor) {
				colorCode = scatterColor.data[i];
			} else {
				colorCode = 0;
			}

			if (!isNaN(x) && !isNaN(y) && null != colorCode) {
				if (useCodedSeries) { // use multi-seriese
					if (!multiSeries[colorCode]) {
						multiSeries[colorCode] = {
							"data": []
						};
					}
					multiSeries[colorCode].data.push({
						colorLabel: scatterColor?.codemap ?
							(scatterColor.codemap[colorCode] || "null (no data)") : '',
						name: sampleLabels[i],
						x: x,
						y: y
					});
				} else { // convert float to multi-seriese
					colorCode = Math.round((colorCode - colorMin) / bin) * bin + colorMin;
					if (!multiSeries[colorCode]) {
						multiSeries[colorCode] = {
							"data": []
						};
					}
					multiSeries[colorCode].data.push({
						colorLabel: nullStr(scatterColor.data[i]),
						name: sampleLabels[i],
						x: x,
						y: y,
					});
				}

				if (samplesMatched &&
					cohortSamples.length !== bitCount(samplesMatched) &&
					isSet(samplesMatched, i)) {
					highlightSeries.push({
						name: sampleLabels[i],
						x: x,
						y: y
					});
				}
			}
		}

		_.keys(multiSeries).map( (colorCode, i) => {
			var showInLegend;
			if (scatterColor) {
				if (useCodedSeries) {
					colorLabel = scatterColor.codemap[colorCode] || "null (no data)";
					color = scatterColor.scale(colorCode) || gray;
					showInLegend = true;
				} else {
					color = colorScale(colorCode);
					colorLabel = scatterColor.label;
					showInLegend = (i === 0) ? true : false;
				}

			} else {
				color = defaultColor;
				colorLabel = "sample";
				showInLegend = true;
			}

			chart.addSeries({
				name: colorLabel,
				showInLegend: showInLegend,
				data: multiSeries[colorCode].data,
				color: color,
			}, false);
		});

		// add highlightSeries color in gold with black border
		if (highlightSeries.length > 0 ) {
			chart.addSeries({
				name: "highlighted samples",
				data: highlightSeries,
				marker: {
					symbol: 'circle',
					lineColor: 'black',
					fillColor: 'gold',
					lineWidth: 1,
				}
			}, false);
		}
	}

	return chart;
}

export var isFloatVCoded = ({xcodemap, ycodemap}) => xcodemap && !ycodemap;
export var isSummary = ({xfield}) => !xfield;
export var isCodedVCoded = ({xcodemap, ycodemap}) => xcodemap && ycodemap;

var chartMode = params =>
	isFloatVCoded(params) ? 'floatVCoded' :
	isSummary(params) ? 'summary' :
	isCodedVCoded(params) ? 'codedVCoded' :
	'floatVFloat';

var drawChart = multi(chartMode);

drawChart.add('floatVCoded', floatVCoded);
drawChart.add('summary', summary);
drawChart.add('codedVCoded', codedVCoded);
drawChart.add('floatVFloat', floatVFloat);

export var computeChart = multi(chartMode);

computeChart.add('floatVCoded', computeFloatVCoded);
computeChart.add('codedVCoded', computeCodedVCoded);
computeChart.add('floatVFloat', computeFloatVFloat);
computeChart.dflt = () => ({});

function shouldCallDrawChart(prevProps, currentProps) {
	return !_.isEqual(prevProps, currentProps);
}

class HighchartView extends PureComponent {
	componentDidMount() {
		sizeChartView();
		this.chart = drawChart(this.props.drawProps);
		this.chart.redraw();
		this.chart.reflow();
		window.addEventListener('resize', () => sizeChartView());
	}

	componentWillUnmount() {
		this.chart?.destroy();
		this.chart = undefined;
		window.removeEventListener('resize', () => sizeChartView());
	}

	componentDidUpdate(prevProps) {
		if (shouldCallDrawChart(prevProps, this.props)) {
			this.chart.destroy();
			this.chart = drawChart(this.props.drawProps);
			this.chart.redraw();
		} else {
			sizeChartView();
		}
		this.chart.reflow();
	}

	render() {
		return div({id: 'xenaChart', className: compStyles.chart});
	}
}
export var highchartView = el(HighchartView);
