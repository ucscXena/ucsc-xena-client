import query from './query';
import {make, mount, compose} from './utils';
var fetch = require('../fieldFetch');
var {samplesQuery} = require('./common');
var {allCohorts: fetchAllCohorts, allFieldMetadata, fetchDefaultStudy,
	datasetList, datasetMetadata, donorFields} = require('../xenaQuery');
var {assoc, assocIn, findIndex, get, getIn, identity, intersection, Let,
	map, merge, max: _max, min: _min, object, pairs, pluck, pick, range, uniq,
	updateIn} = require('../underscore_ext').default;
var {userServers} = require('./common');
var Rx = require('../rx').default;
var {ajax, of} = Rx.Observable;
var {asap} = Rx.Scheduler;
import {allCohorts, allDefaultCohortNames, datasetCohort, dotRange, getSamples,
	hasColorBy, hasDataset, hasImage, isLog, log2p1, pow2m1, userServerCohorts}
		from '../models/map';
import {isAuthPending} from '../models/auth';
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
	sig: () => ['clinical', 'float'],
	gene: () => ['probes', 'float'],
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

var fieldSpecMode = ({mode, host, name, field, type, colnormalization}) =>
	fieldSpec(toDsID(host, name), [field], ...fieldType[mode](type),
		// XXX drop this?
		{defaultNormalization: colnormalization});

var fetchMap = (dsID, fields, samples) =>
	fetch(fieldSpec(dsID, fields, 'probes', 'float'), samples);

var getLogScale = (color, {min: [min], max: [max]}) =>
	Let((nMin = log2p1(min), nMax = log2p1(max),
			zone = (nMax - nMin) / 4, absmax = Math.max(-nMin, nMax)) =>
		nMin === 0 && nMax === 0 ?
			['float-log', null, color, 0, 0] :
		nMin < 0 && nMax > 0 ?
			['float-log', null, color, pow2m1(-absmax / 2), pow2m1(absmax / 2)] :
		nMin >= 0 && nMax >= 0 ?
			['float-log', null, color, pow2m1(nMin + zone), pow2m1(nMax - zone / 2)] :
		['float-log', null, color, pow2m1(nMin + zone / 2), pow2m1(nMax - zone)]);

var getLinearScale = (color, {min: [min], max: [max]}) =>
	Let((zone = (max - min) / 8) =>
		['float-pos', null, color, min + zone, max - zone]);

var getScale = (color, normalization, {codes, avg}) =>
	codes ? ['ordinal', codes.length] :
	normalization === 'log2(x)' ? getLogScale(color, avg) :
	getLinearScale(color, avg);

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
			'scale', scale,
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
	cohortDatasets: (cohort, server) =>
		datasetList(server, [cohort]),
	cohortFeatures: (cohort, server, dataset) =>
		allFieldMetadata(server, dataset),
	donorFields: (cohort, server) => donorFields(server, cohort),
	// XXX might be a race here, with the error from localhost
	samples: (cohort, servers) =>
		samplesQuery(userServers({servers}), {name: cohort}, Infinity),
	data: (dsID, dims, samples) => fetchMap(dsID, JSON.parse(dims), samples.samples),
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
	colorBy: identity, // always updates in-place
	colorBy2: identity, // always updates in-place
	serverCohorts: identity, // cache indefinitely
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

var singlecellData = state =>
	state.page !== 'singlecell' || isAuthPending(state) ? [] : concat(
		[['defaultStudy', ['singlecell', 'defaultStudyID']]],
		// There is overlap between cohortDatasets and datasetMetadata, but
		// it's not worth resolving because they are needed at different times.
		// We need datasetMetadata to draw the integration list, and need
		// cohortDatasets after the user has selected an integration.
		getIn(state, ['singlecell', 'defaultStudy']) && allDatasets(state),
		userServers(state.spreadsheet).map(server =>
			['serverCohorts', server, ['singlecell', 'defaultStudy']]),
		Let((cohorts = allCohorts(state.singlecell),
			usc = userServerCohorts(state.spreadsheet.servers,
				state.singlecell.serverCohorts, cohorts)) =>
			map(usc, (cohorts, server) =>
				cohorts.map(cohort =>
					[['cohortDatasets', cohort, server],
						['donorFields', cohort, server],
					...getIn(state.singlecell, ['cohortDatasets', cohort, server], [])
						.filter(isPhenotype)
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

var reset = state => assoc(state, 'dataset', null, 'data', {},
	'integration', null, 'colorBy', {}, 'colorBy2', {}, 'radius', null);


var controls = actionPrefix({
	enter: state => assoc(state, 'enter', 'true'),
	integration: (state, cohort) => assoc(state, 'integration', cohort),
	// We reset colorBy to {} because of the query selectors on colorBy.data
	// that will throw if we delete the object.
	dataset: (state, dataset, colorBy) => assoc(state, 'dataset', dataset,
		'colorBy', colorBy, 'colorBy2', {}, 'radius', null, 'viewState', null),
	reset,
	advanced: state => updateIn(state, ['advanced'],  a => !a),
	colorBy: (state, key, colorBy) =>
		Let((next = colorBy.mode ? state : assocIn(state, [key, 'data'], null)) =>
			assocIn(next, [key, 'field'], colorBy,
				[key, 'hidden'], null)),
	colorScale: (state, key, scale) => assocIn(state, [key, 'data', 'scale'], scale),
	hidden: (state, key, codes) => assocIn(state, [key, 'hidden'], codes),
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
	'view-state': (state, viewState) => assoc(state, 'viewState', viewState),
});

var resetIntegration = (state = {}, params) =>
	// If user clicked link to get here, drop the state. However, if
	// the click was a login, don't drop state.
	params.navigate === 'navigate' && !params.code ? reset(state) : state;

var setParamStudy = (state, params) =>
	params.study ? assoc(state, 'integration', params.study, 'enter', true) : state;

var setDefaultStudyID = (state, params) =>
	updateIn(state, ['defaultStudyID'], ds =>
		(params.navigate !== 'navigate' || params.code ? ds : params.defaultTable) ||
			'default');

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
			['samples'], undefined)
};

// Have to separate this to get access to the server list. Need a better
// mechanism.
export default compose(fetchController,
	mount(make(merge(pageControls, controls)), ['singlecell']));
