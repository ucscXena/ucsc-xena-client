var Highcharts = require('highcharts/highstock');
require('highcharts/modules/exporting')(Highcharts);
require('highcharts/highcharts-more')(Highcharts);
var _ = require('../underscore_ext').default;
var styles = require('./chart.module.css');
import ReactDOMServer from 'react-dom/server';
import {div, table, tr, td, tbody, b} from './react-hyper';

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
	credits: {
		text: 'xena.ucsc.edu',
		href: 'http://xena.ucsc.edu'
	},
    navigation: {
        buttonOptions: {
			theme: {
				style: {
					color: '#4cc9c0',
				}
			}
        }
    }
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

var layoutStats = ({n, upperwhisker, upper, median, lower, lowerwhisker,
		field, code}) =>
	ReactDOMServer.renderToStaticMarkup(
		div({className: styles.violinTooltip},
			b(`${field}: ${code}`),
			tableBody(
				trd('n', n),
				trd('upper', upperwhisker),
				trd('Q3', upper),
				trd('median', median),
				trd('Q1', lower),
				trd('lower', lowerwhisker))));

function violinOptions({chartOptions, categories, xAxisTitle, yAxisTitle}) {
	var opts = {
		chart: {
			zoomType: 'y',
			inverted: true,
			// animation of y axis looks odd, and is unreliable. There doesn't
			// appear to be a way to disable it directly, so disabling animations
			// globally, here.
			animation: false
		},
		// scroll doesn't update the secondary axes that render ticks and
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
			title: '', // XXX is there a flag for this?
			type: 'category',
//			XXX add rotation, below
			labels: /*categories.length > 5 ? {rotation: -90} :*/ {
				enabled: false
			},
			gridLineWidth: 0,
		}, {
			// Getting tick marks and labels aligned correctly is challenging.
			// Want it to look like
			//     |   category A    |   category B   |
			// But there's no way to center labels in the categories. Also,
			// there's no way to draw labels in positions without tick marks.
			// So, we create a second axis for tick marks, and a third for
			// labels, adding empty categories as necessary so everything is
			// aligned.
			type: 'category',
			min: 0,
			max: categories.length,
			tickWidth: 1,
			tickmarkPlacement: 'on',
			labels: {enabled: false},
			title: '',
			lineWidth: 1,
			gridLineWidth: 0,
			endOnTick: false,
			startOnTick: false,
		}, {
			type: 'category',
			// The strategy here is to add blank categories between our
			// categories so the labels appear centered on our categories,
			// instead of on the edge.
			categories: [categories[0], ...categories.slice(1)
				.map(c => ['', c]).flat()],
			gridLineWidth: 0,
			min: -1,
			max: categories.length + 1,
			title: {text: xAxisTitle},
			offset: -4,
			labels: {
				enabled: true,
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
				states: {hover: {enabled: false}}
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
			headerFormat: xAxisTitle + ' : {series.name}<br>',
			formatter: function () {
				var nNumber = this.series.userOptions.description ? this.series.userOptions.description[this.point.x] : 0;
				return (xAxisTitle ? xAxisTitle + ' : ' : '')
					+ this.series.name + '<br>'
					+ (categories.length > 1 ?  yAxisTitle + ' ' : '' )
					+ categories[this.point.x]
					+ ': <b>'
					+ this.point.median.toPrecision(3) + '</b>'
					+ ' (' + this.point.low.toPrecision(3) + ','
					+ this.point.q1.toPrecision(3) + ','
					+ this.point.q3.toPrecision(3) + ','
					+ this.point.high.toPrecision(3) + ')<br>'
					+ '</b><br>'
					+ (nNumber ? 'n = ' + nNumber : '');
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
					opacity: 0.1
				},
			},
			series: {
				animation: false,
				turboThreshold: 0,
				stickyTracking: false,
				boostThreshold: 1000
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

function average(data) {
	var sum = data.reduce(function(a, b) {
		return a + b;
	}, 0);

	var avg = sum / data.length;

	return avg;
}

function standardDeviation(values, avg) {
	var squareDiffs = values.map(function(value) {
		var diff = value - avg;
		var sqrDiff = diff * diff;
		return sqrDiff;
	});

	var avgSquareDiff = average(squareDiffs);

	var stdDev = Math.sqrt(avgSquareDiff);
	return stdDev;
}

module.exports = {
	chartOptions,
	standardDeviation,
	average,
	columnChartOptions,
	boxplotOptions,
	violinOptions,
	scatterChart,
	addSeriesToColumn
};
