var {assoc, deepMerge, every, find, filter, findValue, first, flatmap, get, getIn,
	identity, intersection, Let, map, mapObject, memoize1, merge, min, max,
	mmap, object, omit, pairs, pick, pluck, updateIn, uniq, values}
		= require('../underscore_ext').default;
var {userServers} = require('./servers');

var type = ({valuetype}) => valuetype === 'category' ? 'coded' : 'float';

var getProps = (...arrs) => arrs.map(a => a || []).flat();

// array of cohort datasets from all hosts
var allCohortDatasets = (cohort, cohortDatasets) =>
	values(get(cohortDatasets, cohort)).flat();

var cohortMaps = cohortDatasets => ({cohort}) =>
	allCohortDatasets(cohort, cohortDatasets)
		.map(ds => getProps(ds.map)
			.map(m => merge({dsID: ds.dsID, cohort},
				pick(m, 'micrometer_per_unit', 'label', 'type', 'dimension',
					'image', 'spot_diameter'))))
		.flat();

export var maps = (cohorts, cohortDatasets) =>
	!cohorts.length || !cohortDatasets ? [] :
	cohorts.map(cohortMaps(cohortDatasets)).flat();


var cellTypeCluster = datasets =>
	datasets.map(ds => getProps(ds.cluster, ds.celltype)
		.map(m => ({
			dsID: ds.dsID,
			field: m.feature,
			label: m.label,
			markers: m.markers
		}))).flat();

var defaultPhenotype = (datasets, cohortFeatures) =>
	datasets.map(ds => getProps(ds.defaultphenotype)
		.map(m =>
			Let(({host, name} = JSON.parse(ds.dsID)) => ({
				dsID: ds.dsID,
				field: m.feature,
				label: m.label,
				type: type(getIn(cohortFeatures, [host, name, m.feature],
				                 {valueType: 'float'}))
			})))).flat();

var signature = datasets =>
	datasets.map(ds => getProps(ds.signatureassignment)
		.map(m => ({
			dsID: ds.dsID,
			field: m.assignment,
			label: m.label
		}))).flat();

var signatureScore = datasets =>
	datasets.map(ds => getProps(ds.signaturescorematrix).map(m =>
		m.category.map(field => ({
			dsID: ds.dsID,
			field,
			label: field
		}))).flat()).flat();

var labelTransfer = datasets =>
	datasets.map(ds => getProps(ds.labeltransfer).map(m => ({
			dsID: ds.dsID,
			field: m.transferredLabel,
			prob: m.transferProbability,
			label: m.label
		}))).flat();

var labelTransferProb = datasets =>
	datasets.map(ds => getProps(ds.labeltransferfullprob).map(m => ({
			dsID: ds.dsID,
			category: m.category,
			label: m.label
		}))).flat();

var empty = {
	cellType: {},
	labelTransfer: {},
	labelTransferProb: {},
	signature: {},
	signatureScore: {},
	other: {}
};

//{'cellType': {[cohort]: [cellType, ...], ...}, ...}}
export var curatedFields = (cohorts, cohortDatasets, cohortFeatures) =>
	!cohorts.length ? empty :
	deepMerge(
		...cohorts.map(({cohort}) =>
			Let((ds = allCohortDatasets(cohort, cohortDatasets)) =>
				object(
					['cellType', 'labelTransfer', 'labelTransferProb', 'signature',
						'signatureScore', 'defaultPhenotype'],
					[cellTypeCluster(ds), labelTransfer(ds), labelTransferProb(ds),
					 signature(ds), signatureScore(ds),
					 defaultPhenotype(ds, get(cohortFeatures, cohort, {}))]
						.map(d => ({[cohort]: d}))))));


var studyCohorts = study => get(study, 'cohortList', []);

var allCohorts1 = memoize1((studyList, id) =>
	Let((byId = object(pluck(studyList, 'study'), studyList),
			study = byId[id]) =>
		studyCohorts(byId[id]).concat(...get(study, 'subStudy', [])
			.map(({studyID}) => studyCohorts(byId[studyID])))));

export var allCohorts = state =>
	allCohorts1(getIn(state, ['defaultStudy', 'studyList'], []),
		get(state, 'integration'));

export var allDefaultCohortNames = memoize1(studyList =>
		uniq(pluck(studyList.map(studyCohorts).flat(), 'cohort')));

export var userServerCohorts = memoize1((servers, serverCohorts, cohorts) =>
	Let((us = userServers({servers}),
		cnames = pluck(cohorts, 'cohort')) =>
		mapObject(pick(serverCohorts, us), sc => intersection(sc, cnames))));

