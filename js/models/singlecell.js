var {assoc, assocIn, deepMerge, every, find, findValue, first,
	flatmap, get, getIn, identity, intersection, isArray, isEqual, keys, Let, map,
	mapObject, memoize1, merge, min, max, mmap, object, omit, pairs, pick,
	pluck, range, some, sorted, sortByI, updateIn, uniq, values} =
	require('../underscore_ext').default;
var {userServers} = require('./servers');
var {categoryMore} = require('../colorScales');

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

export var availableMaps = (cohorts, cohortDatasets) =>
	!cohorts.length || !cohortDatasets ? [] :
	cohorts.map(cohortMaps(cohortDatasets)).flat();

var {parse} = JSON;

var cellTypeCluster = datasets =>
	datasets.map(ds => getProps(ds.cluster, ds.celltype)
		.map(m => ({
			...parse(ds.dsID),
			field: m.feature,
			label: m.label,
			markers: m.markers
		}))).flat();

var defaultPhenotype = (datasets, cohortFeatures) =>
	datasets.map(ds => getProps(ds.defaultphenotype)
		.map(m =>
			Let(({host, name} = JSON.parse(ds.dsID)) => ({
				host,
				name,
				field: m.feature,
				label: m.label,
				type: type(getIn(cohortFeatures, [host, name, m.feature],
				                 {valueType: 'float'}))
			})))).flat();

var signature = datasets =>
	datasets.map(ds => getProps(ds.signatureassignment)
		.map(m => ({
			...parse(ds.dsID),
			field: m.assignment,
			label: m.label
		}))).flat();

var signatureScore = datasets =>
	datasets.map(ds => getProps(ds.signaturescorematrix).map(m =>
		m.category.map(field => ({
			...parse(ds.dsID),
			field,
			label: field,
			type: 'float'
		}))).flat()).flat();

var signatureScorePanel = datasets =>
	datasets.map(ds => getProps(ds.signaturescorematrix).map(m => ({
		...parse(ds.dsID),
		field: m.category,
		label: m.label
	}))).flat();

var labelTransfer = datasets =>
	datasets.map(ds => getProps(ds.labeltransfer).map(m => ({
			...parse(ds.dsID),
			field: m.transferredLabel,
			label: m.label
		}))).flat();

var labelTransferProb = datasets =>
	datasets.map(ds => getProps(ds.labeltransferfullprob).map(m => ({
			...parse(ds.dsID),
			field: m.category,
			label: m.label
		}))).flat();

// XXX flatten this?
var donorFields = servers =>
	mapObject(servers, (host, datasets) =>
		keys(datasets).map(name =>
			map(pick(datasets[name], '_DONOR', '_DATASOURCE'),
				field => ({host, name, field: field.name}))).flat());

var empty = {
	cellType: {},
	labelTransfer: {},
	labelTransferProb: {},
	signature: {},
	signatureScore: {},
	signatureScorePanel: {},
	other: {}
};

//{'cellType': {[cohort]: [cellType, ...], ...}, ...}}
export var curatedFields = (cohorts, cohortDatasets, cohortFeatures) =>
	!cohorts.length ? empty :
	deepMerge(
		...cohorts.map(({cohort}) =>
			Let((ds = allCohortDatasets(cohort, cohortDatasets),
					features = get(cohortFeatures, cohort, {})) =>
				mapObject({
					donorFields: donorFields(features),
					cellType: cellTypeCluster(ds),
					labelTransfer: labelTransfer(ds),
					labelTransferProb: labelTransferProb(ds),
					signature: signature(ds),
					signatureScore: signatureScore(ds),
					signatureScorePanel: signatureScorePanel(ds),
					defaultPhenotype: defaultPhenotype(ds, features)
				}, d => ({[cohort]: d})))));


export var studyList = state => getIn(state, ['defaultStudy', 'studyList'], []);
var studyCohorts = study => get(study, 'cohortList', []);

var allCohorts1 = memoize1((studyList, id) =>
	Let((byId = object(pluck(studyList, 'study'), studyList),
			study = byId[id]) =>
		studyCohorts(byId[id]).concat(...get(study, 'subStudy', [])
			.map(({studyID}) => studyCohorts(byId[studyID])))));

export var allCohorts = state =>
	allCohorts1(studyList(state), get(state, 'integration'));

export var allDefaultCohortNames = memoize1(studyList =>
		uniq(pluck(studyList.map(studyCohorts).flat(), 'cohort')));

export var userServerCohorts = memoize1((servers, serverCohorts, cohorts) =>
	Let((us = userServers({servers})) =>
		mapObject(pick(serverCohorts, us), sc => intersection(sc, cohorts))));

