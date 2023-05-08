var {deepMerge, every, find, findValue, first, get, getIn, identity, Let, merge, minnull, maxnull, mmap, object, pairs, pick, values} = require('../underscore_ext').default;

var getProps = (...arrs) => arrs.map(a => a || []).flat();

// array of cohort datasets from all hosts
var allCohortDatasets = (cohort, cohortDatasets) =>
	values(get(cohortDatasets, cohort)).flat();

var cohortMaps = cohortDatasets => ({cohort}) =>
	allCohortDatasets(cohort, cohortDatasets)
		.map(ds => getProps(ds.map)
			.map(m => merge({dsID: ds.dsID, cohort},
				pick(m, 'label', 'type', 'dimension', 'image', 'spot_diameter'))))
		.flat();

export var maps = (cohorts, cohortDatasets) =>
	!cohorts.length || !cohortDatasets ? [] :
	cohorts.map(cohortMaps(cohortDatasets)).flat();


var cellTypeCluster = datasets =>
	datasets.map(ds => getProps(ds.cluster, ds.celltype)
		.map(m => ({
			dsID: ds.dsID,
			field: m.feature,
			label: m.label
		}))).flat();

var labelTransfer = datasets =>
	datasets.map(ds => getProps(ds.labeltransfer).map(m => ({
			dsID: ds.dsID,
			field: m.transferredLabel,
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
	labelTransferProb: {}
};

//{'cellType': {[cohort]: [cellType, ...], ...}, ...}}
export var cohortFields = (cohorts, cohortDatasets) =>
	!cohorts.length ? empty :
	deepMerge(
		...cohorts.map(({cohort}) =>
			Let((ds = allCohortDatasets(cohort, cohortDatasets)) =>
				object(
					['cellType', 'labelTransfer', 'labelTransferProb'],
					[cellTypeCluster(ds), labelTransfer(ds), labelTransferProb(ds)]
					.map(d => ({[cohort]: d}))))));

export var hasDataset = state => getIn(state, ['dataset', 'dsID']);

export var datasetCohort = state => getIn(state, ['dataset', 'cohort']);

var hasField = field => (state, cohort = datasetCohort(state)) =>
	findValue(pairs(getIn(state, ['donorFields', cohort])),
		([host, fields]) => findValue(fields,
			f => f.field === field && [host, f.name]));

export var hasDonor = hasField('_DONOR');
export var hasDatasource = hasField('_DATASOURCE');

export var hasCellType = (state, cohort = datasetCohort(state)) =>
	state.cellType[cohort].length || state.labelTransfer[cohort].length;

export var hasTransferProb = (state, cohort = datasetCohort(state)) =>
	state.labelTransferProb[cohort].length;

export var hasGene = (state, cohort = datasetCohort(state)) =>
	get(
		findValue(getIn(state, ['defaultStudy', 'studyList']),
			study => find(study.cohortList, c => c.cohort === cohort)),
		'preferredDataset');

var studyById = (state, id) =>
		getIn(state, ['defaultStudy', 'studyList'], [])
			.find(s => s.study === id);

var userStudy = state => studyById(state, get(state, 'integration'));

var studyCohorts = study => get(study, 'cohortList', []);
var subStudies = (state, study) => get(study, 'subStudy', []).map(ref =>
	studyById(state, ref.studyID));

export var allCohorts = state =>
		Let((st = userStudy(state)) =>
			studyCohorts(st).concat(...subStudies(state, st).map(studyCohorts)));

export var dotRange = Let((ratio = 4) =>
	radius => ({min: radius / ratio, max: radius * ratio,
		step: radius * (ratio - 1 / ratio) / 200}));

var nvolume = (mins, maxs) => mmap(mins, maxs, (min, max) => max - min)
			.reduce((x, y) => x * y);

// In a latent space, more dimensions will pack points more tightly together
// when they are projected to the 2d viewport. Here we estimate the radius of
// the data points as a whole, using the bounds of the data, then compute a
// dot radius based on fill percentage of a 2d view.
var pickRadius = (mins, maxs, len, pct = 0.3) =>
	Let((R = Math.pow(nvolume(mins, maxs),  1 / mins.length)) =>
		 pct * R / Math.sqrt(len));

var allCols = data => values(data).map(c => getIn(c, ['req', 'values', 0]));
export var setRadius = (sd, datasetData) =>
	Let((data = allCols(datasetData)) =>
		!(data.length && every(data, identity)) ? NaN :
		Let((mins = data.map(minnull), maxs = data.map(maxnull)) =>
			sd ? sd / 2 : pickRadius(mins, maxs, data[0].length)));

export var getRadius = state => get(state, 'radius') || get(state, 'radiusBase');

export var getSamples = state => getIn(state,
	['samples', datasetCohort(state), 'samples']);

export var dataLoading = state =>
	Let(({dsID, dimension} = state.dataset) =>
		dimension.some(dim =>
			!getIn(state, ['data', dsID, dim, 'req']) ||
				getIn(state, ['_outOfDate', 'data', dsID, dim])));

export var dataError = state =>
	Let(({dsID, dimension} = state.dataset) =>
		dimension.some(dim =>
			!getIn(state, ['_outOfDate', 'data', dsID, dim]) &&
			getIn(state, ['data', dsID, dim, 'status']) === 'error'));

export var colorLoading = state =>
	getIn(state, ['colorBy', 'field', 'mode']) &&
	(!getIn(state, ['colorBy', 'data']) ||
		getIn(state, ['_outOfDate', 'colorBy', 'data']));

export var colorError = state =>
	getIn(state, ['colorBy', 'field', 'mode']) &&
	!getIn(state, ['_outOfDate', 'colorBy', 'data']) &&
	getIn(state, ['colorBy', 'data', 'status']) === 'error';

export var getDataSubType = (state, host, name) =>
	getIn(state.datasetMetadata, [host, name, 'dataSubType']);

var toDsID = a => JSON.stringify(pick(a, 'host', 'name'));
// select component requires reference equality, so we have to find
// the matching option here.
export var cellTypeValue = state =>
	Let((dsID = toDsID(state.colorBy.field), {field} = state.colorBy.field,
			cohort = datasetCohort(state)) =>
		state.cellType[cohort].concat(state.labelTransfer[cohort])
			.find(t => t.dsID === dsID && t.field === field) || '');

export var probValue = state =>
	Let((dsID = toDsID(state.colorBy.field)) =>
		state.labelTransferProb[datasetCohort(state)].find(t => t.dsID === dsID) || '');

var LetIf = (v, f) => v && f(v) ;

export var defaultColor = (state, cohort) =>
	LetIf(hasDonor(state, cohort), ([host, name]) =>
		({mode: 'donor', host, name, field: '_DONOR'})) ||
	LetIf(hasDatasource(state, cohort), ([host, name]) =>
		({mode: 'datasource', host, name, field: '_DATASOURCE'})) ||
	hasCellType(state, cohort) &&
		Let(({dsID, field} = first(state.cellType[cohort]) ||
			first(state.labelTransfer[cohort]), {host, name} = JSON.parse(dsID)) =>
				({mode: 'type', host, name, field})) ||
	{};
