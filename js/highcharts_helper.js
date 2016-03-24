/*eslint strict: [2, "function"], camelcase: 0 */
/*global define: true*/
define(['./highcharts'], function () {
  'use strict';

  function hcLabelRender(){
	/*jshint -W040 */ // Due to the way highcharts is configured.
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
      align: 'right',
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
    tooltip:{
      hideDelay: 0
    },
    credits: {
      enabled: false
    },
  };

  function columnChartOptions (chartOptions, categories, chartCategoryLabels, xAxisTitle, Y, yIsCategorical, showLegend){
     // Y data column chart setup
    var yAxisTitle;
    if (yIsCategorical){
      yAxisTitle = "Percentage distribution";
    } else{
      yAxisTitle = "Average value";
    }

    chartOptions.legend.align = 'right';
    chartOptions.legend.verticalAlign = 'middle';
    chartOptions.legend.layout = 'vertical';
    chartOptions.legend.title.style = {
      width: "100px",
      fontStyle: 'italic'
    };
    if (showLegend) {
      chartOptions.legend.title.text = Y + '<br/><span style="font-size: 9px; color: #666; font-weight: normal">(Click to hide)</span>';
    }
    else {
      chartOptions.legend.title = {};
    }

    var Y_in_Title = Y.length > 50 ? Y.slice(0, 50) + "..." : Y;
    chartOptions.title = {
      text: yAxisTitle + " of " + Y_in_Title + ((xAxisTitle === "") ? "" : " by " + xAxisTitle)
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
      labels: {
        formatter: function(){
          return chartCategoryLabels[this.value];
        }
      },
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
    if (yIsCategorical) {
      if (xAxisTitle === ""){
        chartOptions.tooltip = {
          formatter: function () {
            return Y + ' ' + categories[this.point.x] + ': <b>' + this.point.y + '%</b>';
          },
          hideDelay: 0
        };
      } else {
        chartOptions.tooltip = {
          headerFormat: xAxisTitle + ' = {point.key}<br>',
          pointFormat: Y + ' {series.name}: <b>{point.y}%</b>',
          hideDelay: 0
        };
      }
    } else {
      chartOptions.tooltip = {
        hideDelay: 0
      };
    }

    if (categories.length > 15){
      chartOptions.xAxis.labels = {
        rotation: -90
      };
    }
    if (yIsCategorical){
      chartOptions.yAxis.labels = {
        format: '{value} %'
      };
    }
    return chartOptions;
  }

  // x categorical y float
 function columnChartFloat (chartOptions, categories, xAxisTitle, Y){
     // Y data column chart setup
    var yAxisTitle = Y;// "Average value";

    chartOptions.legend.align = 'right';
    chartOptions.legend.margin = 5;
    chartOptions.legend.title.text = Y + '<br/><span style="font-size: 9px; color: #666; font-weight: normal">(Click to hide)</span>';

    var Y_in_Title = Y.length > 50 ? Y.slice(0, 50) + "..." : Y;
    chartOptions.title = {
      text: Y_in_Title + ((xAxisTitle === "") ? "" : " by " + xAxisTitle)
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
      minRange: -1
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

    if (categories.length > 15){
      chartOptions.xAxis.labels = {
        rotation: -90
      };
    }

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
    addSeriesToColumn: addSeriesToColumn
  };
});
