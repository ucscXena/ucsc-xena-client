// Loading shim for highcharts

'use strict';
window.jQuery = require('jquery');

var charts = require('exports?Highcharts,HighchartsAdapter=window.HighchartsAdapter!highcharts/highcharts');
require('highcharts/highcharts-more');

delete window.jQuery;
delete window.Highcharts;

module.exports = charts;