var ignore = ['_DONOR', '_SAMPLE', 'sampleID', '_DATASOURCE'];
var dropIgnored = features =>
	mapObject(features, datasets =>
		mapObject(datasets, fields => omit(fields, ignore)));

var dropFields = (features, [dsID, fields]) =>
	Let(({host, name} = JSON.parse(dsID)) =>
		updateIn(features, [host, name], ds => omit(ds, fields)));

// pull curated fields
var getCohortFields = cohort => fields =>
	fields[cohort].map(f => f.category ? [f.dsID, f.category] : [f.dsID, [f.field]]);

var curatedFieldKeys = ['labelTransfer', 'labelTransferProb', 'cellType',
	'signature', 'signatureScore', 'defaultPhenotype'];

var cohortOther = (cohort, state, features) =>
	Let((pruned = curatedFieldKeys.map(k => state[k]).map(getCohortFields(cohort))
		.flat().reduce(dropFields, dropIgnored(features))) =>
			flatmap(pruned, (datasets, host) => flatmap(datasets, (fields, name) =>
				map(fields, (p, field) => ({host, name, field, type: type(p)})))));

var otherFields = (cohorts, state, cohortFeatures) =>
	deepMerge(...cohorts.map(({cohort}) =>
		({[cohort]: cohortOther(cohort, state, get(cohortFeatures, cohort, []))})));

export var cohortFields = (cohorts, cohortDatasets, cohortFeatures) =>
	Let((fields = curatedFields(cohorts, cohortDatasets, cohortFeatures)) =>
		assoc(fields, 'other', otherFields(cohorts, fields, cohortFeatures)));


export var hasDataset = state => getIn(state, ['dataset', 'dsID']);

var relativeOrAbsolute = (host, path) => path.startsWith('http') ? path :
	host + '/download' + path;

var imagePath = (dsID, path) =>
	Let(({host} = JSON.parse(dsID)) => relativeOrAbsolute(host, path));

// Check if there's an image.
export var hasImage = state =>
	Let((img = getIn(state, ['dataset', 'image', 0])) =>
		img && assoc(img, 'path', imagePath(state.dataset.dsID, img.path)));

export var datasetCohort = state => getIn(state, ['dataset', 'cohort']);

var hasField = field => (state, cohort = datasetCohort(state)) =>
	findValue(pairs(getIn(state, ['donorFields', cohort])),
		([host, fields]) => findValue(fields,
			f => f.field === field && [host, f.name]));

export var hasDonor = hasField('_DONOR');
export var hasDatasource = hasField('_DATASOURCE');

export var hasCellType = (state, cohort = datasetCohort(state)) =>
	state.cellType[cohort].length || state.labelTransfer[cohort].length ||
	state.signature[cohort].length;

export var hasTransferProb = (state, cohort = datasetCohort(state)) =>
	state.labelTransferProb[cohort].length;

export var hasSignatureScore = (state, cohort = datasetCohort(state)) =>
	state.signatureScore[cohort].length;

export var hasOther = (state, floatOnly, cohort = datasetCohort(state)) =>
	(floatOnly ? identity : filter)(state.other[cohort], {type: 'float'}).length;

export var hasGene = (state, cohort = datasetCohort(state)) =>
	Let((datasets =
		get(
			findValue(getIn(state, ['defaultStudy', 'studyList']),
				study => find(study.cohortList, c => c.cohort === cohort)),
			'preferredDataset')) =>
	get(datasets, 'length') && datasets);

export var dotRange = Let((ratio = 4) =>
	radius => ({min: radius / ratio, max: radius * ratio,
		step: radius * (ratio - 1 / ratio) / 200}));

var nvolume = (mins, maxs) => mmap(mins, maxs, (min, max) => max - min)
			.reduce((x, y) => x * y);

export var getData = state =>
	Let(({dsID, dimension} = get(state, 'dataset') || {}) =>
		getIn(state, ['data', dsID, JSON.stringify(dimension)]));


// In a latent space, more dimensions will pack points more tightly together
// when they are projected to the 2d viewport. Here we estimate the radius of
// the data points as a whole, using the bounds of the data, then compute a
// dot radius based on fill percentage of a 2d view.
var pickRadius = (mins, maxs, len, pct = 0.3) =>
	Let((R = Math.pow(nvolume(mins, maxs), 1 / mins.length)) =>
		 pct * R / Math.sqrt(len));

export var setRadius = (sd, datasetData) =>
	Let((data = getIn(datasetData, ['req', 'values'], [])) =>
		!(data.length && every(data, identity)) ? NaN :
		Let((mins = data.map(min), maxs = data.map(max)) =>
			sd ? sd / 2 : pickRadius(mins, maxs, data[0].length)));

export var getRadius = state => get(state, 'radius') || get(state, 'radiusBase');

