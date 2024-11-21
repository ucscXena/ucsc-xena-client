import PureComponent from '../PureComponent';
var React = require('react');
var gaEvents = require('../gaEvents');
import {
	Box,
	Button,
	Card,
	CardActions,
	CardContent,
	CardHeader,
	FormControl,
	FormControlLabel,
	FormLabel,
	Icon,
	IconButton,
	MenuItem,
	Radio,
	RadioGroup,
	TextField
} from '@material-ui/core';
var _ = require('../underscore_ext').default;
import {v, suitableColumns, canDraw, boxOrViolinXDatasets, boxOrViolinYDatasets,
	isFloat, scatterYDatasets, scatterXDatasets} from './utils';
import './icons.css';
import {h2, i, span, el} from './react-hyper';
import classNames from 'classnames';

var box = el(Box);
var button = el(Button);
var card = el(Card);
var cardActions = el(CardActions);
var cardContent = el(CardContent);
var cardHeader = el(CardHeader);
var formControl = el(FormControl);
var formControlLabel = el(FormControlLabel);
var formLabel = el(FormLabel);
var icon = el(Icon);
var iconButton = el(IconButton);
var menuItem = el(MenuItem);
var radioGroup = el(RadioGroup);
var select = el(TextField);

var styles = require('./ChartWizard.module.css');
var sxFormControl = {'& .MuiFormControl-root': {width: 392}};
var sxModeLabel = {alignItems: 'center', display: 'grid', gridTemplateColumns: '100px auto'};
var sxModes = {display: 'flex', flexDirection: 'column'};
var sxModesContainer = {display: 'flex', justifyContent: 'center'};

var closeButton = onClose =>
	iconButton({edge: 'end', onClick: onClose}, icon('close'));

var doneButton = onDone =>
	button({onClick: onDone, disabled: !onDone}, 'Done');

var selectOptions = (options) => options.map(({label, value}) =>
	menuItem({key: value, value: value}, label));

var wizard = ({onClose, title, left = null, right = null}, ...children) =>
	card({className: styles.wizard, elevation: 2},
		cardHeader({action: closeButton(onClose), disableTypography: true, title: h2(title)}),
		cardContent(...children),
		cardActions(left, right));

var iconI = icon => i({className: classNames('icon', 'icon-' + icon), style: {fontSize: 24, height: 24, width: 24}});

//
// compare subgroups selections
//

var boxOrViolinModes = [
	{label: box({component: 'span', sx: sxModeLabel}, span('Box plot'), iconI('box')), value: 'boxplot'},
	{label: box({component: 'span', sx: sxModeLabel}, span('Violin plot'), iconI('violin')), value: 'violin'}
];

var yIsSet = ({ycolumn}) => v(ycolumn);
var xyIsSet = ({ycolumn, xcolumn}) => v(ycolumn) && v(xcolumn);

// If x is set, and isn't same as y, and isn't float, use it.
var getX = (columns, y, id) =>
	v(id) && id !== y && !isFloat(columns, id) ? id : undefined;

var boxOrViolinInit = appState => {
	var {columns, chartState: {xcolumn, ycolumn, setColumn}} = appState,
		y = v(setColumn) || v(ycolumn), // column selection, or previous view
		x = getX(columns, y, xcolumn);
	return {
		ycolumn: y,
		xcolumn: x
	};
};

var isValid = ({ycolumn, xcolumn}) => v(ycolumn) && v(xcolumn);

// should ask for type if y is float
var needType = (state, appState) =>
	isValid(state) && isFloat(appState.columns, state.ycolumn);

var boxOrViolinPage = ({onMode, onDone, onChart, onX, onY, onClose,
		state, props: {appState}}) =>
	wizard({title: "Compare subgroups", onClose,
			left: box({sx: {flex: 1}}, button({color: 'default', onClick: onMode, 'data-mode': 'start'}, 'Back')),
			right: doneButton(isValid(state) && onDone)},
		box({sx: sxModesContainer}, box({sx: {...sxModes, ...sxFormControl, gap: 8}},
			select({SelectProps: {MenuProps: {style: {width: 392}}}, label: 'Show data from', onChange: onY,
					select: true, value: state.ycolumn || ''}, selectOptions(boxOrViolinYDatasets(appState))),
			select({SelectProps: {MenuProps: {style: {width: 392}}}, label: 'Subgroup samples by', onChange: onX,
				select: true, value: state.xcolumn || ''}, selectOptions(boxOrViolinXDatasets(appState))),
			needType(state, appState) ?
				formControl(formLabel('I want a'),
					radioGroup({name: 'boxOrViolin', onChange: onChart, value: state.violin ? 'violin' : 'boxplot'},
						...boxOrViolinModes.map(({label, value}) =>
							formControlLabel({control: <Radio />, key: value, label, value})))) :
				null)));

//
// histogram/distribution selection
// can also draw boxplot, for multi-valued columns
//

var histDatasets = appState => suitableColumns(appState, true);
var histInit = ({chartState: {ycolumn, setColumn}}) => ({
	ycolumn: setColumn || v(ycolumn),
	xcolumn: undefined
});
var histOrDistPage = ({onY, onMode, onDone, onClose, state, props: {appState}}) =>
	wizard({title: 'See a Column Distribution', onClose,
			left: box({sx: {flex: 1}}, button({color: 'default', onClick: onMode, 'data-mode': 'start'}, 'Back')),
			right: doneButton(yIsSet(state) && onDone)},
		box({sx: sxModesContainer}, box({sx: {...sxModes, ...sxFormControl}},
			select({SelectProps: {MenuProps: {style: {width: 392}}}, label: 'Show data from', onChange: onY,
				select: true, value: state.ycolumn || ''}, selectOptions(histDatasets(appState))))));

