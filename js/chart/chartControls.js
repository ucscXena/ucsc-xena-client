import {FormControl, MenuItem, TextField} from '@material-ui/core';
import { el, label, textNode } from './react-hyper.js';
import { get } from '../underscore_ext.js';

var menuItem = el(MenuItem);
var formControl = el(FormControl);
var textField = el(TextField);

// XXX move to different file?
import compStyles from "./chart.module.css";

import { reject } from '../underscore_ext.js';

export var selectProps = {
	className: compStyles.formControl,
	select: true,
	SelectProps: {
		MenuProps: {
			style: {width: 224},
		},
	},
	size: 'small',
	variant: 'outlined'
};

var dropdownOpt = (opts, value, index = 0) => (opts.find(({value: v}) =>
	v === value) || opts[index]);

export var getOpt = opt => menuItem({key: opt.value, dense: true,
	disabled: opt.disabled, value: opt.value}, opt.label);

export var buildDropdown = ({disabled = false, index = 0, label: text,
                             onChange, opts, value}) =>
	formControl({className: compStyles.chartAction},
		label(textNode(text)),
		textField({
			disabled,
			onChange: ev => onChange(opts.findIndex(o => o.value === ev.target.value),
			                         ev.target.value),
			value: dropdownOpt(opts, value, index).value,
			...selectProps},
			...opts.map(getOpt)));

var viewOptions = [
	{label: 'box plot', value: 'boxplot'},
	{label: 'violin plot', value: 'violin'},
	{label: 'dot plot', value: 'dot'}
];

export var chartTypeControl = ({onChange, chartType, hasDot = true}) =>
	buildDropdown({
		label: 'Chart type',
		onChange,
		opts: reject(viewOptions, hasDot ? false : {value: 'dot'}),
		value: chartType});

export var normalizationOptions = [{
		"value": "none",
		"label": "none",
	}, //no normalization
	{
		"value": "subset",
		"label": "subtract mean",
	}, //selected sample level current heatmap normalization
	{
		"value": "subset_stdev",
		"label": "subtract mean, divide stdev (z-score)",
	} //selected sample level current heatmap normalization
];

export var normalizationControl = ({onChange, isDot, isDensity, index}) =>
	buildDropdown({
		index,
		label: isDot ? 'Continuous data linear transform' :
			isDensity ? 'Data linear transform' :
			'Y data linear transform',
		onChange, opts: normalizationOptions});

var expressionOptions = [
	{label: 'continuous value data', value: 'bulk'},
	{label: 'single cell count data', value: 'singleCell'}
];

export function expressionMode(chartState, yneg) {
	var {chartType, expressionState, ycolumn} = chartState;
	// 'bulk' expression mode only for chart types other than dot plot
	if (chartType !== 'dot') {return 'bulk';}
	// 'bulk' expression mode only for negative values
	if (yneg) {return 'bulk';}
	// 'bulk' or 'singleCell' expression mode is available for dot plots with positive values
	return get(expressionOptions[expressionState[ycolumn]], 'value');
}

export var yExpressionControl = ({onChange, index, value}) =>
	buildDropdown({index, value, label: 'View as', onChange, opts: expressionOptions});
