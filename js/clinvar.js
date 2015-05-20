/*global module: false, require: false */
'use strict';

var height = 12;
var d3 = require('d3');
var _ = require('underscore');
var annotation = require('./annotation');

// 2,3 -> benign, likely benign
// 4,5 -> likely pathogenic, pathogenic
// 6,7 -> drug response, histocompatibility
// 0, 255 -> uncertain, other

// Make multiple passes over the categorical data, drawing
// lest to most significant, so the latter is emphasized.

var fields = {
	CLNSIG: {
		color: d3.scale.ordinal().domain(['2', '3', '4', '5', '6', '7'])
			.range(['blue', 'lightblue', 'lightred', 'red', 'orange', 'orange']),
		order: ['6', '7', '3', '2', '4', '5'],
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

function draw(ann, vg, clinvar, chromPosToX) {
	var field = 'CLNSIG';
	var {order, color} = fields[field];
	var variantsVals = mergeMax(pickField(clinvar, field), field);
	_.each(order, val => {
		_.each(_.filter(variantsVals, vf => vf.max === val), v => {
			var {start, end} = chromPosToX(v);
			if (start >= 0 && end >= 0) {
				if (val === "2" || val === "3") {
					vg.translate(start, 0,
						() => vg.box(0, 0, end - start, height / 2, color(val)));
				} else {
					vg.translate(start, 0,
						() => vg.box(0, height / 2, end - start, height / 2, color(val)));
				}
			}
		});
	});
}

annotation.draw.add('clinvar', draw);

// height has to match sheetWrap. Maybe move this to sheetWrap? Then it's not
// portable to dev branch.
module.exports = {
    height: height,
	draw: draw
};
