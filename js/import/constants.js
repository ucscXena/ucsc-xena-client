'use strict';

const getDropdownOptions = strArr => strArr.map(val => ({ label: val, value: val }));

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
	"",
	DATA_TYPE.PHENOTYPE,
	"expression",
	"gene-level copy number ",
	DATA_TYPE.SEGMENTED_CN,
	DATA_TYPE.MUTATION_BY_POS,
	"gene-level mutation",
	"methylation"
];

const steps = [
	{ label: 'Select a Data File' },
	{ label: 'Add Data Details' },
	{ label: 'Load Data' }
];

const NONE_STR = 'None of these';

module.exports = {
	dataTypeOptions: getDropdownOptions(dataTypesOpts),
	steps,
	NONE_STR,
	DATA_TYPE,
	FILE_FORMAT
};