export var getSamples = state =>
	Let(({host, name} = JSON.parse(hasDataset(state))) =>
		getIn(state, ['samples', host, name, 'samples']));

export var dataLoading = state =>
	Let(({dsID, dimension} = state.dataset, dims = JSON.stringify(dimension)) =>
		!getIn(state, ['data', dsID, dims]) ||
		getIn(state, ['_outOfDate', 'data', dsID, dims]));

export var dataError = state =>
	Let(({dsID, dimension} = state.dataset, dims = JSON.stringify(dimension)) =>
		!getIn(state, ['_outOfDate', 'data', dsID, dims]) &&
		getIn(state, ['data', dsID, dims, 'status']) === 'error');

export var hasColorBy = colorBy => getIn(colorBy, ['field', 'field']);

export var hasColor = colorBy =>
	hasColorBy(colorBy) && getIn(colorBy, ['data', 'req', 'values', 0]);

var colorLoadingField = (state, field) =>
	Let((f = get(state, field)) =>
		hasColorBy(f) &&
		(!hasColor(f) || getIn(state, ['_outOfDate', field, 'data'])));

export var colorLoading = state =>
	colorLoadingField(state, 'colorBy') || colorLoadingField(state, 'colorBy2');

export var colorErrorField = (state, field) =>
	getIn(state, [field, 'field', 'mode']) &&
	!getIn(state, ['_outOfDate', field, 'data']) &&
	getIn(state, [field, 'data', 'status']) === 'error';

export var colorError = state =>
	colorErrorField(state, 'colorBy') || colorErrorField(state, 'colorBy2');

export var getDataSubType = (state, host, name) =>
	getIn(state.datasetMetadata, [host, name, 'dataSubType']);

var toDsID = a => JSON.stringify(pick(a, 'host', 'name'));
// select component requires reference equality, so we have to find
// the matching option here.
// XXX Will this behave badly if we recompute cellType in the selector
// due to data coming in?
export var cellTypeValue = state =>
	Let((dsID = toDsID(state.colorBy.field), {field} = state.colorBy.field,
			cohort = datasetCohort(state)) =>
		state.cellType[cohort].concat(state.labelTransfer[cohort])
			.concat(state.signature[cohort])
			.find(t => t.dsID === dsID && t.field === field) || '');

export var otherValue = state =>
	Let(({host, name, field} = state.colorBy.field,
			cohort = datasetCohort(state)) =>
		state.other[cohort]
			.find(other => other.name === name && other.host === host
				&& other.field === field) || '');

export var phenoValue = state =>
	Let(({host, name, field} = state.colorBy.field,
			dsID = JSON.stringify({host, name}),
			cohort = datasetCohort(state)) =>
		state.defaultPhenotype[cohort]
			.find(f => f.dsID === dsID && f.field === field) || '');

export var cellTypeMarkers = state =>
	getIn(state, ['colorBy', 'field', 'mode']) === 'type' &&
		get(cellTypeValue(state), 'markers');

export var probValue = state =>
	Let((dsID = toDsID(state.colorBy.field)) =>
		state.labelTransferProb[datasetCohort(state)].find(t => t.dsID === dsID) || '');

export var sigValue = state =>
	Let((dsID = toDsID(state.colorBy.field), {field} = state.colorBy.field,
		cohort = datasetCohort(state)) =>
			state.signatureScore[cohort]
				.find(t => t.dsID === dsID && t.field === field) || '');

var LetIf = (v, f) => v && f(v) ;

export var defaultColor = (state, cohort) =>
	hasCellType(state, cohort) &&
		Let(({dsID, field} = first(state.cellType[cohort]) ||
			first(state.labelTransfer[cohort]) || first(state.signature[cohort]),
			{host, name} = JSON.parse(dsID)) => ({mode: 'type', host, name, field})) ||
	LetIf(hasDonor(state, cohort), ([host, name]) =>
		({mode: 'donor', host, name, field: '_DONOR'})) ||
	LetIf(hasDatasource(state, cohort), ([host, name]) =>
		({mode: 'datasource', host, name, field: '_DATASOURCE'})) ||
	null;

export var layerColors = [
	[0.0, 0.0, 1.0],
	[0.0, 1.0, 0.0],
	[1.0, 1.0, 0.0],
	[0.0, 1.0, 1.0],
	[1.0, 0.0, 1.0],
	[1.0, 0.0, 0.0]
];

export var segmentedColor = [0.5, 0.5, 0.5];

export var isOrdinal = colors => colors && colors[0] === 'ordinal';

export var log2p1 = v => Math.log2(v + 1);
export var pow2m1 = v => Math.pow(2, v) - 1;
export var isLog = scale => get(scale, 0, '').indexOf('log') !== -1;
