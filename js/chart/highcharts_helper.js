var Highcharts = require('highcharts/highstock');
require('highcharts/modules/exporting')(Highcharts);
require('highcharts/highcharts-more')(Highcharts);
var _ = require('../underscore_ext').default;

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
        enabled: true
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

// x categorical y float  boxplot
function columnChartFloat(chartOptions, categories, xAxisTitle, yAxisTitle) {
	var opts = {
		chart: {
			zoomType: 'x'
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
			labels: categories.length > 5 ? {rotation: -90} : {}
		},
		yAxis: {
			title: {text: yAxisTitle}
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
				animation: false
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

function addSeriesToColumn (chart, chartType, sName, ycodeSeries, yIsCategorical,
	showDataLabel, showLegend, color, nNumberSeriese = undefined) {
	var seriesOptions = {
		name: sName,
		type: chartType,
		data: ycodeSeries,
		maxPointWidth: 50,
		color: color,
		description: nNumberSeriese  // use description to carry n=xx information
	};

	if (!showLegend) {
		seriesOptions.showInLegend = false;
	}

	if (showDataLabel) {
		if ( yIsCategorical) {
			seriesOptions.dataLabels = {
				enabled: true,
				formatter: function () { return this.point.y.toPrecision(3) + '%';}
			};
		} else {  // boxplot data label is not implemented in highchart, yet
			seriesOptions.dataLabels = {
				enabled: true,
				format: '{point.median}'
			};
		}
	}
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
	columnChartFloat,
	scatterChart,
	addSeriesToColumn
};
