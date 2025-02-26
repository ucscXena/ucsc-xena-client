var _ = require('../underscore_ext').default;
var styles = require('./chart.module.css');
import ReactDOMServer from 'react-dom/server';
import {div, table, tr, td, tbody, b} from './react-hyper';
import {xenaColor} from '../xenaColor';

function hcLabelRender() {
	var s = this.name;
	var r = "";
	var lastAppended = 0;
	var lastSpace = -1;
	for (var i = 0; i < s.length; i++) {
		if (s.charAt(i) === ' ') { lastSpace = i; }
		if (i - lastAppended > 20) {
			if (lastSpace === -1) { lastSpace = i; }
			r += s.substring(lastAppended, lastSpace);
			lastAppended = lastSpace;
			lastSpace = -1;
			r += "<br>";
		}
	}
	r += s.substring(lastAppended, s.length);
	return r;
}

var chartOptions = {
	chart: {
		renderTo: 'xenaChart',
	},
	subtitle: {
		useHTML: true
	},
    scrollbar: {
        enabled: false
    },
	legend: {
		title: {
			style: {
				fontStyle: 'italic',
				width: '100px'
			}
		},
		enabled: true,
		labelFormatter: hcLabelRender,
		itemHoverStyle: {
			color: '#ff6600'
		},
		navigation: {
			activeColor: '#3E576F',
			animation: true,
			arrowSize: 12,
			inactiveColor: '#CCC',
			style: {
				fontWeight: 'bold',
				color: '#333',
				fontSize: '12px'
			}
		},
	},
	credits: {enabled: false}
};

var barTooltip = (xAxisTitle, Y) => ({
	headerFormat: xAxisTitle + ' : {point.key}<br>',
	formatter: function () {
		var nNumber = _.get(this.series.userOptions.description, this.point.x, 0);
		return Y + '=<b>' + this.series.name + '</b>'
			+ '<br>'
			+ '<b>' + this.point.y + '%</b>'
			+ '</b><br>'
			+ 'n = ' + nNumber;
	},
	hideDelay: 0
});

var histoTooltip = (categories, Y) => ({
	formatter: function () {
		return Y + '<br>' + categories[this.point.x]
			+ '<br>'
			+ '<b> n = ' + this.point.y + '</b>';
	},
	hideDelay: 0
});

var distTooltip = (categories, Y) => ({
	formatter: function () {
		return Y + '=' + categories[this.point.x]
			+ '<br>'
			+ '<b>' + this.point.y.toPrecision(3) + '%</b>';
	},
	hideDelay: 0
});


var codedTooltip = (isHisto, xAxisTitle, categories, Y) =>
	xAxisTitle ? barTooltip(xAxisTitle, Y) :
	isHisto ? histoTooltip(categories, Y) :
	distTooltip(categories, Y);

var pctLabel = {
	'p01': '1st',
	'p05': '5th',
	'p10': '10th',
	'p25': '25th',
	'p33': '33rd',
	'p66': '66th',
	'p75': '75th',
	'p90': '90th',
	'p95': '95th',
	'p99': '99th',
	'sd01': '1 stdev',
	'sd01_': '-1 stdev',
	'sd02': '2 stdev',
	'sd02_': '-2 stdev',
	'sd03': '3 stdev',
	'sd03_': '-3 stdev'
};

var isBelowMean = key => /^(p([0-4][0-9])|sd0[1-3]_)$/.test(key);
var isMeanOrMedian = key => /^(mean|median)$/.test(key);