//
// scatter plot selection
//

var scatterInit = ({columns, chartState: {ycolumn, xcolumn, setColumn}}) =>
	_.Let((y = setColumn && isFloat(columns, setColumn) ? setColumn :
		v(ycolumn) && isFloat(columns, ycolumn) ? ycolumn : undefined) =>
			({ycolumn: y,
			  xcolumn: v(xcolumn) && isFloat(columns, xcolumn)
					&& xcolumn !== y ? xcolumn : undefined}));

var scatterPage = ({onY, onX, onMode, onDone, onClose, state, props: {appState}}) =>
	wizard({title: "Scatter plot", onClose,
			left: box({sx: {flex: 1}}, button({color: 'default', onClick: onMode, 'data-mode': 'start'}, 'Back')),
			right: doneButton(xyIsSet(state) && onDone)},
		box({sx: sxModesContainer}, box({sx: {...sxModes, ...sxFormControl}},
			select({SelectProps: {MenuProps: {style: {width: 392}}}, label: 'Pick the X axis', onChange: onX,
					select: true, value: state.xcolumn || ''}, selectOptions(scatterXDatasets(appState))),
			select({SelectProps: {MenuProps: {style: {width: 392}}}, label: 'Pick the Y axis', onChange: onY,
					select: true, value: state.ycolumn || ''}, selectOptions(scatterYDatasets(appState))))));

var noop = () => {};
var init = {
	start: noop,
	boxOrViolin: boxOrViolinInit,
	histOrDist: histInit,
	scatter: scatterInit,
};

var modeTxt = {
	boxOrViolin: 'compare',
	histOrDist: 'distribution',
	scatter: 'scatter'
};

var startModes = [
	{'data-mode': 'boxOrViolin', label: 'Compare subgroups'},
	{'data-mode': 'histOrDist', label: 'See a column distribution'},
	{'data-mode': 'scatter', label: 'Make a scatter plot'}
];

var icons = {
	boxOrViolin: iconI('box'),
	histOrDist: iconI('bar'),
	scatter: iconI('scatter')
};

var modeButton = (appState, onMode) => ({label, ...props}) =>
	box({
		component: (buttonProps) => button({color: 'default', disableElevation: true, variant: 'contained', ...buttonProps}, buttonProps.children),
		endIcon: icons[props['data-mode']], fullWidth: true,
		disabled: !canDraw[props['data-mode']](appState), onClick: onMode, ...props,
		sx: {justifyContent: 'space-between'}
	}, label);

var startPage = ({onMode, onClose, props: {appState}}) =>
	wizard({title: 'What do you want to do?', onClose,
		left: box({sx: {flex: 1}}, button({color: 'default', onClick: onClose}, 'Back'))},
		box({sx: sxModesContainer}, box({sx: {...sxModes, gap: 2}},
			...startModes.map(modeButton(appState, onMode)))));

var page = {
	start: startPage,
	boxOrViolin: boxOrViolinPage,
	histOrDist: histOrDistPage,
	scatter: scatterPage,
};

export default class ChartWizard extends PureComponent {
	constructor(props) {
	    super(props);
		var {chartState: {ycolumn, xcolumn, violin} = {}} = this.props.appState;
	    this.state = {
			mode: 'start',
			ycolumn,
			xcolumn,
			violin
		};
	}

	onMode = ev => {
		var {appState} = this.props,
			mode = ev.currentTarget.dataset.mode;
		this.setState({mode, ...init[mode](appState)});
	}
	onClose = () => {
		var {callback, appState: {chartState = {}}} = this.props;
		callback(['chart-set-state',
				_.assoc(chartState,
					'setColumn', undefined,
					'another', false)]);
		if (!chartState.another) {
			gaEvents('spreadsheet', 'columnChart-close');
		}
		callback([chartState.another ? 'chart' : 'heatmap']);
	}
	onChart = event => {
		this.setState({violin: event.target.value === 'violin'});
	}
	onDone = () => {
		var {callback, appState} = this.props,
			{chartState: {colorColumn} = {}} = appState,
			{ycolumn, xcolumn, violin, mode} = this.state;
		gaEvents('chart', modeTxt[mode]);
		if (mode === 'boxOrViolin') {
			gaEvents('chart', violin ? 'violin' : 'boxplot');
		}
		callback(['chart-set-state',
			_.assoc(appState.chartState,
				'ycolumn', ycolumn,
				'xcolumn', xcolumn,
				'colorColumn', mode === 'scatter' ? colorColumn : undefined,
				'violin', violin,
				'setColumn', undefined,
				'another', false)]);
	}
	onX = event => {
		var xcolumn = event.target.value;
		var {ycolumn} = this.state;
		this.setState({xcolumn});
		if (ycolumn === xcolumn) { // disallow x = y
			this.setState({ycolumn: undefined});
		}
	}
	onY = event => {
		var ycolumn = event.target.value;
		var {xcolumn} = this.state;
		this.setState({ycolumn});
		if (ycolumn === xcolumn) { // disallow x = y
			this.setState({xcolumn: undefined});
		}
	}
	render() {
		return page[this.state.mode](this);
	}
}
