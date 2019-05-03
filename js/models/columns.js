'use strict';

import multi from '../multi';
import * as xenaQuery from '../xenaQuery';
import {Observable, Scheduler} from '../rx';
import * as _ from '../underscore_ext';
import parsePos from '../parsePos';
import parseInput from '../parseInput';
import parseGeneSignature from '../parseGeneSignature';
import {signatureField} from '../models/fieldSpec';
import {defaultColorClass} from '../heatmapColors';

// XXX duplicated in VariableSelect.
var getAssembly = (datasets, dsID) =>
	_.getIn(datasets, [dsID, 'assembly'],
		_.getIn(datasets, [dsID, 'probemapMeta', 'assembly']));

export var guessFields = text => {
	var value = text.trim(),
		sig = parseGeneSignature(value),
		pos = parsePos(value),
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

export var matchDatasetFields = multi((datasets, dsID, input) => {
	var meta = datasets[dsID],
		{sig} = guessFields(input);
	// Do field matching against probemap if we have one & aren't doing a signature.
	return meta.type === 'genomicMatrix' && meta.probemap && !sig ? 'genomicMatrix-probemap' : meta.type;
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
		xenaQuery.sparseDataMatchGenes(host, probemap, guess.fields),
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
	var guess = guessFields(input),
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

function getFieldType(dataset, fields, probes, pos) {
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
	return  probes ? 'probes' : ((fields.length > 1 && !pos) ? 'genes' : 'geneProbes');
}

function sigFields(fields, {genes, weights}) {
	return {
		missing: genes.filter((p, i) => !fields[i]),
		genes: fields.filter(p => p),
		weights: weights.filter((p, i) => fields[i])
	};
}

var getDefaultVizSettings = meta =>
	// use default vizSettings if we have min and max.
	_.has(meta, 'min') && _.has(meta, 'max') ? {vizSettings: _.pick(meta, 'min', 'max', 'minstart', 'maxstart')} : {};

function columnSettings(datasets, features, dsID, matches) {
	var {fields, value: input} = matches,
		probes = matches.type === 'probes',
		meta = datasets[dsID],
		pos = parsePos(input.trim(), getAssembly(datasets, dsID)),
		sig = parseGeneSignature(input.trim()),
		fieldType = getFieldType(meta, fields, probes, pos),
		fieldsInput = sig ? sig.genes : parseInput(input),
		normalizedFields = (
			pos ? [`${pos.chrom}:${pos.baseStart}-${pos.baseEnd}`] :
				((['segmented', 'mutation', 'SV'].indexOf(fieldType) !== -1) ?
					[fields[0]] : fields).map((f, i) => f ? f : fieldsInput[i] + " (unknown)"));

	// My god, this is a disaster.
	if (sig) {
		let {missing, genes, weights} = sigFields(fields, sig),
			missingLabel = _.isEmpty(missing) ? '' : ` (missing terms: ${missing.join(', ')})`;
		return signatureField('signature' + missingLabel, {
			signature: ['geneSignature', dsID, genes, weights],
			missing,
			fieldType: 'probes',
			defaultNormalization: meta.colnormalization,
			colorClass: defaultColorClass,
			fields: [input],
			dsID
		});
	}

	return {
		...(fieldType === 'geneProbes' ? {showIntrons: true} : {}),
		...(_.getIn(meta, ['probemapMeta', 'dataSubType']) === 'regulon' ? {clustering: 'probes'} : {}),
		...(getDefaultVizSettings(meta)),
		fields: normalizedFields,
		fetchType: 'xena',
		valueType: getValueType(meta, features[dsID], fields),
		fieldType: fieldType,
		dsID,
		defaultNormalization: meta.colnormalization,
		// XXX this assumes fields[0] doesn't appear in features if ds is genomic
		//fieldLabel: _.getIn(features, [dsID, fields[0], 'longtitle'], fields.join(', ')),
		fieldLabel: _.getIn(features, [dsID, fields[0], 'longtitle']) || normalizedFields.join(', '),
		colorClass: defaultColorClass,
		assembly: meta.assembly || _.getIn(meta, ['probemapMeta', 'assembly'])
	};
}

export var computeSettings = _.curry((datasets, features, opts, dataset, matches) => {
	var ds = datasets[dataset];
	var settings = columnSettings(datasets, features, dataset, matches),
		columnLabel = ((ds.dataSubType && !ds.dataSubType.match(/phenotype/i)) ? (ds.dataSubType + ' - ') : '') +
			(ds.dataSubType && ds.dataSubType.match(/phenotype/i) ? '' : ds.label);

	// XXX need a way to validate settings that depend on column type, i.e.
	// fieldType geneProbes only works for matrix with probemap.
	// Or, a possible refactor of the schema to make this simpler?
	return _.assocIn(settings,
		['width'], _.contains(['mutationVector', 'segmented'], ds.type) ? typeWidth.chrom : typeWidth.matrix,
		['dataset'], ds,
		['columnLabel'], columnLabel,
		['user'], {columnLabel: columnLabel, fieldLabel: settings.fieldLabel},
		...(opts || []).flatten()
	);

});