function plotlineOpts([key, values]) {
	if (!key || !values) {
		return;
	}
	var isPct = Boolean(pctLabel[key]),
		belowMean = isBelowMean(key),
		meanOrMedian = isMeanOrMedian(key),
		isLeft = belowMean || meanOrMedian, // plotline label alignment
		label = pctLabel[key] || key,
		value = _.first(values);
	return {
		dashStyle: isPct ? 'dash' : 'solid',
		label: {
			align: isLeft ? 'left' : 'right',
			style: {
				textTransform: isPct ? 'none' : 'capitalize',
			},
			text: `<div style='margin: 0 7px;'><span>${label}: ${value.toPrecision(4)}</span>
						<svg fill='none' height='10' style='bottom: -9px; left: ${isLeft ? '-9px' : 'undefined'}; position: absolute; right: ${isLeft ? 'undefined' : '-9px'};' viewBox='0 0 10 10' width='10'><path opacity='0.5' d='${isLeft ? 'M9 1L1 9' : 'M9 9.00003L1 1.00003'}' stroke='#212121'/></svg>
						<svg class='copy' fill='none' height='14' viewBox='0 0 14 14' width='14'><path d='M5.25 10.5C4.92917 10.5 4.65451 10.3858 4.42604 10.1573C4.19757 9.92883 4.08333 9.65417 4.08333 9.33334V2.33334C4.08333 2.01251 4.19757 1.73785 4.42604 1.50938C4.65451 1.28091 4.92917 1.16667 5.25 1.16667H10.5C10.8208 1.16667 11.0955 1.28091 11.324 1.50938C11.5524 1.73785 11.6667 2.01251 11.6667 2.33334V9.33334C11.6667 9.65417 11.5524 9.92883 11.324 10.1573C11.0955 10.3858 10.8208 10.5 10.5 10.5H5.25ZM5.25 9.33334H10.5V2.33334H5.25V9.33334ZM2.91667 12.8333C2.59583 12.8333 2.32118 12.7191 2.09271 12.4906C1.86424 12.2622 1.75 11.9875 1.75 11.6667V3.50001H2.91667V11.6667H9.33333V12.8333H2.91667Z' fill='#1C1B1F'/></svg>
					</div>`,
			y: meanOrMedian ? 0 : belowMean ? -32 : 32,
		},
		value
	};
}

function addXAxisPlotline({chart, ...opts}) {
	var plotLineOptions = _.deepMerge({
		color: '#21212180',
		label: {
			rotation: 0,
			style: {
				fontSize: '11px',
				textTransform: 'capitalize',
			},
			useHTML: true,
			verticalAlign: 'middle',
			x: 0,
		},
		width: 1,
	}, opts);
	chart.xAxis[0].addPlotLine(plotLineOptions);
}

function addCopyToXAxisPlotlineLabel({chart}) {
	chart.xAxis[0].plotLinesAndBands.forEach((plotLine) => {
		if (plotLine && plotLine.svgElem) {
			setTimeout(() => {
				var {label, options} = plotLine,
					{value} = options || {};
					label?.on('click', function () {
						navigator.clipboard.writeText(value);
					});
			}, 0);
		}
	});
}

function positionXAxisPlotlineLabel({chart}) {
	var {chartWidth, xAxis} = chart;
	xAxis[0].plotLinesAndBands.forEach(({label}) => {
		if (label) {
			var {alignAttr, alignOptions: {align} = {}, element} = label;
			if (align === 'right') {
				element.style.removeProperty('left');
				element.style.setProperty('right', `${chartWidth - alignAttr.x}px`);
			}
		}
	});
}

function densityChart({chartOptions, yavg, Y}) {
	var opts = {
		chart: {
			events: {
				load: function() {
					Object.entries(yavg || {}).forEach((measure) => {
						addXAxisPlotline({chart: this,  ...plotlineOpts(measure)});
					});
					addCopyToXAxisPlotlineLabel({chart: this});
					positionXAxisPlotlineLabel({chart: this});
				},
				redraw: function() {
					positionXAxisPlotlineLabel({chart: this});
				},
			},
			zoomType: 'x'
		},
		legend: {
			enabled: false
		},
		title: {
			text: `Density of ${Y}`
		},
		xAxis: {
			title: {
				text: ''
			},
			type: 'linear'
		},
		yAxis: {
			title: {
				text: 'Density'
			},
			labels: {
				format: '{value}'
			}
		},
		plotOptions: {
			series: {
				animation: false,
			},
		},
		tooltip: {
			formatter: function() {
				return `${this.point.x.toPrecision(3)}, ${this.point.y.toPrecision(3)}`;
			}
		}
	};
	return _.deepMerge(chartOptions, opts);
}


