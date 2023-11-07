import query from './query';
import {make, mount, compose} from './utils';
var fetch = require('../fieldFetch');
var {samplesQuery} = require('./common');
var {allFieldMetadata, fetchDefaultStudy, datasetList, datasetMetadata, donorFields} = require('../xenaQuery');
var {assoc, assocIn, findIndex, getIn, identity, Let, mapObject, merge, maxnull,
	minnull, object, pairs, pluck, pick, range, uniq,
	updateIn} = require('../underscore_ext').default;
var {userServers} = require('./common');
var Rx = require('../rx').default;
var {of, ajax} = Rx.Observable;
import {allCohorts, datasetCohort, dotRange, getSamples, hasDataset,
	hasImage} from '../models/map';
import {colorSpec} from '../heatmapColors';
import {scaleParams} from '../colorScales';
var widgets = require('../columnWidgets');
import {isPhenotype} from '../models/dataType';

// Number of image layers in display
var layers = 6;

var fieldType = {
	donor: () => ['clinical', 'coded'],
	datasource: () => ['clinical', 'coded'],
	type: () => ['clinical', 'coded'],
	prob: () => ['clinical', 'float'],
	gene: () => ['probes', 'float'],
	other: type => ['clinical', type]
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

var fieldSpecMode = ({mode, host, name, field, type}) =>
	fieldSpec(toDsID(host, name), [field], ...fieldType[mode](type));

var fetchMap = (dsID, fields, samples) =>
	fetch(fieldSpec(dsID, fields, 'probes', 'float'), samples);

var setAvg = (data, field) => merge(data, widgets.avg(field, data));


// XXX override 'float' scale with 'float-mid', because we don't
// want symmetric positive/negative ranges.
var setFloatScale = scale =>
	Let(([type, ...args] = scale) =>
		type === 'float' ? ['float-mid', ...args] :
		scale);

var colorScale = (data, field) =>
	setFloatScale(colorSpec(field, {colors: ['#0000ff', null, '#ff0000']}, data.codes,
			{avg: mapObject(data.avg, v => v[0])}));

var scaleBounds = (data, scale) =>
	Let((d = data.req.values[0], params = scaleParams(scale),
			min = Math.min(...params, minnull(d)),
			max = Math.max(...params, maxnull(d)),
			over = 0.1 * (max - min)) =>
		({min: min - over, max: max + over}));

var colorParams = colorBy => color =>
	Let((field = fieldSpecMode(colorBy), data = setAvg(color, field),
			scale = colorScale(data, field)) =>
		assoc(data,
			'scale', scale,
			'scaleBounds', scaleBounds(data, scale)));

var imageMetadata = m => {
	var stats = m.channels.map((l, i) => ({i, ...l})),
		opacity = stats.map(({lower, upper}) => [lower / 256, upper / 256]),
		channels = pluck(stats, 'name'),
		// inView is channels in the webgl model.
		// visible is which channels are enabled.
		// Pick inView from defaults, or initial channels.
		inView = uniq((m.defaults || []).map(c => channels.indexOf(c))
				.concat(range(stats.length))).slice(0, layers),
		visible = inView.map((c, i) => !m.defaults || i < m.defaults.length),
		{size, tileSize, levels, background} = m;
	return {stats, opacity, inView, levels, size, tileSize, background, visible};
};

var fetchMethods = {
	defaultStudy: () => fetchDefaultStudy,
	datasetMetadata: (host, dataset) => datasetMetadata(host, dataset).map(m => m[0]),
	cohortDatasets: (cohort, server) =>
		datasetList(server, [cohort]).catch(() => of([])),
	cohortFeatures: (cohort, server, dataset) =>
		allFieldMetadata(server, dataset).catch(() => of([])),
	donorFields: (cohort, server) => donorFields(server, cohort),
	// XXX might be a race here, with the error from localhost
	samples: (cohort, servers) =>
		samplesQuery(userServers({servers}), {name: cohort}, Infinity),
	data: (dsID, dims, samples) => fetchMap(dsID, JSON.parse(dims), samples.samples),
	colorBy: (_, field, samples) =>
		fetch(fieldSpecMode(field), samples.samples).map(colorParams(field)),
	image: path => ajax({
			url: `${path}/metadata.json`,
			responseType: 'text', method: 'GET', crossDomain: true
		}).map(r => imageMetadata(JSON.parse(r.response)))
};

var cachePolicy = {
	defaultStudy: identity,
	datasetMetadata: identity,
	colorBy: identity, // always updates in-place
	data: (state, dsID) =>
		updateIn(state, ['singlecell', 'data'], data => pick(data, dsID)),
	image: (state, img) =>
		updateIn(state, ['singlecell', 'image'], cache => pick(cache, img)),
	// ['cohortDatasets', cohort, server]
	// ['cohortFeatures', cohort, server, dsName]
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
		// There is overlap between cohortDatasets and datasetMetadata, but
		// it's not worth resolving because they are needed at different times.
		// We need datasetMetadata to draw the integration list, and need
		// cohortDatasets after the user has selected an integration.
		getIn(state, ['singlecell', 'defaultStudy']) && allDatasets(state),
		Let((cohorts = allCohorts(state.singlecell)) =>
			userServers(state.spreadsheet)
			.map(server =>
				cohorts.map(({cohort}) =>
					[['cohortDatasets', cohort, server],
						['donorFields', cohort, server],
					...getIn(state.singlecell, ['cohortDatasets', cohort, server], []).
						filter(isPhenotype)
						.map(ds => ['cohortFeatures', cohort, server, ds.name])])
				.flat())
			.flat()),
		Let((img = hasImage(state.singlecell)) => img && [['image', img.path]]),
		hasDataset(state.singlecell) &&
			[['samples', datasetCohort(state.singlecell), ['spreadsheet', 'servers']]],
		hasDataset(state.singlecell) && getSamples(state.singlecell) &&
			Let(({dsID, dimension} = state.singlecell.dataset) =>
				[['data', dsID, JSON.stringify(dimension),
					['singlecell', 'samples', datasetCohort(state.singlecell)]]]),
		hasColorBy(state) && getSamples(state.singlecell) ?
			[['colorBy', 'data', ['singlecell', 'colorBy', 'field'],
				['singlecell', 'samples', datasetCohort(state.singlecell)]]] : []);

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
	colorBy: (state, colorBy) => assocIn(state, ['colorBy', 'field'], colorBy,
		['colorBy', 'hidden'], null),
	colorScale: (state, scale) => assocIn(state, ['colorBy', 'data', 'scale'], scale),
	hidden: (state, codes) => assocIn(state, ['colorBy', 'hidden'], codes),
	// Make the default radius "sticky". Unfortunately, also makes nearby
	// points sticky if the drag operation starts there. Need to move this
	// to the view so we can track mousedown.
	radius: (state, r, rb) => Let(
		(r0 = state.radius, {step} = dotRange(rb)) =>
			(r - r0) * (r - rb) > 0 && Math.abs(r - rb) < step * 10 ? state :
			assocIn(state, ['radius'], r)),
	channel: (state, i, channel) =>
		Let(({path} = hasImage(state),
				newC = findIndex(state.image[path].stats, s => s.name === channel)) =>
			assocIn(state, ['image', path, 'inView', i], newC)),
	'channel-visible': (state, i, checked) =>
		Let(({path} = hasImage(state)) =>
			assocIn(state, ['image', path, 'visible', i], checked)),
	'channel-opacity': (state, i, opacity) =>
		Let(({path} = hasImage(state)) =>
			assocIn(state, ['image', path, 'opacity', i], opacity))
});

// global actions
var pageControls = {
	// This drops our large data, so we can preserve the page state w/o
	// overflowing browser limits. It also avoids needing to handle
	// serialization of binary objects for sessionStorage.
	// Maybe we should drop other fetched data as well, so a reload will
	// get the latest.
	'page-unload': state =>
		assocIn(state, ['colorBy', 'data'], undefined, ['data'], undefined,
			['samples'], undefined)
};

export default compose(make(pageControls), fetchController,
	mount(make(merge(pageControls, controls)), ['singlecell']));
