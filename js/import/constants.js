'use strict';

const getDropdownOptions = strArr => strArr.map(val => ({ label: val, value: val }));

const dataTypes = [
	"",
	"phenotype/clinical/sample type",
	"expression",
	"gene-level copy number ",
	"segmented copy number",
	"mutation by position",
	"gene-level mutation",
	"methylation"
];

const steps = [
	{ label: 'Select a Data File' },
	{ label: 'Add Data Details' },
	{ label: 'Load Data' }
];

const NONE_STR = 'None of these';

// const tempGeneOptions = [
// 	'',
// 	'Gene1',
// 	'Gene2',
// 	NONE_STR
// ];
// const tempProbeOptions = [
// 	'',
// 	'Probe 1',
// 	'Probe 2',
// 	NONE_STR
// ];

module.exports = {
    dataTypeOptions: getDropdownOptions(dataTypes),
    steps,
    // tempGeneOptions,
    // tempProbeOptions,
    NONE_STR
};
