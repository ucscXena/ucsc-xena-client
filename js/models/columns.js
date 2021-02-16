import multi from '../multi';
var xenaQuery = require('../xenaQuery');
var {Observable, Scheduler} = require('../rx').default;
var _ = require('../underscore_ext').default;
import parsePos from '../parsePos';
import parseInput from '../parseInput';
import parseGeneSignature from '../parseGeneSignature';
var {signatureField} = require('../models/fieldSpec');
import {defaultColorClass} from '../heatmapColors';

// XXX duplicated in VariableSelect.
var getAssembly = (datasets, dsID) =>
	_.getIn(datasets, [dsID, 'assembly'],
		_.getIn(datasets, [dsID, 'probemapMeta', 'assembly']));

export var guessFields = (text, assembly) => {
	var value = text.trim(),
		sig = parseGeneSignature(value),
		pos = parsePos(value, assembly),
		hasCoord = value.match(/^chr[0-9xyXY]+[pq]?:/),
		fields = sig ? sig.genes :
			pos ? [value] :
			parseInput(value);

	return {
		value,
		fields,
		sig,
		pos,
		hasCoord
	};
};

export var matchDatasetFields = multi((datasets, dsID) => {
	var meta = datasets[dsID];
	// Do field matching against probemap if we have one
	return meta.type === 'genomicMatrix' && meta.probemap ? 'genomicMatrix-probemap' : meta.type;
});

// XXX The error handling here isn't great, because it can leave us with a
// field of the wrong case, e.g. foxm1 vs. FOXM1, or treat a probe as a gene.
// However, it's better to handle it than to lose the observable, which wedges
// the widget. Better handling would warn the user and wait for the network
// error to clear.

// default to probes
matchDatasetFields.dflt = (datasets, dsID, input) => {
	var guess = guessFields(input, getAssembly(datasets, dsID)),
		{fields, pos} = guess,
		warning = pos ? 'position-unsupported' : undefined;
	return xenaQuery.matchFields(dsID, fields).map(fields => ({
		...guess,
		type: 'probes',
		warning,
		fields
	})).catch(err => {
		console.log(err);
		return Observable.of({type: 'probes', warning, fields: fields}, Scheduler.asap);
	});
};

var geneProbeMatch = (host, dsID, probemap, guess) =>
	Observable.zip(
		xenaQuery.matchGenesWithProbes(dsID, guess.fields),
		xenaQuery.matchFields(dsID, guess.fields),
		(genes, probes) => _.filter(probes).length > _.filter(genes).length ?
			{...guess, type: 'probes', fields: probes} :
			{...guess, type: 'genes', fields: genes}
	).catch(err => {
		console.log(err);
		return Observable.of({...guess, type: 'genes'}, Scheduler.asap);
	});

var MAX_PROBES = 500;
var chromLimit = (host, probemap, guess) =>
	xenaQuery.maxRange(host, probemap, guess.pos.chrom,
				guess.pos.baseStart, guess.pos.baseEnd, MAX_PROBES)
		.map(([end]) => ({
			...guess,
			type: 'chrom',
			...(end != null ? {
				warning: 'too-many-probes',
				start: guess.pos.baseStart,
				end: end - 1} : {})
		}));

matchDatasetFields.add('genomicMatrix-probemap', (datasets, dsID, input) => {
	const guess = guessFields(input, getAssembly(datasets, dsID)),
		{host} = JSON.parse(dsID),
		probemap = datasets[dsID].probemap;
	return guess.pos ? chromLimit(host, probemap, guess)
		: geneProbeMatch(host, dsID, probemap, guess);
});

var matchAnyPosition = guess => Observable.of({...guess, type: 'chrom'}, Scheduler.asap);

var normalizeGenes = (host, dsID, guess) =>
	xenaQuery.sparseDataMatchField(host, 'name2', dsID, guess.fields).map(fields => ({
			...guess,
			type: 'genes',
			fields
		}));

function matchWithAssembly(datasets, dsID, input) {
	var guess = guessFields(input, getAssembly(datasets, dsID)),
		ref = xenaQuery.refGene[datasets[dsID].assembly];
	return (guess.pos ? matchAnyPosition(guess) : normalizeGenes(ref.host, ref.name, guess)).catch(err => {
		console.log(err);
		return Observable.of({...guess, type: 'genes'}, Scheduler.asap);
	});
}

matchDatasetFields.add('genomicSegment', matchWithAssembly);
matchDatasetFields.add('mutationVector', matchWithAssembly);

function matchPhenotype(datasets, dsID, input) {
	return Observable.of({value: input, fields: [input]}, Scheduler.asap);
}

matchDatasetFields.add('clinicalMatrix', matchPhenotype);

