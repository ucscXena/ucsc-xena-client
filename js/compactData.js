
// ad hoc reversible state transforms that make it more compressable.
// Also handles serialization of binary objects, and conversion of plain
// js to binary objects (in the case of migrating from old schema).

var _ = require('./underscore_ext').default;
var arrays = require('./arrays');
import {hfcSync, hfcCompress} from './hfc';
var wasm = require('ucsc-xena-wasm');
import {listToBitmap} from './models/bitmap';
var Rx = require('./rx').default;

var {Observable: {from, of, zipArray}} = Rx;


var to32BinStr = arr => arrays.ab2str(Uint32Array.from(arr).buffer);
var from32BinStr = str => Array.from(new Uint32Array(arrays.str2ab(str)));
var to16BinStr = arr => arrays.ab2str(Uint16Array.from(arr).buffer);
var from16BinStr = str => Array.from(new Uint16Array(arrays.str2ab(str)));

// ab2str requires even byte count, so amend the length if necessary.
var even = arr => arr.length % 2 === 0 ? arr : Uint8Array.from([...Array.from(arr), 0]);

// Note these returned typed arrays, while the above return js arrays. The
// above are for sparse data types which we don't hold in state as typed.
// The below are for serializing typed data introduced with the singlecell
// support.
var to8BinStr = arr => ({encoding: 'Uint8Array', length: arr.length, str: arrays.ab2str(even(arr).buffer)});
var from8BinStr = ({length, str}) => new Uint8Array(arrays.str2ab(str))
	.slice(0, length);
var float32To32BinStr = arr => arrays.ab2str(arr.buffer);
var float32From32BinStr = str => new Float32Array(arrays.str2ab(str));

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
		// XXX this is going to break over 64k samples
		sample: to16BinStr(_.pluck(rows, 'sample')),
		start: to32BinStr(_.pluck(rows, 'start')),
		end: to32BinStr(_.pluck(rows, 'end')),
		value: _.pluck(rows, 'value')
}));

var denseToBinary = data =>
	_.updateIn(data, ['req'], req =>
		req && _.merge(req, {values: req.values.map(float32To32BinStr), encoding: 'binaryDense'}));

var encodings = {
	segmented: segmentedToBinary,
	probes: denseToBinary,
	geneProbes: denseToBinary,
	genes: denseToBinary,
	clinical: denseToBinary
};

var encode = (type, data) => (encodings[type] || _.identity)(data);

var segmentedFromBinary = data =>
	_.updateIn(data, ['req', 'rows'], rows =>
		_.mmap(
			from16BinStr(rows.sample), // XXX 64k rows only
			from32BinStr(rows.start),
			from32BinStr(rows.end),
			rows.value,
			(sample, start, end, value) => ({sample, start, end, value})));

var denseFromBinary = data =>
	_.updateIn(data, ['req'], ({values, encoding, ...rest}) => //eslint-disable-line no-unused-vars
		({values: values.map(float32From32BinStr), ...rest}));

var denseFromJS = data =>
	_.updateIn(data, ['req'], ({values, ...rest}) =>
		({values: values.map(v => new Float32Array(v.map(v => v == null ? NaN : v))),
		  ...rest}));

var decodings = {
	binarySegmented: segmentedFromBinary,
	binaryDense: denseFromBinary,
	plainJS: denseFromJS
};

var colType = (state, uuid) =>
	_.getIn(state, ['spreadsheet', 'columns', uuid, 'fieldType']);

// It's unfortunate that 'encoding' was put in req.rows, but preserving it
// here. Maybe write a migration, instead, to clean this up.
// Also detects plain js that should be binary.
var getEncoding = (data, type) => _.getIn(data, ['req', 'rows', 'encoding']) ||
	_.getIn(data, ['req', 'encoding']) ||
	encodings[type] === denseToBinary && 'plainJS';

var decode = (type, data) =>
	(decodings[getEncoding(data, type)] || _.identity)(data);

var survivalPath = ['spreadsheet', 'survival'];

var compactSurvival = state =>
	_.getIn(state, survivalPath) ?
		_.updateIn(state, survivalPath, survival =>
			_.fmap(survival, ({field, data}) => ({
				field,
				data: encode(field.fieldType, data)
			}))) :
		state;

var compactData = state =>
	_.updateIn(state, ['spreadsheet', 'data'], data =>
			_.fmap(data, (colData, uuid) => encode(colType(state, uuid), colData)));

var compactSubgroupSamples = state =>
	_.updateIn(state, ['spreadsheet', 'columns'],
		columns => _.fmap(columns, col =>
			_.getIn(col, ['signature', 0]) === 'cross' ?
				_.updateIn(col, ['signature', 1],
					s => ({encoding: 'hfc', buffer: arrays.ab2str(s.proxied.buffer)}),
					['signature', 2],
					matches => matches.map(to8BinStr)) :
				col));

var compactSamples = state =>
	_.updateIn(state, ['spreadsheet', 'cohortSamples'],
		s => ({encoding: 'hfc', buffer: arrays.ab2str(s.proxied.buffer),
			hasPrivateSamples: s.hasPrivateSamples}),
		['spreadsheet', 'data', 'samples'], data => _.dissoc(data, 'codes'));

var compactState = state =>
	_.get(state.spreadsheet, 'cohortSamples') ?
		compactSubgroupSamples(compactSamples(compactSurvival(compactData(state)))) :
		state;