var ignore = ['_DONOR', '_SAMPLE', 'sampleID', '_DATASOURCE'];
var dropIgnored = features =>
	mapObject(features, datasets =>
		mapObject(datasets, fields => omit(fields, ignore)));

var ensureArray = x => isArray(x) ? x : [x];

var dropFields = (features, {host, name, field}) =>
	updateIn(features, [host, name], ds => omit(ds, ensureArray(field)));

var curatedFieldKeys = ['labelTransfer', 'labelTransferProb', 'cellType',
	'signature', 'signatureScore', 'defaultPhenotype'];

var cohortOther = (cohort, state, features) =>
	Let((pruned = flatmap(curatedFieldKeys, k => state[k][cohort])
		.reduce(dropFields, dropIgnored(features))) =>
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

// XXX flatten
var hasField = field => (state, {type} = {}, cohort = datasetCohort(state)) =>
	type !== 'float' &&
	findValue(pairs(getIn(state, ['donorFields', cohort])),
		([host, fields]) => findValue(fields,
			f => f.field === field && [host, f.name]));

export var hasDonor = hasField('_DONOR');
export var hasDatasource = hasField('_DATASOURCE');

export var hasCellType = (state, {type} = {}, cohort = datasetCohort(state)) =>
	type !== 'float' &&
	(state.cellType[cohort].length || state.labelTransfer[cohort].length ||
		state.signature[cohort].length);

export var hasTransferProb = (state, {type, multi} = {}) =>
	type !== 'coded' && multi !== true &&
	state.labelTransferProb[datasetCohort(state)].length;

export var hasSignatureScore = (state, {type, multi} = {}) =>
	type !== 'coded' && multi !== true &&
	state.signatureScore[datasetCohort(state)].length;

// pred will be {type: <type>} or falsey
export var hasOther = (state, pred = identity) =>
	some(state.other[datasetCohort(state)], pred);

var hasGene0 = (state, {type} = {}) =>
	type !== 'coded' &&
	Let((cohort = datasetCohort(state),
		datasets = get(
			findValue(studyList(state),
				study => find(study.cohortList, c => c.cohort === cohort)),
			'preferredDataset')) =>
	get(datasets, 'length') && datasets);

export var hasGene = (state, {type, multi} = {}) =>
	!multi && hasGene0(state, {type});

export var hasGeneSet = (state, {type, multi} = {}) =>
	multi && hasGene0(state, {type});

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

export var getSamples = state => getIn(state,
	['samples', datasetCohort(state), 'samples']);

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

export var colorByMode = state => getIn(state, ['field', 'mode']);

export var hasShadow = state =>
	hasColorBy(state.colorBy) && !hasColorBy(state.colorBy2) &&
		!getIn(state.colorBy, ['data', 'codes']) ||
	hasColorBy(state.colorBy) && hasColorBy(state.colorBy2) &&
		getIn(state.colorBy, ['data', 'codes']);

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

// select component requires reference equality, so we have to find
// the matching option here.
export var cellTypeValue = state =>
	Let((field = pick(state.colorBy.field, 'host', 'name', 'field'),
			cohort = datasetCohort(state)) =>
		find(state.cellType[cohort].concat(state.labelTransfer[cohort])
			.concat(state.signature[cohort]), field) || '');

export var otherValue = state =>
	Let(({host, name, field} = state.colorBy.field,
			cohort = datasetCohort(state)) =>
		state.other[cohort]
			.find(other => other.name === name && other.host === host
				&& other.field === field) || '');

export var phenoValue = state =>
	Let(({host, name, field} = state.colorBy.field,
		cohort = datasetCohort(state)) =>
		state.defaultPhenotype[cohort]
		.find(f => f.host === host &&  f.name === name && f.field === field) || '');

export var sigPanelValue = state =>
	Let(({host, name, field} = state.colorBy.field,
			cohort = datasetCohort(state)) =>
		state.signatureScorePanel[cohort]
			.find(f => f.host === host && f.name === name &&
				isEqual(f.field, field)) || '');

export var probPanelValue = state =>
	Let(({host, name, field} = state.colorBy.field, cohort = datasetCohort(state)) =>
		state.labelTransferProb[cohort]
			.find(f => f.host === host && f.name === name &&
				isEqual(f.field, field)) || '');

export var cellTypeMarkers = state =>
	getIn(state, ['colorBy', 'field', 'mode']) === 'type' &&
		get(cellTypeValue(state), 'markers');

export var probValue = state =>
	Let((field = pick(state.colorBy.field, 'host', name)) =>
		find(state.labelTransferProb[datasetCohort(state)], field) || '');

export var sigValue = state =>
	Let((field = pick(state.colorBy.field, 'host', 'name', 'field'),
		cohort = datasetCohort(state)) =>
			find(state.signatureScore[cohort], field) || '');

var LetIf = (v, f) => v && f(v) ;

var firstOpt = list => first(sortByI(list, 'label'));

export var defaultColor = (state, cohort) =>
	hasCellType(state, {}, cohort) &&
		Let((opt = firstOpt(state.cellType[cohort]) ||
			firstOpt(state.labelTransfer[cohort]) ||
			firstOpt(state.signature[cohort])) => ({mode: 'type', ...opt})) ||
	LetIf(hasDonor(state, {}, cohort), ([host, name]) =>
		({mode: 'donor', host, name, field: '_DONOR'})) ||
	LetIf(hasDatasource(state, {}, cohort), ([host, name]) =>
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

var high = (low, a, b, c) =>
	low < a ? a :
	low < b ? b :
	c;

// color scale variant params
var FLOAT = {
	VARIANT: 0,
	COLOR: 2,
	LOW: 3,
	HIGH: 4
};

export var ORDINAL = {
	VARIANT: 0,
	COLORS: 1,
	CUSTOM: 2
};

var cmpStr = (i, j) => i < j ? 1 : j < i ? -1 : 0;

export var cmpCodes = codes => (i, j) =>
	Let((ci = codes[i], cj = codes[j]) =>
		isNaN(ci) && isNaN(cj) ? cmpStr(ci, cj) :
		isNaN(ci) ? 1 :
		isNaN(cj) ? -1 :
		+cj - +ci);

// color scale variants
var getLogScale = (color, {p95: [p95], p05: [p05], p99: [p99], max: [max]}) =>
	['float-log', null, color, p05, high(p05, p95, p99, max)];

var getLinearScale = (color, {p95: [p95], p05: [p05], p99: [p99], max: [max]}) =>
	['float-pos', null, color, p05, high(p05, p95, p99, max)];

// sort codes by their display order before assigning colors
var ordinalColors = codes =>
	Let((r = range(codes.length)) =>
		object(sorted(r, cmpCodes(codes)).reverse().map((c, i) =>
			[c, categoryMore[i % categoryMore.length]])));

export var getScale = (color, normalization, {codes, avg}) =>
	codes ? ['ordinal', codes.length, ordinalColors(codes)] :
	normalization === 'log2(x)' ? getLogScale(color, avg) :
	getLinearScale(color, avg);

export var isOrdinal = colors => colors && colors[0] === 'ordinal';
export var setColor = (scale, color) => assoc(scale, FLOAT.COLOR, color);
var getColor = scale => get(scale, FLOAT.COLOR);
export var mergeColor = (a, b) => setColor(a, getColor(b));

export var log2p1 = v => Math.log2(v + 1);
export var pow2m1 = v => Math.pow(2, v) - 1;
export var isLog = scale => get(scale, 0, '').indexOf('log') !== -1;

export var defaultShadow = 0.01;


var chartTypeThreshold = 40;

var defaultChartType = state =>
	Let((codes = getIn(state, ['chartX', 'data', 'codes'], {}),
			fields = getIn(state, ['chartY', 'data', 'field', 'field'], [])) =>
		codes.length * fields.length > chartTypeThreshold ? 'dot' : 'boxplot');

var chartTypeKey = state =>
	JSON.stringify([getIn(state, ['chartY', 'field']),
		getIn(state, ['chartX', 'field'])]);

export var getChartType = state =>
	getIn(state, ['chartType', chartTypeKey(state)], defaultChartType(state));

export var setChartType = (state, chartType) =>
	assocIn(state, ['chartType', chartTypeKey(state)], chartType);

export var isBoxplot = state => state.chartMode !== 'dist' &&
	getIn(state.chartY, ['data', 'field']) && !getIn(state.chartY, ['data', 'codes']);

export var isDot = state => isBoxplot(state) && getChartType(state) === 'dot';

var someNegative = data => min(getIn(data, ['avg', 'min'])) < 0;

// use singlecell expression mode in dot plot if data is not negative, and
// user hasn't explicitly disabled it.
export var expressionMode = state =>
	isDot(state) && !someNegative(getIn(state, ['chartY', 'data'])) &&
		getIn(state, ['chartState', 'yexpression']) !== 'bulk' ?
		'singleCell' : 'bulk';
