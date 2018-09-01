'use strict';

const DATA_TYPE = {
	PHENOTYPE: 'phenotype',
	MUTATION_BY_POS: 'mutation by position',
	SEGMENTED_CN: 'segmented copy number'
};

const FILE_FORMAT = {
	CLINICAL_MATRIX: 'clinicalMatrix',
	GENOMIC_MATRIX: 'genomicMatrix',
	MUTATION_VECTOR: 'mutationVector',
	GENOMIC_SEGMENT: 'genomicSegment'
};

const dataTypesOpts = [
	{
		label: '',
		value: ''
	},
	{
		label: 'phenotype/clinical/sample type',
		value: DATA_TYPE.PHENOTYPE
	},
	{
		label: 'expression',
		value: "expression"
	},
	{
		label: 'gene-level copy number',
		value: 'gene-level copy number'
	},
	{
		label: DATA_TYPE.SEGMENTED_CN,
		value: DATA_TYPE.SEGMENTED_CN
	},
	{
		label: DATA_TYPE.MUTATION_BY_POS,
		value: DATA_TYPE.MUTATION_BY_POS
	},
	{
		label: 'gene-level mutation',
		value: 'gene-level mutation'
	},
	{
		label: 'methylation',
		value: 'methylation'
	}
];

const PAGES = {
	PROBE_SELECT: 4,
	PROGRESS: 6,
};

const steps = [
	{ label: 'Select a Data File' },
	{ label: 'Add Data Details' },
	{ label: 'Load Data' }
];

const NONE_STR = 'None of these';

module.exports = {
	dataTypeOptions: dataTypesOpts,
	steps,
	NONE_STR,
	DATA_TYPE,
	FILE_FORMAT,
	PAGES,
};
