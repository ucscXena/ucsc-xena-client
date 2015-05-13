/*global module: false, require: false */
'use strict';

var height = 12;
var d3 = require('d3');
var _ = require('underscore');

// Make multiple passes over the categorical data, drawing
// lowest to highest, so higher values? The values don't go in
// order. Need per-data type ordering.

var fields = {
	CLNSIG: {
		color: d3.scale.category10(),
		order: ['255', '0', '1', '2', '3', '4', '5', '6', '7'],
		parse: i => i[0].split(/[|,]/)
	}
};

// max field value, by field.order
function fieldMax(field, {info}) {
	var {order} = fields[field];
	var index = _.object(order, _.range(order.length));
	return _.max(info, f => index[f]);
}

var mergeMax = (vs, field) => _.map(vs, v => _.assoc(v, 'max', fieldMax(field, v)));

function variantPickField(field, {info, ...v}) {
	var {parse} = fields[field];
	return _.assoc(v, 'info', parse(info[field]));
}

var pickField = (vs, field) => _.map(vs, v => variantPickField(field, v));

function draw(vg, clinvar, chromPosToX) {
	var field = 'CLNSIG';
	var {order, color} = fields[field];
	var variantsVals = mergeMax(pickField(clinvar, field), field);
	_.each(order, val => {
		_.each(_.filter(variantsVals, vf => vf.max === val), v => {
			var {start, end} = chromPosToX(v);
			if (start >= 0 && end >= 0) {
				vg.translate(start, 0,
					() => vg.box(0, 0, end - start, height, color(val)));
			}
		});
	});
}

// height has to match sheetWrap. Maybe move this to sheetWrap? Then it's not
// portable to dev branch.
module.exports = {
    height: height,
	draw: draw
};
