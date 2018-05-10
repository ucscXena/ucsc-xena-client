'use strict';

// ad hoc reversible state transforms that make it more compressable.

var _ = require('./underscore_ext');
var arrays = require('./arrays');

var to32BinStr = arr => arrays.ab2str(Uint32Array.from(arr).buffer);
var from32BinStr = str => Array.from(new Uint32Array(arrays.str2ab(str)));
var to16BinStr = arr => arrays.ab2str(Uint16Array.from(arr).buffer);
var from16BinStr = str => Array.from(new Uint16Array(arrays.str2ab(str)));

// Store segmented data as columns, and encode into binary strings.
//
// We tag the encoding (not the fieldType) so if we switch to a different
// encoding (e.g. 'binarySegmented2'), we can still decode old bookmarks
// and sessionStorage. Also, this way we don't assume the data is encoded,
// so we work with existing bookmarks and state.
//
// We should preserve all keys except req.rows.
var segmentedToBinary = data =>
	_.updateIn(data, ['req', 'rows'], rows => ({
		encoding: 'binarySegmented',
		sample: to16BinStr(_.pluck(rows, 'sample')),
		start: to32BinStr(_.pluck(rows, 'start')),
		end: to32BinStr(_.pluck(rows, 'end')),
		value: _.pluck(rows, 'value'),
}));

var encodings = {
	segmented: segmentedToBinary
};
var encode = (type, data) => (encodings[type] || _.identity)(data);

var segmentedFromBinary = data =>
	_.updateIn(data, ['req', 'rows'], rows =>
		_.mmap(
			from16BinStr(rows.sample),
			from32BinStr(rows.start),
			from32BinStr(rows.end),
			rows.value,
			(sample, start, end, value) => ({sample, start, end, value})));

var decodings = {
	binarySegmented: segmentedFromBinary
};
var decode = data => (decodings[_.getIn(data, ['req', 'rows', 'encoding'])] || _.identity)(data);


var compactState = state =>
	state.spreadsheet ?  _.updateIn(state, ['spreadsheet', 'data'], data =>
							_.fmap(data, (colData, uuid) => encode(
									_.getIn(state, ['columns', uuid, 'fieldType']), colData))) :
	state;

var expandState = state =>
	state.spreadsheet ?  _.updateIn(state, ['spreadsheet', 'data'], data =>
							_.fmap(data, decode)) :
	state;

module.exports = {
	compactState,
	expandState
};
