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

var matchDatasetFields = multi((datasets, dsID, {sig}) => {
	var meta = datasets[dsID];
	return meta.type === 'genomicMatrix' && meta.probemap && !sig ? 'genomicMatrix-probemap' : meta.type;
});

// XXX The error handling here isn't great, because it can leave us with a
// field of the wrong case, e.g. foxm1 vs. FOXM1, or treat a probe as a gene.
// However, it's better to handle it than to lose the observable, which wedges
// the widget. Better handling would warn the user and wait for the network
// error to clear.

// default to probes
matchDatasetFields.dflt = (datasets, dsID, {fields, isPos}) => {
	var warning = isPos ? 'position-unsupported' : undefined;
	return xenaQuery.matchFields(dsID, fields).map(fields => ({
		type: 'probes',
		warning,
		fields
	})).catch(err => {
		console.log(err);
		return Observable.of({type: 'probes', warning, fields: fields}, Scheduler.asap);
	});
};

var geneProbeMatch = (host, dsID, probemap, fields) =>
	Observable.zip(
		xenaQuery.sparseDataMatchGenes(host, probemap, fields),
		xenaQuery.matchFields(dsID, fields),
		(genes, probes) => _.filter(probes, _.identity).length > _.filter(genes, _.identity).length ?
			{
				type: 'probes',
				fields: probes
			} : {
				type: 'genes',
				fields: genes
			}).catch(err => {
		console.log(err);
		return Observable.of({type: 'genes', fields: fields}, Scheduler.asap);
	});

var MAX_PROBES = 500;
var chromLimit = (host, probemap, pos, fields) =>
	xenaQuery.maxRange(host, probemap, pos.chrom, pos.baseStart, pos.baseEnd, MAX_PROBES)
		.map(([end]) => ({
			type: 'chrom',
			fields,
			...(end != null ? {
				warning: 'too-many-probes',
				start: pos.baseStart,
				end: end - 1} : {})
		}));

matchDatasetFields.add('genomicMatrix-probemap', (datasets, dsID, {value, fields}) => {
	const {host} = JSON.parse(dsID),
		probemap = datasets[dsID].probemap,
		pos = parsePos(value, datasets[dsID].probemapMeta.assembly);
	return pos ? chromLimit(host, probemap, pos, fields)
		: geneProbeMatch(host, dsID, probemap, fields);
});

var matchAnyPosition = fields => Observable.of({type: 'chrom', fields: fields}, Scheduler.asap);

var normalizeGenes = (host, dsID, genes) =>
	xenaQuery.sparseDataMatchField(host, 'name2', dsID, genes).map(fields => ({
			type: 'genes',
			fields
		}));

function matchWithAssembly(datasets, dsID, {fields, isPos}) {
	var ref = xenaQuery.refGene[datasets[dsID].assembly];
	return (isPos ? matchAnyPosition(fields) : normalizeGenes(ref.host, ref.name, fields)).catch(err => {
		console.log(err);
		return Observable.of({type: 'genes', fields: fields}, Scheduler.asap);
	});
}

matchDatasetFields.add('genomicSegment', matchWithAssembly);
matchDatasetFields.add('mutationVector', matchWithAssembly);

export var isValueValid = {
	Genotypic: value => value.trim().length > 0,
	Phenotypic: () => true
};

export var isValid = {
	Genotypic: (value, selected) => isValueValid.Genotypic(value) && selected.length > 0,
	Phenotypic: (value, selected) => selected.length > 0
};

var guessFields = text => {
	var value = text.trim(),
		sig = parseGeneSignature(value),
		isPos = value.match(/^chr[0-9xyXY]+[pq]?/),
		hasCoord = value.match(/^chr[0-9xyXY]+[pq]?:/),
		fields = sig ? sig.genes :
			isPos ? [value] :
			parseInput(value);

	return {
		value,
		fields,
		sig,
		isPos,
		hasCoord
	};
};

// need to handle
// phenotypic,
// null field, null dataset
// sparse,
// dense with probemap,
// dense without probemap
// XXX can we deprecate 'mode', since we can get it from datasets[selected]?
export function matchFields(datasets, mode, selected, text) {
	if (mode === 'Phenotypic') {
		return Observable.of({valid: isValid.Phenotypic(text, selected), matches: [{fields: [text.trim()]}]}, Scheduler.asap);
	}
	var guess = guessFields(text);
	if (isValid.Genotypic(text, selected)) {
		// Be sure to handle leading and trailing commas, as might occur during user edits
		return Observable.zip(
			...selected.map(dsID => matchDatasetFields(datasets, dsID, guess)),
			(...matches) => ({matches, guess, valid: !_.any(matches, m => m.warning)}));
	}
	return Observable.of({valid: false, guess}, Scheduler.asap);
}

export var typeWidth = {
	matrix: 136,
	chrom: 200
};

// 'features' is a problem here, because they are not unique across datasets.
// How do we look up features w/o a dataset?
function getValueType(dataset, features, fields) {
	var {type} = dataset,
		valuetype = _.getIn(features, [fields[0], 'valuetype']);

	if (type === 'mutationVector') {
		return 'mutation';
	}
	if (type === 'genomicSegment') {
		return 'segmented';
	}
	if (type === 'clinicalMatrix') {
		return valuetype === 'category' ? 'coded' : 'float';
	}
	return 'float';
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

// XXX duplicated in VariableSelect.
var getAssembly = (datasets, dsID) =>
	_.getIn(datasets, [dsID, 'assembly'],
		_.getIn(datasets, [dsID, 'probemapMeta', 'assembly']));

var getDefaultVizSettings = meta =>
	// use default vizSettings if we have min and max.
	_.has(meta, 'min') && _.has(meta, 'max') ? {vizSettings: _.pick(meta, 'min', 'max', 'minstart', 'maxstart')} : {};

// XXX handle position in all genomic datatypes?
function columnSettings(datasets, features, dsID, input, fields, probes) {
	var meta = datasets[dsID],
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

export var computeSettings = _.curry((datasets, features, inputFields, opts, dataset, matches) => {
	var ds = datasets[dataset];
	var settings = columnSettings(datasets, features, dataset, inputFields, matches.fields, matches.type === 'probes'),
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

