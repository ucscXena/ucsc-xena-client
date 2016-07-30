/*eslint camelcase: 0 */
/*global define: true*/
'use strict';
define(['./highcharts'], function () {
	function hcLabelRender(){
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
			panning: true,
			panKey: 'shift'
		},
		subtitle: {
			useHTML: true
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
			enabled: false
		}
	};

	// x categorical, Y categorical
	function columnChartOptions (chartOptions, categories, xAxisTitle, Y, showLegend){
		var yAxisTitle;
			yAxisTitle = "Percentage distribution";

			chartOptions.legend.align = 'right';
			chartOptions.legend.verticalAlign = 'middle';
			chartOptions.legend.layout = 'vertical';

			chartOptions.legend.title.style = {
				width: "100px",
				fontStyle: 'italic'
			};

		if (showLegend) {
			chartOptions.legend.title.text = Y +
				'<br/><span style="font-size: 9px; color: #666; font-weight: normal">(Click to hide)</span>';
		} else {
			chartOptions.legend.title = {};
		}

		chartOptions.title = {
			text: yAxisTitle + " of " + Y + ((xAxisTitle === "") ? "" : " by " + xAxisTitle)
		};
		chartOptions.xAxis = {
			title: {
				text: xAxisTitle,
				margin: 10,
				style: {
					color: 'black',
					fontSize: '20px'
				}
			},
			type: 'category',
			categories: categories,
			minRange: 1
		};
		chartOptions.yAxis = {
			title: {
				text: yAxisTitle
			}
		};
		chartOptions.plotOptions = {
			errorbar: {
				color: 'gray'
			}
		};
		//tooltip
		if (xAxisTitle === ""){
			chartOptions.tooltip = {
				formatter: function () {
					return Y + ' ' + categories[this.point.x] + ': <b>' + this.point.y + '%</b>';
				},
				hideDelay: 0
			};
		} else {
			chartOptions.tooltip = {
				headerFormat: xAxisTitle + ' : {point.key}<br>',
				pointFormat: Y + ' {series.name}: <b>{point.y}%</b>',
				hideDelay: 0
			};
		}

		if (categories.length > 15){
			chartOptions.xAxis.labels = {
				rotation: -90
			};
		}

		chartOptions.yAxis.labels = {
			format: '{value} %'
		};

		return chartOptions;
	}

	// x categorical y float
	function columnChartFloat (chartOptions, categories, xAxisTitle, yAxisTitle){
		chartOptions.legend.align = 'right';
		chartOptions.legend.margin = 5;
		chartOptions.legend.title.text = xAxisTitle +
			'<br/><span style="font-size: 9px; color: #666; font-weight: normal">(Click to hide)</span>';
		chartOptions.legend.verticalAlign = 'middle';
		chartOptions.legend.layout = 'vertical';

		chartOptions.title = {
			text: yAxisTitle + ((xAxisTitle === "") ? "" : " by " + xAxisTitle)
		};

		chartOptions.xAxis = {
			title: {
				margin: 10,
				style: {
					color: 'black',
					fontSize: '20px'
				}
			},
			type: 'category',
			categories: categories.length === 1 ? [''] : categories,
			minRange: -1
		};

		chartOptions.tooltip = {
			headerFormat: xAxisTitle + ' : {series.name}<br>',
			formatter: function () {
				return xAxisTitle + ' : ' + this.series.name + '<br>'
					+ (categories.length > 1 ?  yAxisTitle + ' ' : '' )
					+ categories[this.point.x]
					+ ': <b>'
					+ (this.point.high ? (this.point.low + ' to ' + this.point.high ) : this.point.y)
					+ '</b>';
			},
			hideDelay: 0
		};

		if (categories.length > 5) {
			chartOptions.xAxis.labels = {
			rotation: -90
			};
		}

	    chartOptions.yAxis = {
			title: {
				text: yAxisTitle
			}
	    };
	    chartOptions.plotOptions = {
			errorbar: {
				color: 'gray'
			}
	    };

	    return chartOptions;
	}

	function scatterChart(chartOptions, xlabel, ylabel){
		var xAxisTitle = xlabel,
			yAxisTitle = ylabel;

		chartOptions.legend.align = 'right';
		chartOptions.legend.verticalAlign = 'middle';
		chartOptions.legend.layout = 'vertical';
		chartOptions.chart.type = 'scatter';
		chartOptions.title = {
			text: yAxisTitle + " vs " + xAxisTitle
		};
		chartOptions.xAxis = {
			title: {
				text: xAxisTitle
			},
			gridLineWidth: 1,
			minRange: 1,
			crosshair: true
		};
		chartOptions.yAxis = {
			title: {
				text: yAxisTitle
			},
			crosshair: true
		};
		chartOptions.tooltip = {
			hideDelay: 0,
			pointFormat: '{point.name}<br>x: {point.x}<br>y:{point.y}'
		};
		chartOptions.plotOptions = {
			series: {
				turboThreshold: 0
			}
		};
		return chartOptions;
	}

	function addSeriesToColumn (chart, sName, ycodeSeries, errorSeries, yIsCategorical, showDataLabel, showLegend, color){
		var seriesOptions = {
			name: sName,
			type: 'column',
			data: ycodeSeries,
			maxPointWidth: 50,
			color:color
		};

		if (!showLegend) {
			seriesOptions.showInLegend = false;
		}

		if (showDataLabel){
			if ( yIsCategorical) {
				seriesOptions.dataLabels = {
					enabled: true,
					format: '{point.y} %'
				};
			} else {
				seriesOptions.dataLabels = {
					enabled: true
				};
			}
		}

		chart.addSeries(seriesOptions, false);

		if (errorSeries){
			chart.addSeries({
				name: sName + " +/-standard deviation",
				type: 'errorbar',
				data: errorSeries
			}, false);
		}
	}

	function average(data){
		var sum = data.reduce(function(a, b){
			return a + b;
		}, 0);

		var avg = sum / data.length;

		return avg;
	}

	function standardDeviation(values, avg){
		var squareDiffs = values.map(function(value){
			var diff = value - avg;
			var sqrDiff = diff * diff;
			return sqrDiff;
		});

		var avgSquareDiff = average(squareDiffs);

		var stdDev = Math.sqrt(avgSquareDiff);
		return stdDev;
	}

	return {
		chartOptions: chartOptions,
		standardDeviation: standardDeviation,
		average: average,
		columnChartOptions: columnChartOptions,
		columnChartFloat: columnChartFloat,
		scatterChart: scatterChart,
		addSeriesToColumn: addSeriesToColumn
	};
});
