var {find, findValue, get, getIn, Let, merge, pairs, pick, values} = require('../underscore_ext').default;

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
	datasets.map(ds => getProps(ds.cluster, ds.cellType)
		.map(m => ({
			dsID: ds.dsID,
			field: m.feature,
			label: m.assay
		}))).flat();

var labelTransfer = datasets =>
	datasets.map(ds => getProps(ds.labeltransfer).map(m => ({
			dsID: ds.dsID,
			field: m.transferredLabel,
			label: m.assay
		}))).flat();

var labelTransferProb = datasets =>
	datasets.map(ds => getProps(ds.labeltransferfullprob).map(m => ({
			dsID: ds.dsID,
			category: m.category,
			label: m.assay
		}))).flat();

var empty = {
	cellType: [],
	labelTransfer: [],
	labelTransferProb: []
};

export var cohortFields = (cohort, cohortDatasets) =>
	!cohort ? empty :
	Let((ds = allCohortDatasets(cohort, cohortDatasets)) => ({
		cellType: cellTypeCluster(ds),
		labelTransfer: labelTransfer(ds),
		labelTransferProb: labelTransferProb(ds)
	}));

export var hasDataset = state => getIn(state, ['dataset', 'dsID']);

export var datasetCohort = state => getIn(state, ['dataset', 'cohort']);

var hasField = field => (state, cohort) =>
	findValue(pairs(getIn(state, ['donorFields', cohort])),
		([host, fields]) => findValue(fields,
			f => f.field === field && [host, f.name]));

export var hasDonor = hasField('_DONOR');
export var hasDatasource = hasField('_DATASOURCE');

export var hasGene = (state, cohort) =>
	get(
		findValue(getIn(state, ['defaultStudy', 'studyList']),
			study => find(study.cohortList, c => c.cohort === cohort)),
		'preferredDataset');

var studyById = state => id =>
		getIn(state, ['defaultStudy', 'studyList'], [])
			.find(s => s.study === id);

export var userStudyId = state => get(state, 'integration');
var userStudy = state => studyById(state)(userStudyId(state));

var studyCohorts = study => get(study, 'cohortList', []);
var subStudies = (state, study) => get(study, 'subStudy', []).map(ref =>
	studyById(state)(ref.studyID));

export var allCohorts = state =>
		Let((st = userStudy(state)) =>
			studyCohorts(st).concat(...subStudies(state, st).map(studyCohorts)));
