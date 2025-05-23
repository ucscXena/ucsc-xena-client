import query from './query';
import {make, mount, compose} from './utils';
import fetch from '../fieldFetch';
import { samplesQuery } from './common.js';
import xenaQuery from '../xenaQuery';
var {allCohorts: fetchAllCohorts, allFieldMetadata, cohortMaxSamples, datasetList, datasetMetadata, fetchDefaultStudy} = xenaQuery;

import {assoc, assocIn, findIndex, get, getIn, identity, intersection, isArray,
	Let, map, merge, max as _max, min as _min, object, pairs, pluck, pick,
	range, uniq, updateIn} from '../underscore_ext.js';

import { userServers } from './common.js';
import Rx from '../rx';
var {ajax, of} = Rx.Observable;
var {asap} = Rx.Scheduler;
import {allCohorts, allDefaultCohortNames, datasetCohort, getSamples,
	getScale, hasColorBy, hasDataset, hasImage, isLog, log2p1, pow2m1,
	setChartType, studyList, userServerCohorts} from '../models/singlecell';
import {isAuthPending} from '../models/auth';
import {scaleParams} from '../colorScales';
import * as widgets from '../columnWidgets.js';
import {isPhenotype} from '../models/dataType';

// Number of image layers in display
var layers = 6;

var fieldType = {
	donor: () => ['clinical', 'coded'],
	datasource: () => ['clinical', 'coded'],
	type: () => ['clinical', 'coded'],
	prob: () => ['clinical', 'float'],
	probPanel: () => ['probes', 'float'],
	sig: () => ['clinical', 'float'],
	sigPanel: () => ['probes', 'float'],
	gene: () => ['probes', 'float'],
	geneSet: () => ['probes', 'float'],
	pheno: type => ['clinical', type],
	other: type => ['clinical', type]
};

var fieldSpec = (dsID, fields, fieldType, valueType, other) => ({
	fetchType: 'xena',
	colorClass: 'default',
	dsID,
	valueType,
	fieldType,
	fields,
	...other
});

var toDsID = (host, name) => JSON.stringify({host, name});
var ensureArray = x => isArray(x) ? x : [x];

var fieldSpecMode = ({mode, host, name, field, type, colnormalization}) =>
	fieldSpec(toDsID(host, name), ensureArray(field), ...fieldType[mode](type),
		// XXX drop this?
		{defaultNormalization: colnormalization});

var fetchMap = (dsID, fields, samples) =>
	fetch(fieldSpec(dsID, fields, 'probes', 'float'), samples);

var red = '#ff0000';
var blue = '#0000ff';

var applyLog = (fn, x, y) => fn(log2p1(x), log2p1(y)).map(pow2m1);
var applyLinear = (fn, x, y) => fn(x, y);
var extendScale = (min, max) =>
	Let((over = 0.1 * (max - min)) => [min - over, max + over]);


var scaleBounds = (data, scale) =>
	Let((d = data.req.values[0], params = scaleParams(scale),
			minIn = Math.min(...params, _min(d)),
			maxIn = Math.max(...params, _max(d)),
			[min, max] = (isLog(scale) ?
				applyLog : applyLinear)(extendScale, minIn, maxIn)) => ({min, max}));

var setAvg = (data, field) => merge(data, widgets.avg(field, data));

var colorParams = (field, color) => colorData =>
	Let((data = setAvg(colorData, fieldSpecMode(field)),
			scale = getScale(color, field.colnormalization, data)) =>
		assoc(data,
			// keeping state here allows tracking loaded vs. selected data.
			'field', field,
			'scale', scale,
			'scaleDefaults', scaleParams(scale),
			'scaleBounds', scaleBounds(data, scale)));

var enableSegmentation = segmentation =>
	updateIn(segmentation, [0], first => first && {...first, visible: true});

