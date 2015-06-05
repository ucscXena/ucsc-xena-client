/*global module: false, require: false */
'use strict';

var d3 = require('d3');
var _ = require('underscore');
var annotation = require('./annotation');
var {drawBands} = require('./annotationPlot');
var intervalTree = require('static-interval-tree');


// Make multiple passes over the categorical data, drawing
// lest to most significant, so the latter is emphasized.

var index = o => _.object(o, _.range(o.length));
var fields = {
    // 2,3 -> benign, likely benign
    // 4,5 -> likely pathogenic, pathogenic
    // 6,7 -> drug response, histocompatibility
    // 0, 255 -> uncertain, other
	CLNSIG: {
		color: d3.scale.ordinal().domain(['2', '3', '4', '5', '6', '7'])
			.range(['blue', 'lightblue', '#FC9B9B', 'red', 'orange', 'orange']),
		order: index(['6', '7', '3', '2', '4', '5']),
		groups: [['3', '2'], ['6', '7', '4', '5']],
		parse: i => i[0].split(/[|,-]/)
	},

  // 1, 3 => germ line
  // 2, 3 => somatic
  CLNORIGIN: {
  	color: d3.scale.ordinal().domain(['1', '2', '3'])
  		.range(['blue', 'red', 'purple']),
    order: index(['1', '2', '3']),
    groups: [['1', '3'], ['2', '3']],
  	parse: i => i[0].split(/[|,-]/)
  },

  //"1-Notpathogenicorofnoclinicalsignificance",
  //"2-Likelynotpathogenicoroflittleclinicalsignificance",
  //"3-Uncertain",
  //"4-Likelypathogenic",
  //"5-Definitelypathogenic",
  iarc_class: {
    color: d3.scale.ordinal().domain(['1', '2','3','4','5'])
      .range(['blue', 'lightblue', 'black', 'lightred', 'red']),
    order: index(['3','2','1','4','5']),
    groups: [['1', '2','3'], ['3','4','5']],
    parse: i => i[0].split(/[|,-]/)
  }
};

// max field value, by field.order
function fieldMax(field, {info}) {
	var {order, parse} = fields[field];
	return _.max(parse(info[field]), f => order[f]);
}

var getVal = (field, v) =>
    ({start: v.start, end: v.end, val: fieldMax(field, v)});

function draw([__, {height, field}], vg, data, layout) {
	var {groups, color} = fields[field];
	var variantsVals = _.map(data, v => getVal(field, v));
	var indx = intervalTree.index(variantsVals);
	vg.box(0, 0, vg.width(), vg.height(), 'white');
    drawBands(vg, groups, color, layout, indx);
}

annotation.draw.add('clinvar', draw);

module.exports = {
	draw: draw
};
