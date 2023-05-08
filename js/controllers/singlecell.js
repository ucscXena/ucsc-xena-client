import query from './query';
import {make, mount, compose} from './utils';
var fetch = require('../fieldFetch');
var {samplesQuery} = require('./common');
var {fetchDefaultStudy, datasetList, datasetMetadata, donorFields} = require('../xenaQuery');
var {assoc, assocIn, getIn, identity, Let, merge, maxnull, minnull, object, pairs, pluck, pick, updateIn} = require('../underscore_ext').default;
var {userServers} = require('./common');
var Rx = require('../rx').default;
var {of} = Rx.Observable;
import {allCohorts, datasetCohort, dotRange, getSamples, hasDataset}
	from '../models/map';
import {colorSpec} from '../heatmapColors';
import {scaleParams} from '../colorScales';
var widgets = require('../columnWidgets');

var fieldType = {
	donor: ['clinical', 'coded'],
	datasource: ['clinical', 'coded'],
	type: ['clinical', 'coded'],
	prob: ['clinical', 'float'],
	gene: ['probes', 'float']
};

var fieldSpec = (dsID, fields, fieldType, valueType) => ({
	fetchType: 'xena',
	colorClass: 'default',
	dsID,
	valueType,
	fieldType,
	fields
});

var toDsID = (host, name) => JSON.stringify({host, name});

var fieldSpecMode = ({mode, host, name, field}) =>
	fieldSpec(toDsID(host, name), [field], ...fieldType[mode]);

var fetchMap = (dsID, field, samples) =>
	fetch(fieldSpec(dsID, [field], 'probes', 'float'), samples);

var setAvg = (data, field) => merge(data, widgets.avg(field, data));

var colorScale = (data, field) =>
	colorSpec(field, {}, data.codes,
			{values: data.req.values[0], mean: data.avg.mean[0]});

var scaleBounds = (data, scale) =>
	Let((d = data.req.values[0], min = minnull(d), max = maxnull(d),
			params = scaleParams(scale)) =>
		({min: Math.min(...params, min), max: Math.max(...params, max)}));

var colorParams = colorBy => color =>
	Let((field = fieldSpecMode(colorBy), data = setAvg(color, field),
			scale = colorScale(data, field)) =>
		assoc(data,
			'scale', scale,
			'scaleBounds', scaleBounds(data, scale)));

var fetchMethods = {
	defaultStudy: () => fetchDefaultStudy,
	datasetMetadata: (host, dataset) => datasetMetadata(host, dataset).map(m => m[0]),
	cohortDatasets: (cohort, server) =>
		datasetList(server, [cohort]).catch(() => of([])),
	donorFields: (cohort, server) => donorFields(server, cohort),
	// XXX might be a race here, with the error from localhost
	samples: (cohort, servers) =>
		samplesQuery(userServers({servers}), {name: cohort}, Infinity),
	data: (dsID, dim, samples) => fetchMap(dsID, dim, samples.samples),
	colorBy: (_, field, samples) =>
		fetch(fieldSpecMode(field), samples.samples).map(colorParams(field))
};

var cachePolicy = {
	defaultStudy: identity,
	datasetMetadata: identity,
	colorBy: identity, // always updates in-place
	data: (state, dsID) =>
		updateIn(state, ['singlecell', 'data'], data => pick(data, dsID)),
	// ['cohortDatasets', cohort, server]
	// ['donorFields', cohort, server]
	// limit cache to cohorts in study
	default: (state, path) =>
		Let((cohorts = pluck(allCohorts(state.singlecell), 'cohort')) =>
			updateIn(state, ['singlecell', path[0]], item => pick(item, cohorts)))
};


var cohortList = state => getIn(state, ['singlecell', 'defaultStudy', 'studyList'])
	.map(study => study.cohortList || []).flat();


var allDatasets = state =>
	Let((list = cohortList(state)) =>
		list.map(({preferredDataset = []}) =>
			preferredDataset.map(ds => ['datasetMetadata', ds.host, ds.name])).flat());

var concat = (...arr) => arr.filter(identity).flat();

var hasColorBy = state => getIn(state.singlecell, ['colorBy', 'field', 'field']);

var singlecellData = state =>
	state.page !== 'singlecell' ? [] : concat(
		[['defaultStudy']],
		getIn(state, ['singlecell', 'defaultStudy']) && allDatasets(state),
		// XXX rewrite using references
		Let((cohorts = allCohorts(state.singlecell)) =>
			userServers(state.spreadsheet)
			.map(server =>
				cohorts.map(cohort =>
					[['cohortDatasets', cohort.cohort, server],
						['donorFields', cohort.cohort, server]]).flat())
			.flat()),
		hasDataset(state.singlecell) &&
			[['samples', datasetCohort(state.singlecell), ['spreadsheet', 'servers']]],
		hasDataset(state.singlecell) && getSamples(state.singlecell) &&
			Let(({dsID, dimension} = state.singlecell.dataset) =>
				dimension.map(dim =>
					['data', dsID, dim,
						['singlecell', 'samples', datasetCohort(state.singlecell)]])),
		hasColorBy(state) && getSamples(state.singlecell) ?
			[['colorBy', 'data', ['singlecell', 'colorBy', 'field'],
				['singlecell', 'samples', datasetCohort(state.singlecell)]]] : []
	);

// Don't yet need invalidatePath
var {controller: fetchController/*, invalidatePath*/} =
	query(fetchMethods, singlecellData, cachePolicy, 'singlecell');

// append 'singlecell-' to actions, so we don't have any aliasing with
// other controllers.
var actionPrefix = actions =>
	object(pairs(actions).map(([k, v]) => ['singlecell-' + k, v]));

var controls = actionPrefix({
	enter: state => assoc(state, 'enter', 'true'),
	integration: (state, cohort) => assoc(state, 'integration', cohort, 'data', {}),
	layout: (state, layout) => assoc(state, 'layout', layout, 'colorBy', {}),
	dataset: (state, dataset, colorBy) => assoc(state, 'dataset', dataset,
		'colorBy', colorBy, 'radius', null),
	reset: state => assoc(state, 'layout', null, 'dataset', null, 'data', {},
		'integration', null, 'colorBy', {}, 'radius', null),
	colorBy: (state, colorBy) => assocIn(state, ['colorBy', 'field'], colorBy),
	colorScale: (state, scale) => assocIn(state, ['colorBy', 'data', 'scale'], scale),
	hidden: (state, codes) => assocIn(state, ['colorBy', 'hidden'], codes),
	// Make the default radius "sticky". Unfortunately, also makes nearby
	// points sticky if the drag operation starts there. Need to move this
	// to the view so we can track mousedown.
	radius: (state, r, rb) => Let(
		(r0 = state.radius, {step} = dotRange(rb)) =>
			(r - r0) * (r - rb) > 0 && Math.abs(r - rb) < step * 10 ? state :
			assocIn(state, ['radius'], r)),
});

export default compose(fetchController, mount(make(controls), ['singlecell']));
