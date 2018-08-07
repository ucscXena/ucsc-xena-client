'use strict';

const getDropdownOptions = strArr => strArr.map(val => ({ label: val, value: val }));

const dataTypes = [
	"",
	"phenotype",
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

module.exports = {
    dataTypeOptions: getDropdownOptions(dataTypes),
    steps,
    NONE_STR
};
