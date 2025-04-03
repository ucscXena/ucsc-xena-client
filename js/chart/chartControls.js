import {FormControl, MenuItem, TextField} from '@material-ui/core';
var {el, label, textNode} = require('./react-hyper');

var menuItem = el(MenuItem);
var formControl = el(FormControl);
var textField = el(TextField);

// XXX move to different file?
var compStyles = require('./chart.module.css');

var {reject} = require('../underscore_ext').default;

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
