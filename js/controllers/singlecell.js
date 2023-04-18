import query from './query';
import {make, mount, compose} from './utils';
var fetch = require('../fieldFetch');
var {samplesQuery} = require('./common');
var {fetchDefaultStudy, datasetList, datasetMetadata, donorFields} = require('../xenaQuery');
var {assoc, assocIn, constant, get, getIn, identity, Let, merge, maxnull, minnull, mmap, object, pairs, pick, updateIn, values} = require('../underscore_ext').default;
var {userServers} = require('./common');
var Rx = require('../rx').default;
var {of} = Rx.Observable;
import {datasetCohort, hasDatasource, hasDonor} from '../models/map';
import {colorSpec} from '../heatmapColors';
import {scaleParams} from '../colorScales';
var widgets = require('../columnWidgets');

var fetchMethods = {
	// XXX add error handling with catch()
	defaultStudy: () => fetchDefaultStudy,

	// XXX error checking on if m exists?
	datasetMetadata: (host, dataset) => datasetMetadata(host, dataset).map(m => m[0]),
	cohortDatasets: (cohort, server) =>
		datasetList(server, [cohort]).catch(() => of([])),
	donorFields: (cohort, server) => donorFields(server, cohort)
};

var cachePolicy = {
	defaultStudy: identity,
	datasetMetadata: identity,
	cohortDatasets: identity, // XXX fix this!
	donorFields: identity, // XXX fix this!
	// ['cohortDatasets', cohort, server]
	// ['donorFields', cohort, server]
	// limit cache to one cohort
	default: (state, path) =>
		updateIn(state, ['singlecell', path[0]], item => pick(item, path[1]))
};


var cohortList = state => getIn(state, ['singlecell', 'defaultStudy', 'studyList'])
	.map(study => study.cohortList || []).flat();


var allDatasets = state =>
	Let((list = cohortList(state)) =>
		list.map(({preferredDataset = []}) => preferredDataset.map(ds => ['datasetMetadata', ds.host, ds.name])).flat());

var studyById = state => id =>
		getIn(state, ['singlecell', 'defaultStudy', 'studyList'], [])
			.find(s => s.study === id);

var userStudyId = state => getIn(state, ['singlecell', 'integration']);
var userStudy = state => studyById(state)(userStudyId(state));

var studyCohorts = study => get(study, 'cohortList', []);
var subStudies = (state, study) => get(study, 'subStudy', []).map(ref =>
	studyById(state)(ref.studyID));

export var allCohorts = state =>
		Let((st = userStudy(state)) =>
			studyCohorts(st).concat(...subStudies(state, st).map(studyCohorts)));

var singlecellData = state =>
	state.page !== 'singlecell' ? [] :
		[['defaultStudy'],
			...(getIn(state, ['singlecell', 'defaultStudy']) ?
				allDatasets(state) : []),
			...(userStudyId(state) ?
				Let((cohorts = allCohorts(state)) =>
					userServers(state.spreadsheet)
					.map(server =>
						cohorts.map(cohort =>
							[['cohortDatasets', cohort.cohort, server],
								['donorFields', cohort.cohort, server]]).flat())
					.flat()) :
				[]),
		];

// XXX implement invalidatePath
var {controller: fetchController/*, invalidatePath*/} =
	query(fetchMethods, singlecellData, cachePolicy, 'singlecell');

// XXX duplicated in common.js
var probeFieldSpec = ({dsID, name}) => ({
	dsID,
	fetchType: 'xena', // maybe take from dataset meta instead of hard-coded
	valueType: 'float',
	fieldType: 'probes',
	colorClass: 'clinical',
	fields: [name]
});

var codedFieldSpec = ({dsID, name}) => ({
	dsID,
	fetchType: 'xena', // maybe take from dataset meta instead of hard-coded
	valueType: 'coded',
	fieldType: 'clinical',
	colorClass: 'clinical',
	fields: [name]
});

function fetchMap(state, dims, samples) {
	var [dsID] = state.dataset,
		queries = dims.map(name => fetch(probeFieldSpec({dsID, name}),
			samples.samples));

	return Rx.Observable.zipArray(queries);
}

var toDsID = (host, name) => JSON.stringify({host, name});
var noop = () => {};
var colorMode = {
	dataset: (serverBus, state) => {
		var [host, name] = hasDatasource(state, datasetCohort(state)),
			field = codedFieldSpec({dsID: toDsID(host, name), name: '_DATASOURCE'});
		serverBus.next(['singlecell-color-field',
			fetch(field, state.samples.samples), field]);
	},
	donor: (serverBus, state) => {
		var [host, name] = hasDonor(state, datasetCohort(state)),
			field = codedFieldSpec({dsID: toDsID(host, name), name: '_DONOR'});
		serverBus.next(['singlecell-color-field',
			fetch(field, state.samples.samples), field]);
	},
	type: noop,
	prob: noop,
	gene: noop,
	undefined: noop
};

var setMapLoading = state => Let(([dsID, {dimension}] = state.dataset) =>
	updateIn(state, ['data', dsID], data =>
		dimension.filter(dim => getIn(data, [dim, 'status']) !== 'loaded')
		.reduce((data, dim) => assocIn(data, [dim, 'status'], 'loading'),
			data)));

