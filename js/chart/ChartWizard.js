import PureComponent from '../PureComponent';
import {Card} from 'react-toolbox/lib/card';
import {Button} from 'react-toolbox/lib/button';
import {Dropdown} from 'react-toolbox/lib/dropdown';
import Chart from './chart';
var _ = require('../underscore_ext').default;
import {v, showWizard, suitableColumns} from './utils';
import './icons.css';
import {div, label, h2, i, a, span, el} from './react-hyper';

var button = el(Button);
var card = el(Card);
var chart = el(Chart);
var dropdown = el(Dropdown);

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

//
// compare subgroups selections
//

var boxOrViolinModes = [
	{'data-chart': 'boxplot', label: 'Box plot',
		icon: i({className: 'icon icon-box'})},
	{'data-chart': 'violin', label: 'Violin plot',
		icon: i({className: 'icon icon-violin'})}
];

var isFloat = (columns, id) => !columns[id].codes;
var optIsFloat = ({columns}) => ({value}) => isFloat(columns, value);
var optNotFloat = x => y => !optIsFloat(x)(y);
var isMulti = _.curry(({columns}, {value}) =>
		isFloat(columns, value) && columns[value].fields.length > 1);

var yIsSet = ({ycolumn}) => v(ycolumn);
var xyIsSet = ({ycolumn, xcolumn}) => v(ycolumn) && v(xcolumn);

// if y is multi, allow 'none' for x to do field boxplot
var noX = ({columns}, id) => v(id) && columns[id].fields.length > 1 ?
	[{value: 'none', label: 'Column fields'}] : [];

var boxOrViolinYDatasets = appState => suitableColumns(appState, true);

var boxOrViolinXDatasets = appState => suitableColumns(appState, false)
	.filter(optNotFloat(appState));

var boxOrViolinDatasets = appState => {
	var x = boxOrViolinXDatasets(appState),
		y = boxOrViolinYDatasets(appState);
	// If x is empty, only allow multi columns
	return {x, y: x.length ? y : y.filter(isMulti(appState))};
};

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

var boxOrViolinCanDraw = appState =>
	boxOrViolinDatasets(appState).y.length > 0;

var isValid = ({ycolumn, xcolumn}, appState) =>
	v(ycolumn) && v(xcolumn) || v(ycolumn) && isMulti(appState, {value: ycolumn});

// should ask for type if y is float
var needType = (state, appState) =>
	isValid(state, appState) && isFloat(appState.columns, state.ycolumn);

var bvDisabled = (state, props) =>
	(props['data-chart'] === 'violin') ===  !!state.violin;

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
					...boxOrViolinModes.map(props =>
						button({onClick: onChart, disabled: bvDisabled(state, props),
							...props}))) :
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
var histCanDraw = appState => suitableColumns(appState, true).length > 0;

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

var optNotBigMulti = ({columns}) => ({value}) => columns[value].fields.length <= 10;
var and = (a, b) => x => y => a(x)(y) && b(x)(y); // getting crazy with the point-free

// limit subcolumns in Y to something reasonable
var scatterYDatasets = appState => suitableColumns(appState, true)
	.filter(and(optIsFloat, optNotBigMulti)(appState));

var scatterXDatasets = appState => suitableColumns(appState, false)
	.filter(optIsFloat(appState));

var scatterInit = ({columns, chartState: {ycolumn, xcolumn, setColumn}}) => ({
	ycolumn: setColumn && isFloat(columns, setColumn) ? setColumn :
		v(ycolumn) && isFloat(columns, ycolumn) ? ycolumn : undefined,
		xcolumn: v(xcolumn) && isFloat(columns, xcolumn) ? xcolumn : undefined
});

var scatterCanDraw = appState => {
	var y = _.pluck(scatterYDatasets(appState), 'value'),
		x = _.pluck(scatterXDatasets(appState), 'value');
	return x.length && y.length && _.uniq(y.concat(x)).length > 1;
};

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

var canDraw = {
	boxOrViolin: boxOrViolinCanDraw,
	histOrDist: histCanDraw,
	scatter: scatterCanDraw
};

var modeLabel = text => span({className: styles.label}, text);

var startModes = [
	{'data-mode': 'boxOrViolin', label: modeLabel('Compare subgroups')},
	{'data-mode': 'histOrDist', label: modeLabel('See a column distribution')},
	{'data-mode': 'scatter', label: modeLabel('Make a scatter plot')}
];

var iconList = (...icons) => span({className: styles.icons}, ...(icons.map(icon =>
				i({className: 'icon icon-' + icon}))));

var icons = {
	boxOrViolin: iconList('box', 'violin'),
	histOrDist: iconList('bar'),
	scatter: iconList('scatter')
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
	chart: ({props}) => chart(props)
};

export default class ChartWizard extends PureComponent {
	constructor(props) {
	    super(props);
		var {chartState: {ycolumn, xcolumn, violin} = {}} = this.props.appState;
	    this.state = {
			mode: showWizard(this.props.appState) ? 'start' : 'chart',
			ycolumn,
			xcolumn,
			violin
		};
	}

	// Most actions are blocked in this mode, but we could have datasets
	// or column data arrive. In that case more columns could be available
	// to this wizard. We shouldn't see changes to y & x except from ourselves.
	componentWillReceiveProps(props) {
		var {appState} = props;
		// maybe set xcolumn & ycolumn too
		if (!showWizard(appState)) {
			this.setState({mode: 'chart'});
		} else if (this.state.mode !== 'start') {
			this.setState({mode: 'start'});
		}
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
	onChart = ev => {
		this.setState({violin: ev.currentTarget.dataset.chart === 'violin'});
	}
	onDone = () => {
		var {callback, appState} = this.props,
			{ycolumn, xcolumn, violin} = this.state;
		callback(['chart-set-state',
			_.assoc(appState.chartState,
				'ycolumn', ycolumn,
				'xcolumn', xcolumn,
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