// x categorical, Y categorical
function columnChartOptions(chartOptions, categories, xAxisTitle, yAxisType, Y, showLegend) {
	var isHisto = yAxisType === 'Histogram',
		yAxisTitle = isHisto ? 'Histogram' : 'Distribution';

	var opts = {
		chart: {zoomType: 'x'},
		legend: {
			align: 'right',
			verticalAlign: 'middle',
			layout: 'vertical',
			title: {
				style: {
					width: "100px",
					fontStyle: 'italic'
				},
				text: Y
			},
			enabled: showLegend
		},
		title: {
			text: `${yAxisTitle} of ${Y}${xAxisTitle && " according to "}${xAxisTitle}`
		},
		xAxis: {
			title: {
				text: xAxisTitle
			},
			type: 'category',
			categories: categories,
			minRange: -1,
			labels: categories.length > 15 ? {
				rotation: -90
			} : {}
		},
		yAxis: {
			title: {
				text: isHisto ? 'count' : 'distribution'
			},
			labels: {
				format: isHisto ? '{value}' : '{value} %'
			}
		},
		plotOptions: {
			series: {
				animation: false,
				borderColor: '#303030'
			},
			errorbar: {
				color: 'gray'
			}
		},
		tooltip: codedTooltip(isHisto, xAxisTitle, categories, Y)
	};

	return _.deepMerge(chartOptions, opts);
}

var tableBody = (...args) => table(tbody(...args));
var trd = (...args) => tr(...args.map(e => td(e.toString())));
var statsPrec = x => x.toPrecision(3);

var layoutStats = ({n, upperwhisker, upper, median, lower, lowerwhisker,
		field, code}) =>
	ReactDOMServer.renderToStaticMarkup(
		div({className: styles.violinTooltip},
			b(code ? `${field}: ${code}` : field),
			tableBody(
				trd('n', n),
				trd('upper', statsPrec(upperwhisker)),
				trd('Q3', statsPrec(upper)),
				trd('median', statsPrec(median)),
				trd('Q1', statsPrec(lower)),
				trd('lower', statsPrec(lowerwhisker)))));

function violinOptions({chartOptions, categories, series, xAxisTitle, yAxisTitle}) {
	var opts = {
		boost: {enabled: false},
		chart: {
			zoomType: 'xy',
			inverted: true,
			// animation of y axis looks odd, and is unreliable. There doesn't
			// appear to be a way to disable it directly, so disabling animations
			// globally, here.
			animation: false,
		},
		// scroll doesn't update the secondary axis that renders ticks and
		// labels, which makes it confusing. Also, it re-renders the violins
		// during the scroll, which is compute intensive, and causes the scroll
		// to stutter. Leaving it off. It's still possible to zoom in & out
		// without scroll.
		scrollbar: {enabled: false},
		legend: {
			align: 'right',
			margin: 5,
			title: {text: xAxisTitle},
			verticalAlign: 'middle',
			layout: 'vertical'
		},
		// violin no chart tile because both x and y axis are clearlly marked.
		title: {text: undefined},
		yAxis: [{
			title: '',
			type: 'category',
			labels: {
				enabled: false
			},
			gridLineWidth: 0,
			startOnTick: false,
			endOnTick: false,
			min: -0.5,
			max: categories.length * (series + 1) - 1.5
		}, {
			type: 'category',
			lineWidth: 1,
			tickWidth: 1,
			tickmarkPlacement: 'between',
			categories,
			min: -0.5,
			max: categories.length - 0.5,
			gridLineWidth: 0,
			title: {text: xAxisTitle},
			labels: {
				enabled: true,
				rotation: categories.length > 5 ? -90 : 0,
				formatter: function ({pos}) {
					return this.axis.categories[pos];
				}
			},
			endOnTick: false,
			startOnTick: false,
		}],
		xAxis: {
			title: {text: yAxisTitle},
			gridLineWidth: 1,
			reversed: false,
			scrollbar: {enabled: false, height: 0}
		},
		tooltip: {
			headerFormat: xAxisTitle + ' : {series.name}<br>',
			useHTML: true,
			formatter: function () {
				return layoutStats(this.series.userOptions.description);
			},
			hideDelay: 0
		},
		plotOptions: {
			series: {
				animation: false,
				// Don't highlight the kde interpolation points on hover.
				states: {hover: {enabled: false}},
				events: {
					legendItemClick: () => false
				}
			},
			line: {
				enableMouseTracking: false,
				marker: {enabled: false},
				showInLegend: false,
			},
			scatter: {
				enableMouseTracking: false,
				showInLegend: false,
			}
		}
	};

	return _.deepMerge(chartOptions, opts);
}