var defaultBackground = background =>
	background ? {backgroundOpacity: 1, backgroundVisible: true} : {};
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
		{size, tileSize, levels, background, fileformat, segmentation = []} = m;
	return {stats, opacity, inView, levels, size, tileSize, background, visible,
		fileformat, segmentation: enableSegmentation(segmentation),
		...defaultBackground(background)};
};

var fetchMethods = {
	defaultStudy: fetchDefaultStudy,
	datasetMetadata: (host, dataset) => datasetMetadata(host, dataset).map(m => m[0]),
	serverCohorts: (server, {studyList = []} = {}) =>
		Let((cohorts = allDefaultCohortNames(studyList)) =>
			cohorts.length ?
				fetchAllCohorts(server, []).map(list => intersection(cohorts, list)) :
				of([], asap)),
	cohortMaxSamples: (cohort, server) => cohortMaxSamples(server, cohort),
	cohortDatasets: (cohort, server) => datasetList(server, [cohort]),
	cohortFeatures: (cohort, server, dataset) => allFieldMetadata(server, dataset),
	// XXX might be a race here, with the error from localhost
	samples: (cohort, servers) =>
		samplesQuery(userServers({servers}), {name: cohort}, Infinity),
	data: (dsID, dims, samples) => fetchMap(dsID, JSON.parse(dims), samples.samples),
	chartY: (_, field, samples) =>
		fetch(fieldSpecMode(field), samples.samples).map(colorParams(field, blue)),
	chartX: (_, field, samples) =>
		fetch(fieldSpecMode(field), samples.samples).map(colorParams(field, blue)),
	colorBy: (_, field, samples) =>
		fetch(fieldSpecMode(field), samples.samples).map(colorParams(field, red)),
	colorBy2: (_, field, samples) =>
		fetch(fieldSpecMode(field), samples.samples).map(colorParams(field, blue)),
	image: path => ajax({
			url: `${path}/metadata.json`,
			withCredentials: true,
			headers: {'X-Redirect-To': location.origin},
			responseType: 'text', method: 'GET', crossDomain: true
		}).map(r => imageMetadata(JSON.parse(r.response)))
};