var expandSurvival = state =>
	_.getIn(state, survivalPath) ?
		_.updateIn(state, survivalPath, survival =>
			_.fmap(survival, ({field, data}) => ({
				field,
				data: decode(field.fieldType, data)
			}))) :
		state;

var expandData = state =>
	_.updateIn(state, ['spreadsheet', 'data'], data =>
		_.fmap(data, (colData, uuid) => decode(colType(state, uuid), colData)));

var sortSparse = (order, data) =>
	_.updateIn(data, ['req', 'rows'],
			rows => rows.map(row => _.assoc(row, 'sample', order[row.sample])),
		['req', 'samplesInResp'], sIR => sIR.map(i => order[i]));

var sortDense = (order, data) =>
	_.Let((norder = new Float32Array(order)) =>
		_.updateIn(data, ['req', 'values'], values =>
			values.map(subcol => norder.map(i => subcol[i]))));

var sortColumn = order => (data, key) =>
	key === 'samples' ? data :
	// This is an ad hoc check for sparse vs. dense
	_.getIn(data, ['req', 'rows']) ? sortSparse(_.invert(order), data) :
	sortDense(order, data);

var cmp = arr => (i, j) => arr[i] < arr[j] ? -1 : arr[i] > arr[j] ? 1 : 0;

var sortSurvival = (state, order) =>
	_.Let((survival = _.getIn(state, survivalPath)) =>
		survival && _.fmap(survival, ({field, data}) => ({
			field,
			data: sortColumn(order)(data)
		})));

// In old state the data is not in compressed (sorted) order, so
// we reorder it here. Also apply an ad hoc migration of sampleFilter
// to a boolean.
var sortData = state =>
	_.Let(({spreadsheet: {cohortSamples, data, cohort: {sampleFilter}}} = state,
			idxs = _.range(cohortSamples.length).sort(cmp(cohortSamples)),
			sorted = idxs.map(i => cohortSamples[i]),
			sortedData = _.fmap(data, sortColumn(idxs)),
			sortedSurvival = sortSurvival(state, idxs)) =>
		_.assocIn(state, ['spreadsheet', 'cohortSamples'], sorted,
			['spreadsheet', 'data'], sortedData,
			['spreadsheet', 'survival'], sortedSurvival,
			['spreadsheet', 'cohort', 'sampleFilter'], !!sampleFilter));

var reorderSamples = state =>
	_.Let(({spreadsheet: {cohortSamples}} = state) =>
		_.isArray(cohortSamples) ? sortData(state) : state);

// XXX doesn't recover memory after compressing from an array.
// Would need to create another wasm to do this, and make this
// code path async.
var hfcFromArray = (Module, samples, hasPrivateSamples) =>
	hfcSync(Module, hfcCompress(Module, samples), hasPrivateSamples);

var createHfc = (Module, samples, hasPrivateSamples) =>
	_.isArray(samples) ? hfcFromArray(Module, samples, hasPrivateSamples) :
	hfcSync(Module, new Uint8Array(arrays.str2ab(samples.buffer)),
		samples.hasPrivateSamples);

// Would normally use assocInAll here, however the equality check
// of samples proxy with cohortSamples returns true, which defeats
// the assignment in ehmutable.
var setSamples = (state, samples) =>
	_.merge(state, {
		spreadsheet: _.merge(state.spreadsheet, {
			cohortSamples: samples,
			data: _.merge(state.spreadsheet.data, {
				samples: _.merge(state.spreadsheet.data.samples, {codes: samples})
			})
		})
	});

var findHfc = state =>
	_.Let((columns = _.getIn(state, ['spreadsheet', 'columns'], {})) =>
		Object.keys(columns).filter(k => _.getIn(columns, [k, 'signature', 0]) === 'cross'));

var expandCross = (Module, cross) =>
	_.Let(([, samples, matches, exprs] = cross) =>
		['cross', createHfc(Module, samples, false), matches.map(from8BinStr), exprs]);

// migrate old cross signatures to hfc & bitmaps
var migrateCross = (Module, cross) =>
	_.Let(([, matches, exprs] = cross,
		union = _.union(...matches).sort(),
		bitmaps = matches.map(list =>
			_.Let((s = new Set(list)) =>
				listToBitmap(union.length,
					_.filterIndices(union, sample => s.has(sample)))))) =>
	['cross', hfcFromArray(Module, union, false), bitmaps, exprs]);


var expandMigrateCross = (Module, cross) =>
	(cross.length === 4 ? expandCross : migrateCross)(Module, cross);

var expandSubgroupSamples = state =>
	_.Let((columns = findHfc(state)) =>
		zipArray(columns.map(() => from(wasm())))
			.map(Modules => Modules.reduce((state, Module, i) =>
				_.updateIn(state, ['spreadsheet', 'columns', columns[i], 'signature'],
					cross => expandMigrateCross(Module, cross)), state)));

// If there is a sample list instantiate an hfc to represent it. Can be
// a compressed binary blob or a plain js array.
var expandSamples = state =>
	_.Let(({cohortSamples} = state.spreadsheet) =>
		!cohortSamples ? of(state) :
		from(wasm()).map(Module =>
			_.Let((samples = createHfc(Module, cohortSamples,
				state.spreadsheet.hasPrivateSamples)) => setSamples(state, samples)))
		.flatMap(expandSubgroupSamples));

var expandState = state =>
	state.spreadsheet ?
		expandSamples(reorderSamples(expandSurvival(expandData(state)))) :
		of(state);

module.exports = {
	compactState,
	expandState
};