// need to handle
// phenotypic,
// null field, null dataset
// sparse,
// dense with probemap,
// dense without probemap

export var typeWidth = {
	matrix: 136,
	chrom: 200
};

var typeClass = dataset =>
	_.contains(['mutationVector', 'segmented'], dataset.type) ? 'chrom' :
	'matrix';

// 'features' is a problem here, because they are not unique across datasets.
// How do we look up features w/o a dataset?
function getValueType(dataset, features, fields) {
	var {type} = dataset,
		valuetype = _.getIn(features, [fields[0], 'valuetype']);
	return type === 'mutationVector' ? 'mutation' :
		type === 'genomicSegment' ? 'segmented' :
		type === 'clinicalMatrix' && valuetype === 'category' ? 'coded' :
		'float';
}

function getFieldType(dataset, fields, matches, pos) {
	var {sig, type} = matches;
	if (sig) {
		return type;
	}
	if (dataset.type === 'mutationVector') {
		return dataset.dataSubType.search(/SV|structural/i) !== -1 ? 'SV' : 'mutation';
	}
	if (dataset.type === 'genomicSegment') {
		return 'segmented';
	}
	if (dataset.type === 'clinicalMatrix') {
		return 'clinical';
	}
	// We treat probes in chrom view (pos) as geneProbes
	return  type === 'probes' ? 'probes' : ((fields.length > 1 && !pos) ? 'genes' : 'geneProbes');
}

function sigFields(fields, {genes, weights}) {
	var matches = new Set(fields.map(s => s.toLowerCase()));
	return {
		missing: genes.filter(g => !matches.has(g.toLowerCase())),
		genes: fields,
		weights: weights.filter((p, i) => matches.has(genes[i].toLowerCase()))
	};
}

// use vizSettings set in .json metadata
var getDefaultVizSettings = meta =>
	_.has(meta, 'min') && _.has(meta, 'max') ? {vizSettings: _.pick(meta, 'min', 'max', 'minstart', 'maxstart')} :
	_.has(meta, 'origin') && _.has(meta, 'thresh') && _.has(meta, 'max') ? {vizSettings: _.pick(meta, 'origin', 'max', 'thresh')} :
	{};

var xenaField = (datasets, features, settings) => ({
	...settings,
	fetchType: 'xena',
	...(_.getIn(settings.dataset, ['probemapMeta', 'dataSubType']) === 'regulon' ? {clustering: 'probes'} : {}),
	...getDefaultVizSettings(settings.dataset),
	valueType: getValueType(settings.dataset, features[settings.dsID], settings.fields),
	assembly: getAssembly(datasets, settings.dsID)
});

function columnSettings(datasets, features, dsID, matches) {
	var {fields, value, pos, sig} = matches,
		dataset = datasets[dsID],
		fieldType = getFieldType(dataset, fields, matches, pos),
		{missing, genes, weights} = sig ? sigFields(fields, sig) : {},
		normalizedFields =
			sig ? [value] :
			pos ? [`${pos.chrom}:${pos.baseStart}-${pos.baseEnd}`] :
			_.contains(['segmented', 'mutation', 'SV'], fieldType) ? [fields[0]] :
			fields,
		columnLabel =
			!dataset.dataSubType ? dataset.label :
			dataset.dataSubType.match(/phenotype/i) ? '' :
			`${dataset.dataSubType} - ${dataset.label}`,
		fieldLabel =
			sig ? `signature${_.isEmpty(missing) ? '' : ` (missing terms: ${missing.join(', ')})`}` :
			dataset.type === 'clinicalMatrix' ? _.getIn(features, [dsID, fields[0], 'longtitle']) || fields[0] :
			normalizedFields.join(', '),
		defaults = {
			...(['geneProbes', 'segmented', 'SV'].indexOf(fieldType) !== -1 ? {showIntrons: true} : {}),
			colorClass: defaultColorClass,
			columnLabel,
			dataset,
			defaultNormalization: dataset.colnormalization,
			dsID,
			fields: normalizedFields,
			fieldLabel,
			fieldType,
			user: {columnLabel, fieldLabel},
			value,
			width: typeWidth[typeClass(dataset)],
		};

	return sig ? signatureField(fieldLabel, {
			...defaults,
			signature: ['geneSignature', dsID, genes, weights],
			missing
		}) : xenaField(datasets, features, defaults);
}

export var computeSettings = _.curry((datasets, features, opts, dataset, matches) => {
	var settings = columnSettings(datasets, features, dataset, matches);

	// XXX need a way to validate settings that depend on column type, i.e.
	// fieldType geneProbes only works for matrix with probemap.
	// Or, a possible refactor of the schema to make this simpler?
  return _.assocIn(settings, ...(opts || []).flat());

});