// x categorical y float  boxplot
function boxplotOptions({chartOptions, categories, xAxisTitle, yAxisTitle}) {
	var opts = {
		chart: {
			zoomType: 'x',
		},
		scrollbar: {
			enabled: false
		},
		legend: {
			align: 'right',
			margin: 5,
			title: {text: xAxisTitle},
			verticalAlign: 'middle',
			layout: 'vertical'
		},
		// boxplot no chart tile because both x and y axis are clearlly marked.
		title: {text: ''},
		xAxis: {
			title: {text: xAxisTitle},
			type: 'category',
			categories: categories.length === 1 ? [''] : categories,
			minRange: -1,
			labels: categories.length > 5 ? {rotation: -90} : {},
			gridLineWidth: 0,
		},
		yAxis: {
			title: {text: yAxisTitle},
			gridLineWidth: 1,
			reversed: false
		},
		tooltip: {
			outside: true,
			positioner: function(width, height, point) {
				// The docs for this method are poor, and I'm uncertain about
				// this calculation, esp. for y.
				return {
					x: point.plotX + this.chart.plotLeft,
					y: point.plotY + height - 10 + this.chart.plotTop
				};
			},
			headerFormat: xAxisTitle + ' : {series.name}<br>',
			useHTML: true,
			formatter: function () {
				// highchart injects a default name 'Series 1'
				var code = this.series.name === 'Series 1' ? null : this.series.name;
				return layoutStats({
					n: this.series.userOptions.description,
					upperwhisker: this.point.high,
					upper: this.point.q3,
					median: this.point.median,
					lower: this.point.q1,
					lowerwhisker: this.point.low,
					field: categories[this.point.x],
					code
				});
			},
			hideDelay: 0
		},
		plotOptions: {
			series: {
				animation: false,
				line: {
					tooltip: {enabled: false}
				}
			},
			errorbar: {
				color: 'gray'
			}
		}
	};

	return _.deepMerge(chartOptions, opts);
}

function formatPercentage(value) {
	if (!value) {return "--";}
	return `${Math.round(value * 10000) / 100}%`;
}

// Map of ynorm values to corresponding dot plot legend title.
var legendTitle = {
	'none': 'Mean value',
	'subset': 'Mean\u00A0normalized\u00A0value',
	'subset_stdev': 'Mean z-score',
};

// Define a min and max radius (in pixels) for the dot plot symbol, and a min and max opacity for the dot plot color.
var markerScale = {opacity: {max: 1, min: 0.2}, radius: {max: 10, min: 2}};

function dotOptions({ chartOptions, dataType, inverted, xAxis, xAxisTitle, yAxis, yAxisTitle, ynorm }) {
	var isSingleCell = dataType === 'singleCell',
		opts = {
			chart: {
				events: {
					load: function () {
						var chart = this;
						chart.markerScale = markerScale;
					},
				},
				inverted,
				type: 'scatter',
				zoomType: inverted ? 'y' : 'x',
			},
			colorAxis: {
				labels: {
					formatter: function () {
						if (this.value === 0 || this.value === 1) {
							return this.value.toFixed(1);
						}
					}
				},
				min: 0,
				max: 1,
				stops: [
					[0, xenaColor.BLUE_PRIMARY_2],
					[1, xenaColor.BLUE_PRIMARY]
				],
				showInLegend: true,
				tickPositions: [0, 0.25, 0.5, 0.75, 1],
			},
			legend: {
				align: 'right',
				layout: 'horizontal',
				title: {text: legendTitle[ynorm]},
			},
			plotOptions: {
				scatter: {marker: {symbol: 'circle'}},
			},
			title: {text: ''},
			tooltip: {
				formatter: function () {
					var {xAxis, yAxis} = this.series,
						{custom, value, x, y} = this.point;
					return `<div>
								<b>${xAxis.categories[x]}: ${yAxis.categories[y]}</b>
								<div>${isSingleCell ? 'average expression' : 'mean'}: ${value.toPrecision(3)}</div>
								<div style='display: ${isSingleCell ? 'block' : 'none'};'>expressed in cells: ${formatPercentage(custom.expressedInCells)}</div>
								<div>N: ${custom?.n || '--'}</div>
							</div>`;
				},
				hideDelay: 0,
				useHTML: true,
			},
			xAxis: {
				categories: xAxis.categories,
				gridLineWidth: 0,
				labels: {rotation: inverted ? 0 : -90},
				lineWidth: 1,
				tickWidth: 0,
				title: {text: yAxisTitle},
			},
			yAxis: {
				categories: yAxis.categories,
				gridLineWidth: 0,
				labels: {rotation: inverted ? -90 : 0},
				lineWidth: 1,
				tickWidth: 0,
				title: {text: xAxisTitle},
			},
	};

	return _.deepMerge(chartOptions, opts);
}

