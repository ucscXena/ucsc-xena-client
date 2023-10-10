/*global describe: false, it: false, require: false */
var assert = require('assert');
var _ = require('../js/underscore_ext').default;

var {tallyDomains, regionColor} = require('../js/drawHeatmap');
var {colorScale} = require('../js/colorScales');
import {regionColorLinearTest, tallyDomains as tallyDomainsWasm} from '../js/xenaWasm';

var colsToObjs = ({sum, count}) =>
	// XXX some weirdness with mmap requires js arrays, not typed arrays
	_.mmap([...sum], [...count], (sum, count) => ({sum, count}));

describe('drawHeatmap', function () {
	describe('#tallyDomains', function () {
		it('should tally slice', function() {
			var d = [1, 1, 1, 5, 5, 7],
			order = [0, 1, 2, 3, 4, 5],
			start = 0,
			end = d.length,
			domains = [0, 3, 6],
			tally = tallyDomains(d, start, end, domains),
			tallyWasm = colsToObjs(tallyDomainsWasm(d, order, start, end, domains));

		assert.deepEqual([
			{count: 0, sum: 0},
			{count: 3, sum: 3},
			{count: 2, sum: 10},
			{count: 1, sum: 7}],
			tally);
		assert.deepEqual(tally, tallyWasm);
		tally = tallyDomains(d, start + 1, end - 1, domains);
		tallyWasm = colsToObjs(tallyDomainsWasm(d, order, start + 1, end - 1, domains));
		assert.deepEqual([
			{count: 0, sum: 0},
			{count: 2, sum: 2},
			{count: 2, sum: 10},
			{count: 0, sum: 0}],
			tally);
		assert.deepEqual(tally, tallyWasm);
		});
	});
	var rgbArray = rgb => [rgb & 0xff, (rgb >> 8) & 0xff, (rgb >> 16) & 0xff];
	describe('#regionColor', function () {
		it('should color by first stop', function() {
			var domain = [0, 1],
				range = [[0, 255, 0], [255, 0, 0]],
				data = [0, 0, 0, 0],
				order = [0, 1, 2, 3],
				start = 0,
				end = data.length,
				color = regionColorLinearTest(domain, range, data, order, start, end);

			var [r, g, b] = rgbArray(color);
			assert(r === 0);
			assert(g === 255);
			assert(b === 0);
		});
		it('should color by second stop', function() {
			var domain = [0, 1],
				range = [[0, 255, 0], [255, 0, 0]],
				data = [1, 1, 1, 1],
				order = [0, 1, 2, 3],
				start = 0,
				end = data.length,
				color = regionColorLinearTest(domain, range, data, order, start, end);

			var [r, g, b] = rgbArray(color);
			assert(r === 255);
			assert(g === 0);
			assert(b === 0);
		});
		it('should reflect zoom', function() {
			var domain = [0, 1],
				range = [[0, 255, 0], [255, 0, 0]],
				data = [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
				order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
				start = 3,
				end = 7,
				color = regionColorLinearTest(domain, range, data, order, start, end);

			var [r, g, b] = rgbArray(color);
			assert(r === 255);
			assert(g === 0);
			assert(b === 0);
		});
		it('should blend', function() {
			var domain = [0, 1],
				range = [[0, 255, 0], [255, 0, 0]],
				data = [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
				order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
				start = 0,
				end = 6,
				color = regionColorLinearTest(domain, range, data, order, start, end),
				fp = colorScale(['float-pos', ...range, ...domain]),
				color2 = regionColor('genomic', fp, data, start, end);

			var [r, g, b] = rgbArray(color);
			assert(r === 180);
			assert(g === 180);
			assert(b === 0);
			assert.deepEqual(rgbArray(color), color2);
		});
	});
});
