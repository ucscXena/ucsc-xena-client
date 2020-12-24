import PureComponent from '../PureComponent';
import {Card} from 'react-toolbox/lib/card';
import {Button} from 'react-toolbox/lib/button';
import {RadioGroup, RadioButton} from 'react-toolbox/lib/radio';
import {Dropdown} from 'react-toolbox/lib/dropdown';
var _ = require('../underscore_ext').default;
import {v, suitableColumns, canDraw, boxOrViolinXDatasets, boxOrViolinYDatasets,
	isMulti, isFloat, scatterYDatasets, scatterXDatasets} from './utils';
import './icons.css';
import {div, label, h2, i, a, span, el} from './react-hyper';
import classNames from 'classnames';

var button = el(Button);
var card = el(Card);
var dropdown = el(Dropdown);
var radioGroup = el(RadioGroup);
var radioButton = el(RadioButton);

var styles = require('./ChartWizard.module.css');

var closeButton = onClose =>
	a(i({className: 'material-icons ' + styles.close, onClick: onClose}, 'close'));

var doneButton = onDone =>
	button({onClick: onDone, disabled: !onDone, label: 'Done', className: styles.done});


var wizard = ({onClose, title, left = null, right = null}, ...children) =>
	card({className: styles.wizard},
		closeButton(onClose),
		h2(title),
		div(...children),
		div({className: styles.actions}, left, right));

var iconI = icon => i({className: classNames('icon',  'icon-' + icon)});

//
// compare subgroups selections
//

var boxOrViolinModes = [
	{label: span({className: styles.radio}, span('Box plot'), iconI('box')),
		value: 'boxplot'},
	{label: span({className: styles.radio}, span('Violin plot'), iconI('violin')),
		value: 'violin'}
];

var yIsSet = ({ycolumn}) => v(ycolumn);
var xyIsSet = ({ycolumn, xcolumn}) => v(ycolumn) && v(xcolumn);

// if y is multi, allow 'none' for x to do field boxplot
var noX = ({columns}, id) => v(id) && columns[id].fields.length > 1 ?
	[{value: 'none', label: 'Column fields'}] : [];

// If x is 'none' and y is multi, use 'none'.
// If x is set, and isn't same as y, and isn't float, use it.
var getX = (columns, y, id) => id === 'none' && v(y) && isMulti({columns}, {value: y}) ||
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

var isValid = ({ycolumn, xcolumn}, appState) =>
	v(ycolumn) && v(xcolumn) || v(ycolumn) && isMulti(appState, {value: ycolumn});

// should ask for type if y is float
var needType = (state, appState) =>
	isValid(state, appState) && isFloat(appState.columns, state.ycolumn);

var boxOrViolinPage = ({onMode, onDone, onChart, onX, onY, onClose,
		state, props: {appState}}) =>
	wizard({title: "Compare subgroups", onClose,
			left: button({onClick: onMode, 'data-mode': 'start', label: 'Back',
				className: styles.back}),
			right: doneButton(isValid(state, appState) && onDone)},
		div({className: styles.modes},
			div(dropdown({label: 'Show data from:', onChange: onY,
				value: state.ycolumn, source: boxOrViolinYDatasets(appState)})),
			div(dropdown({label: 'Subgroup samples by', onChange: onX,
				value: state.xcolumn,
				source: boxOrViolinXDatasets(appState)
					.concat(noX(appState, state.ycolumn))})),
			needType(state, appState) ?
				div(label('I want a'),
					radioGroup({name: 'boxOrViolin', onChange: onChart,
						value: state.violin ? 'violin' : 'boxplot'},
						...boxOrViolinModes.map(props => radioButton(props)))) :
				null));

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
			left: button({onClick: onMode, 'data-mode': 'start', label: 'Back',
				className: styles.back}),
			right: doneButton(yIsSet(state) && onDone)},
		div({className: styles.modes},
			dropdown({label: 'Show data from', onChange: onY,
			value: state.ycolumn, source: histDatasets(appState)})));

//
// scatter plot selection
//

var scatterInit = ({columns, chartState: {ycolumn, xcolumn, setColumn}}) => ({
	ycolumn: setColumn && isFloat(columns, setColumn) ? setColumn :
		v(ycolumn) && isFloat(columns, ycolumn) ? ycolumn : undefined,
		xcolumn: v(xcolumn) && isFloat(columns, xcolumn) ? xcolumn : undefined
});

var scatterPage = ({onY, onX, onMode, onDone, onClose, state, props: {appState}}) =>
	wizard({title: "Scatter plot", onClose,
			left: button({onClick: onMode, 'data-mode': 'start', label: 'Back',
				className: styles.back}),
			right: doneButton(xyIsSet(state) && onDone)},
		div({className: styles.mode},
			dropdown({onChange: onX, value: state.xcolumn, label: 'Pick the X axis',
				source: scatterXDatasets(appState)})),
			dropdown({onChange: onY, value: state.ycolumn, label: 'Pick the Y axis',
				source: scatterYDatasets(appState)}));

var noop = () => {};
var init = {
	start: noop,
	boxOrViolin: boxOrViolinInit,
	histOrDist: histInit,
	scatter: scatterInit,
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

var modeButton = (appState, onMode) => props =>
	button({onClick: onMode, icon: icons[props['data-mode']],
		disabled: !canDraw[props['data-mode']](appState), ...props});

var startPage = ({onMode, onClose, props: {appState}}) =>
	wizard({title: 'What do you want to do?', onClose,
		left: button({onClick: onClose, label: 'Back', className: styles.back})},
		div({className: styles.modes},
			...startModes.map(modeButton(appState, onMode))));

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
		callback([chartState.another ? 'chart' : 'heatmap']);
	}
	onChart = value => {
		this.setState({violin: value === 'violin'});
	}
	onDone = () => {
		var {callback, appState} = this.props,
			{chartState: {colorColumn} = {}} = appState,
			{ycolumn, xcolumn, violin, mode} = this.state;
		callback(['chart-set-state',
			_.assoc(appState.chartState,
				'ycolumn', ycolumn,
				'xcolumn', xcolumn,
				'colorColumn', mode === 'scatter' ? colorColumn : undefined,
				'violin', violin,
				'setColumn', undefined,
				'another', false)]);
	}
	onX = xcolumn => {
		var {ycolumn} = this.state;
		this.setState({xcolumn});
		if (ycolumn === xcolumn) { // disallow x = y
			this.setState({ycolumn: undefined});
		}
	}
	onY = ycolumn => {
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