function scatterChart(chartOptions, xlabel, ylabel, samplesLength) {
	var xAxisTitle = xlabel,
		yAxisTitle = ylabel;

	var opts = {
		chart: {
			zoomType: 'xy',
			type: 'scatter',
			boost: {
				useGPUTranslations: true,
				usePreAllocated: true
			}
		},
		legend: {
			align: 'right',
			verticalAlign: 'middle',
			layout: 'vertical'
		},
		// scatter plot no chart tile because both x and y axis are clearlly marked.
		title: {text: ''},
		xAxis: {
			title: {
				text: xAxisTitle
			},
			minRange: -1,
			crosshair: true
		},
		yAxis: {
			title: {
				text: yAxisTitle
			},
			gridLineWidth: 0,
			tickWidth: 1,
			lineWidth: 1,
			crosshair: true,
			scrollbar: {
				enabled: true,
				showFull: false
			}
		},
		tooltip: {
			hideDelay: 0,
			formatter: function () {
				return '<b>' + this.point.colorLabel + '</b><br>' +
					'sample: ' + this.point.name + '<br>' +
					'x: ' + this.point.x.toPrecision(3) + '<br>' +
					'y: ' + this.point.y.toPrecision(3);
				}
		},
		plotOptions: {
			scatter: {
				marker: {
					radius: samplesLength > 10000 ? 1 : 2,
					// custom property to override radius in
					// the legend. See chart.js. highcharts
					// will clip this to the label height, so
					// make it large & let the clip pick the
					// right size.
					legendRadius: 20,
					opacity: 0.1,
					symbol: 'circle'
				},
			},
			series: {
				animation: false,
				turboThreshold: 0,
				stickyTracking: false,
				// highcharts 6 seems to have bugs related to boost
				// turning on & off with this threshold, so setting it to
				// 1 to force it on. Also, it's much faster e.g. on pancan
				// with boost always enabled.
				boostThreshold: 1
			}
		}
	};
	return _.deepMerge(chartOptions, opts);
}

var labelMethod = {
	true: { // category
		enabled: true,
		formatter: function () { return this.point.y.toPrecision(3) + '%'; }
	},
	false: {
		enabled: true,
		format: '{point.median}'
	}
};

function addSeriesToColumn({chart, yIsCategorical = false, showDataLabel = true,
		...opts}) {
	var dataLabels = !showDataLabel ? {} : labelMethod[!!yIsCategorical];
	var seriesOptions = _.deepMerge({
		maxPointWidth: 50,
		dataLabels,
	}, opts);

	chart.addSeries(seriesOptions, false);
}

var average = _.mean;

function standardDeviation(values, avg) {
	if (isNaN(avg)) { // no usable data
		return NaN;
	}
	var squareDiffSum = 0, count = 0;

	for (var i = 0; i < values.length; ++i) {
		if (!isNaN(values[i])) {
			var d = values[i] - avg;
			squareDiffSum += d * d;
			count++;
		}
	}

	return Math.sqrt(squareDiffSum / count);
}

module.exports = {
	chartOptions,
	densityChart,
	standardDeviation,
	average,
	columnChartOptions,
	boxplotOptions,
	dotOptions,
	violinOptions,
	scatterChart,
	addSeriesToColumn
};
