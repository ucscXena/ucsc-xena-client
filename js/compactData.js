
// ad hoc reversible state transforms that make it more compressable.
// Also handles serialization of binary objects, and conversion of plain
// js to binary objects.

var _ = require('./underscore_ext').default;
var arrays = require('./arrays');
import {hfcSync, hfcCompress} from './hfc';

var to32BinStr = arr => arrays.ab2str(Uint32Array.from(arr).buffer);
var from32BinStr = str => Array.from(new Uint32Array(arrays.str2ab(str)));
var to16BinStr = arr => arrays.ab2str(Uint16Array.from(arr).buffer);
var from16BinStr = str => Array.from(new Uint16Array(arrays.str2ab(str)));

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

var compactSamples = state =>
	_.updateIn(state, ['spreadsheet', 'cohortSamples'],
		s => ({buffer: arrays.ab2str(s.proxied.buffer),
			hasPrivateSamples: s.hasPrivateSamples}),
		['spreadsheet', 'data', 'samples'], data => _.dissoc(data, 'codes'));

var compactState = state =>
	_.get(state.spreadsheet, 'cohortSamples') ?
		compactSamples(compactSurvival(compactData(state))) : state;

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

// XXX spreadsheet.cohort.sampleFilter -> boolean
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

var sortData = state =>
	_.Let(({spreadsheet: {cohortSamples, data}} = state,
			idxs = _.range(cohortSamples.length).sort(cmp(cohortSamples)),
			sorted = idxs.map(i => cohortSamples[i]),
			sortedData = _.fmap(data, sortColumn(idxs)),
			sortedSurvival = sortSurvival(state, idxs)) =>
		_.assocIn(state, ['spreadsheet', 'cohortSamples'], sorted,
			['spreadsheet', 'data'], sortedData,
			['spreadsheet', 'survival'], sortedSurvival));

var reorderSamples = state =>
	_.Let(({spreadsheet: {cohortSamples}} = state) =>
		_.isArray(cohortSamples) ? sortData(state) : state);

var createSamples = (Module, samples, hasPrivateSamples) =>
	_.isArray(samples) ? hfcSync(Module, hfcCompress(Module, samples),
		hasPrivateSamples) :
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

// If there is a sample list instantiate an hfc to represent it. Can be
// a compressed binary blob or a plain js array.
var expandSamples = (Module, state) =>
	_.Let(({cohortSamples} = state.spreadsheet) =>
		!cohortSamples ? state :
		// XXX drop old spreadsheet.hasPrivateSamples?
		_.Let((samples = createSamples(Module, cohortSamples,
			state.spreadsheet.hasPrivateSamples)) => setSamples(state, samples)));

var expandState = (Module, state) =>
	state.spreadsheet ?
		expandSamples(Module, reorderSamples(expandSurvival(expandData(state)))) :
		state;

module.exports = {
	compactState,
	expandState
};
