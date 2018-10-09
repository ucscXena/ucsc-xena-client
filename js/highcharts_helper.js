'use strict';

var Highcharts = require('highcharts/highstock');
require('highcharts/highcharts-more')(Highcharts);

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
		renderTo: 'myChart',
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
	}
};

// x categorical, Y categorical
function columnChartOptions (chartOptions, categories, xAxisTitle, yAxisType, Y, showLegend) {
	var yAxisTitle = yAxisType === 'Histogram' ? 'Histogram' : 'Distribution';

	chartOptions.chart.zoomType = 'x';
	chartOptions.legend.align = 'right';
	chartOptions.legend.verticalAlign = 'middle';
	chartOptions.legend.layout = 'vertical';

	chartOptions.legend.title.style = {
		width: "100px",
		fontStyle: 'italic'
	};

	if (showLegend) {
		chartOptions.legend.title.text = Y;
	} else {
		chartOptions.legend.title = {};
	}

	chartOptions.title = {
		text: yAxisTitle + " of " + Y + ((xAxisTitle === "") ? "" : " according to " + xAxisTitle)
	};
	chartOptions.xAxis = {
		title: {
			text: xAxisTitle
		},
		type: 'category',
		categories: categories,
		minRange: -1
	};
	chartOptions.yAxis = {
		title: {
			text: yAxisType === "Histogram" ? "count" : "distribution"
		}
	};
	chartOptions.plotOptions = {
		series: {
			animation: false
		},
		errorbar: {
			color: 'gray'
		}
	};
	//tooltip
	if (xAxisTitle === "" && yAxisType === 'Histogram') { //histogram
		chartOptions.tooltip = {
			formatter: function () {
					return Y + '<br>' + categories[this.point.x]
						+ '<br>'
						+ '<b> n = ' + this.point.y + '</b>';
			},
			hideDelay: 0
		};
	} else if (xAxisTitle === "" && yAxisType !== 'Histogram') { //distribution
		chartOptions.tooltip = {
			formatter: function () {
				return Y + '=' + categories[this.point.x]
					+ '<br>'
					+ '<b>' + this.point.y.toPrecision(3) + '%</b>';
			},
			hideDelay: 0
		};
	} else {
		chartOptions.tooltip = {
			headerFormat: xAxisTitle + ' : {point.key}<br>',
			formatter: function () {
				var nNumber = this.series.userOptions.description ? this.series.userOptions.description[this.point.x] : 0;
				return Y + '=<b>' + this.series.name + '</b>'
					+ '<br>'
					+ '<b>' + this.point.y + '%</b>'
					+ '</b><br>'
					+ 'n = ' + nNumber;
			},
			hideDelay: 0
		};
	}

	if (categories.length > 15) {
		chartOptions.xAxis.labels = {
			rotation: -90
		};
	}

	chartOptions.yAxis.labels = {
		format: yAxisType === "Histogram" ? '{value}' : '{value} %'
	};

	return chartOptions;
}

// x categorical y float  boxplot
function columnChartFloat (chartOptions, categories, xAxisTitle, yAxisTitle) {
	chartOptions.chart.zoomType = 'x';
	chartOptions.legend.align = 'right';
	chartOptions.legend.margin = 5;
	chartOptions.legend.title.text = xAxisTitle;
	chartOptions.legend.verticalAlign = 'middle';
	chartOptions.legend.layout = 'vertical';

	chartOptions.title = {
		text: '' // boxplot no chart tile because both x and y axis are clearlly marked.
	};

	chartOptions.xAxis = {
		title: {
			text: xAxisTitle
		},
		type: 'category',
		categories: categories.length === 1 ? [''] : categories,
		minRange: -1
	};

	chartOptions.yAxis = {
		title: {
			text: yAxisTitle
		}
	};

	chartOptions.tooltip = {
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
	};

	if (categories.length > 5) {
		chartOptions.xAxis.labels = {
		rotation: -90
		};
	}

	chartOptions.plotOptions = {
		series: {
			animation: false
		},
		errorbar: {
			color: 'gray'
		}
	};

	return chartOptions;
}

function scatterChart(chartOptions, xlabel, ylabel, samplesLength) {
	var xAxisTitle = xlabel,
		yAxisTitle = ylabel;

	chartOptions.chart.zoomType = 'xy';
	chartOptions.chart.type = 'scatter';
	chartOptions.chart.boost = {
        useGPUTranslations: true,
        usePreAllocated: true
    };
	chartOptions.legend.align = 'right';
	chartOptions.legend.verticalAlign = 'middle';
	chartOptions.legend.layout = 'vertical';
	chartOptions.title = {
		text: '' // scatter plot no chart tile because both x and y axis are clearlly marked.
	};
	chartOptions.xAxis = {
		title: {
			text: xAxisTitle
		},
		minRange: -1,
		crosshair: true
	};
	chartOptions.yAxis = {
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
	};
	chartOptions.tooltip = {
		hideDelay: 0,
		formatter: function () {
			return '<b>' + this.point.colorLabel + '</b><br>' +
				'sample: ' + this.point.name + '<br>' +
				'x: ' + this.point.x.toPrecision(3) + '<br>' +
				'y: ' + this.point.y.toPrecision(3);
			}
	};
	chartOptions.plotOptions = {
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
	};
	return chartOptions;
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
