/*global module: false, require: false */
'use strict';

var d3 = require('d3');
var _ = require('underscore');
var annotation = require('./annotation');
var {drawFloatBands} = require('./annotationPlot');

//var color = d3.scale.log().domain([1e-50,1]).range(['#FFFFFF', '#FF0000']);

var fields ={
  AFR_AF: {
    color: d3.scale.linear().domain([0, 0.05, 0.5]).range(['white', 'black','#FF0000'])
  },
  AMR_AF: {
    color: d3.scale.linear().domain([0, 0.05, 0.5]).range(['white', 'black','#FF0000'])
  },
  EAS_AF: {
    color: d3.scale.linear().domain([0, 0.05, 0.5]).range(['white', 'black','#FF0000'])
  },
  EUR_AF: {
    color: d3.scale.linear().domain([0, 0.05, 0.5]).range(['white', 'black','#FF0000'])
  },
  SAS_AF: {
    color: d3.scale.linear().domain([0, 0.05, 0.5]).range(['white', 'black','#FF0000'])
  }
};

var getVal = (field, v) =>
    ({start: v.start, end: v.end, val: v.info[field][0]});

function draw([__, {height, field}], vg, data, chromPosToX) {
	var variantsVals = _.map(data, v => getVal(field, v));
    drawFloatBands(vg, [variantsVals], fields[field].color, chromPosToX, variantsVals);
}

annotation.draw.add('1000_genomes', draw);

module.exports = {
	draw: draw
};