// append 'singlecell-' to actions, so we don't have any aliasing with
// other controllers.
var actionPrefix = actions =>
	object(pairs(actions).map(([k, v]) => ['singlecell-' + k, v]));

var spreadsheetControls = actionPrefix({
	'dataset-post!': (serverBus, state, newState) => {
		// XXX this needs to pull cohorts from the study
		// Or do we wait until a dataset is selected?
		var {singlecell} = newState,
			[dsID, params] = singlecell.dataset,
			dims = params.dimension.filter(dim => getIn(singlecell,
				['data', dsID, dim, 'status']) !== 'loaded');
		serverBus.next(['singlecell-map-data',
			// take(1) because samplesQuery can throw an error if one host is down.
			// XXX Does this create a race? Maybe need a catch here?
			samplesQuery(userServers(newState.spreadsheet), {name: datasetCohort(singlecell)}, Infinity)
				.take(1).concatMap(samples => fetchMap(singlecell, dims, samples)
					.map(data => [samples, data])), dsID, dims]);
	}
});

var setAvg = (data, field) => merge(data, widgets.avg(field, data));
var colorDataset = state => state.colorBy.mode === 'gene' ?
	state.datasetMetadata[state.gene.host][state.gene.name] : {};
var colorScale = (state, data, field) =>
	Let((dataset = colorDataset(state)) =>
		colorSpec(merge(field, {defaultNormalization: dataset.colnormalization}),
				{}, data.codes,
				{values: data.req.values[0], mean: data.avg.mean[0]}));
var scaleBounds = (data, scale) =>
	Let((d = data.req.values[0], min = minnull(d), max = maxnull(d),
			params = scaleParams(scale)) =>
		({min: Math.min(...params, min), max: Math.max(...params, max)}));

var nvolume = (mins, maxs) => mmap(mins, maxs, (min, max) => max - min)
			.reduce((x, y) => x * y);

var pickRadius = (mins, maxs, len, pct = 0.2) =>
	Let((areaPerPoint = pct * nvolume(mins, maxs) / len) =>
		Math.pow(areaPerPoint, 1 / mins.length) / 2);

var allCols = data => values(data).map(c => getIn(c, ['req', 'values', 0]));
var setRadius = state =>
	Let((dsID = getIn(state.dataset, [0]), data = allCols(getIn(state, ['data', dsID])),
		mins = data.map(minnull), maxs = data.map(maxnull),
		radius = pickRadius(mins, maxs, data[0].length)) =>
			assoc(state, ['radiusBase'], radius, ['radius'], radius));

var controls = actionPrefix({
	enter: state => assoc(state, 'enter', 'true'),
	integration: (state, cohort) => assoc(state, 'integration', cohort),
	layout: (state, layout) => assoc(state, 'layout', layout),
	dataset: (state, dataset) => setMapLoading(assoc(state, 'dataset', dataset, 'colorBy', undefined)),
	gene: (state, gene) => assoc(state, 'gene', gene),
	'gene-post!': (serverBus, state, newState) => {
		// XXX Should we assume this is a probe dataset, vs. a gene
		// dataset?
		var {host, name, gene} = newState.gene,
			field = probeFieldSpec({dsID: toDsID(host, name), name: gene});
		// XXX Should we use models/column.js to populate column fields, vs.
		// shimming it in various places? It's more general, but not sure if
		// we need it.
		serverBus.next(['singlecell-color-field',
			fetch(field, newState.samples.samples), field]);
	},
	'reset': state => assoc(state, 'layout', undefined, 'dataset', undefined, 'integration', undefined, 'gene', undefined, 'colorBy', undefined),
	'color-mode': (state, mode) =>
		assocIn(state, ['colorBy', 'mode'], mode, ['colorBy', 'field'], undefined, ['gene'], undefined),
	'color-mode-post!': (serverBus, state, newState, mode) => {
		colorMode[mode](serverBus, newState, mode);
	},
	'color-field': (state, d, field) =>
		Let((data = setAvg(d, field), scale = colorScale(state, data, field)) =>
			assocIn(state, ['colorBy', 'field'], data,
				['colorBy', 'scale'], scale,
				['colorBy', 'scaleBounds'], scaleBounds(data, scale))),
	'color-scale': (state, scale) => assocIn(state, ['colorBy', 'scale'], scale),
	radius: (state, radius) => assocIn(state, ['radius'], radius),
//	'map-hide-codes': (state, hidden) =>
//		assocIn(state, ['map', 'hidden',
//			state.spreadsheet.map.colorColumn], hidden),
	// XXX need to clear this cache at some point,
	'map-data': (state, [samples, data], dsID, dims) =>
			setRadius(
				updateIn(assoc(state, 'samples', samples), ['data', dsID], dsData =>
					merge(dsData,
						object(dims, data.map(d => merge(d, {status: 'loaded'})))))),
	'map-data-error': (state, error, dsID, dims) =>
			updateIn(state, ['data', dsID], dsData =>
				merge(dsData, object(dims,
					dims.map(constant({status: 'error', error})))))
});

export default compose(fetchController, make(spreadsheetControls), mount(make(controls), ['singlecell']));