var cachePolicy = {
	defaultStudy: identity,
	datasetMetadata: identity,
	cohortMaxSamples: identity, // cache indefinitely
	chartY: identity, // always updates in-place
	chartX: identity, // always updates in-place
	colorBy: identity, // always updates in-place
	colorBy2: identity, // always updates in-place
	serverCohorts: identity, // cache indefinitely
	data: (state, [, dsID]) =>
		updateIn(state, ['singlecell', 'data'], data => pick(data, dsID)),
	image: (state, [, img]) =>
		updateIn(state, ['singlecell', 'image'], cache => pick(cache, img)),
	// ['samples', cohort]
	// ['cohortDatasets', cohort, server]
	// ['cohortFeatures', cohort, server, dsName]
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

var singlecellData = state =>
	state.page !== 'singlecell' || isAuthPending(state) ? [] : concat(
		[['defaultStudy', ['singlecell', 'defaultStudyID']]],
		// There is overlap between cohortDatasets and datasetMetadata, but
		// it's not worth resolving because they are needed at different times.
		// We need datasetMetadata to draw the integration list, and need
		// cohortDatasets after the user has selected an integration.
		getIn(state, ['singlecell', 'defaultStudy']) && allDatasets(state),
		Let((cohorts = allDefaultCohortNames(studyList(state.singlecell)),
			usc = userServerCohorts(state.spreadsheet.servers,
				state.singlecell.serverCohorts, cohorts)) =>
			map(usc, (cohorts, server) =>
				cohorts.map(cohort => [['cohortMaxSamples', cohort, server]]).flat())
			.flat()),
		userServers(state.spreadsheet).map(server =>
			['serverCohorts', server, ['singlecell', 'defaultStudy']]),
		Let((cohorts = pluck(allCohorts(state.singlecell), 'cohort'),
			usc = userServerCohorts(state.spreadsheet.servers,
				state.singlecell.serverCohorts, cohorts)) =>
			map(usc, (cohorts, server) =>
				cohorts.map(cohort =>
					[['cohortDatasets', cohort, server],
					...getIn(state.singlecell, ['cohortDatasets', cohort, server], [])
						.filter(isPhenotype)
						.map(ds => ['cohortFeatures', cohort, server, ds.name])])
				.flat())
			.flat()),
		Let((img = hasImage(state.singlecell)) => img && [['image', img.path]]),
		datasetCohort(state.singlecell) &&
			[['samples', datasetCohort(state.singlecell), ['spreadsheet', 'servers']]],
		hasDataset(state.singlecell) && getSamples(state.singlecell) &&
			Let(({dsID, dimension} = state.singlecell.dataset) =>
				[['data', dsID, JSON.stringify(dimension),
					['singlecell', 'samples', datasetCohort(state.singlecell)]]]),
		hasColorBy(get(state.singlecell, ['chartY'])) && getSamples(state.singlecell) ?
			[['chartY', 'data', ['singlecell', 'chartY', 'field'],
				['singlecell', 'samples', datasetCohort(state.singlecell)]]] : [],
		hasColorBy(get(state.singlecell, ['chartX'])) && getSamples(state.singlecell) ?
			[['chartX', 'data', ['singlecell', 'chartX', 'field'],
				['singlecell', 'samples', datasetCohort(state.singlecell)]]] : [],
		hasColorBy(get(state.singlecell, ['colorBy'])) && getSamples(state.singlecell) ?
			[['colorBy', 'data', ['singlecell', 'colorBy', 'field'],
				['singlecell', 'samples', datasetCohort(state.singlecell)]]] : [],
		hasColorBy(get(state.singlecell, ['colorBy2']))
				&& getSamples(state.singlecell) ?
			[['colorBy2', 'data', ['singlecell', 'colorBy2', 'field'],
				['singlecell', 'samples', datasetCohort(state.singlecell)]]] : []);

var {controller: fetchController/*, invalidatePath*/} =
	query(fetchMethods, singlecellData, cachePolicy, 'singlecell');

// append 'singlecell-' to actions, so we don't have any aliasing with
// other controllers.
var actionPrefix = actions =>
	object(pairs(actions).map(([k, v]) => ['singlecell-' + k, v]));

var reset = state => assoc(state, 'dataset', null, 'data', {}, 'tab', 0,
	'integration', null, 'colorBy', {}, 'colorBy2', {}, 'radius', null,
	'chartY', {}, 'chartX', {}, 'chartState', {});

var setColorBy = (state, key, colorBy) =>
	Let((next = colorBy.mode ? state : assocIn(state, [key, 'data'], null)) =>
		assocIn(next, [key, 'field'], colorBy,
			[key, 'hidden'], null));

var setChart = (state, dataset, current) =>
	dataset.cohort === datasetCohort(state) ? current : {};

var controls = actionPrefix({
	enter: state => assoc(state, 'enter', 'true'),
	integration: (state, cohort) => assoc(state, 'integration', cohort),
	dataset: (state, dataset, colorBy, colorBy2) => assoc(state, 'dataset', dataset,
		'colorBy', colorBy, 'colorBy2', colorBy2, 'radius', null, 'viewState', null,
		'chartY', setChart(state, dataset, state.chartY),
		'chartX', setChart(state, dataset, state.chartX),
		'chartState', setChart(state, dataset, state.chartState)),
	reset,
	colorBy: (state, key, colorBy) =>
		Let((next = setColorBy(state, key, colorBy)) =>
			key === 'colorBy' && !colorBy.mode ? // reset colorBy2 if no colorBy
				setColorBy(next, 'colorBy2', {mode: ''}) : next),
	colorScale: (state, key, scale) =>
		Let(({field: {host, name, field}} = state[key]) =>
			assocIn(state, ['settings', host, name, field, 'scale'], scale)),
	customColor: (state, axisField, colors) =>
		Let(({field: {host, name, field}, data: {codes}} = state[axisField]) =>
			assocIn(state, ['settings', host, name, field, 'scale'],
				['ordinal', codes.length, colors])),
	hidden: (state, key, codes) => assocIn(state, [key, 'hidden'], codes),
	radius: (state, r) => assocIn(state, ['radius'], r),
	channel: (state, i, channel) =>
		Let(({path} = hasImage(state),
				newC = findIndex(state.image[path].stats, s => s.name === channel)) =>
			assocIn(state, ['image', path, 'inView', i], newC)),
	'channel-visible': (state, i, checked) =>
		Let(({path} = hasImage(state)) =>
			assocIn(state, ['image', path, 'visible', i], checked)),
	'channel-opacity': (state, i, opacity) =>
		Let(({path} = hasImage(state)) =>
			assocIn(state, ['image', path, 'opacity', i], opacity)),
	'segmentation-visible': (state, i, checked) =>
		Let(({path} = hasImage(state)) =>
			assocIn(state, ['image', path, 'segmentation', i, 'visible'], checked)),
	'background-visible': (state, checked) =>
		Let(({path} = hasImage(state)) =>
			assocIn(state, ['image', path, 'backgroundVisible'], checked)),
	'background-opacity': (state, opacity) =>
		Let(({path} = hasImage(state)) =>
			assocIn(state, ['image', path, 'backgroundOpacity'], opacity)),
	tab: (state, tab) => assoc(state, 'tab', tab),
	'view-state': (state, viewState) => assoc(state, 'viewState', viewState),
	// XXX drop 'key', since we only do one.
	'show-markers': (state, key, show) => assocIn(state, ['showMarkers', key], show),
	'shadow': (state, shadow) => assoc(state, 'shadow', shadow),
	chartMode: (state, mode) => assoc(state, 'chartMode', mode, 'chartY', {},
		'chartX', {}, 'chartState', {}),
	chartType: (state, chartType) => setChartType(state, chartType),
	chartNormalization: (state, i) =>
		Let(({host, name} = getIn(state, ['chartY', 'field'])) =>
			assocIn(state, ['chartState', 'normalization', host, name], i)),
	chartInverted: state => updateIn(state, ['chartState', 'inverted'], x => !x),
	chartYExpression: (state, x) => assocIn(state, ['chartState', 'yexpression'], x)
});

var resetIntegration = (state = {}, params) =>
	// If user clicked link to get here, drop the state. However, if
	// the click was a login, don't drop state.
	params.navigate === 'navigate' && !params.code && !params.inlineState ?
		reset(state) : state;

var setParamStudy = (state, params) =>
	params.study ? assoc(state, 'integration', params.study, 'enter', true) : state;

var setDefaultStudyID = (state, params) =>
	updateIn(state, ['defaultStudyID'], ds =>
		(params.navigate !== 'navigate' || params.code || params.inlineState ? ds :
			params.defaultTable) || 'default');

// compose a list of functions, retaining trailing arguments
var thread = (...fns) =>
	(state, ...args) => fns.reduce((acc, fn) => fn(acc, ...args), state);

// global actions
var pageControls = {
	init: (state, url, params = {}) =>
		thread(resetIntegration, setParamStudy, setDefaultStudyID)(state, params),
	// This drops our large data, so we can preserve the page state w/o
	// overflowing browser limits. It also avoids needing to handle
	// serialization of binary objects for sessionStorage.
	// Maybe we should drop other fetched data as well, so a reload will
	// get the latest.
	'page-unload': state =>
		assocIn(state, ['colorBy', 'data'], undefined, ['data'], undefined,
			['samples'], undefined,
			['colorBy2', 'data'], undefined,
			['chartY', 'data'], undefined,
			['chartX', 'data'], undefined)
};

// Have to separate this to get access to the server list. Need a better
// mechanism.
export default compose(fetchController,
	mount(make(merge(pageControls, controls)), ['singlecell']));
