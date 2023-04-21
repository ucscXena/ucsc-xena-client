
// experimenting with using destructuring to omit handler props. This creates
// an unused var, so override eslint here, allowing an unused var if it is
// an object rest sibling.
//
/*eslint no-unused-vars: ["error", { "ignoreRestSiblings": true }]*/
// alternate approach that requires explicit naming to ignore the var:
/******* no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

import PureComponent from './PureComponent';
import nav from './nav';
import {div, el, h2, label, span, textNode} from './chart/react-hyper';
import {Map} from './views/Map';
import {Button, Icon, IconButton, ListSubheader, MenuItem,
	Select, Slider, Tab, Tabs} from '@material-ui/core';
var XRadioGroup = require('./views/XRadioGroup');
import styles from './SingleCell.module.css';
import {allCohorts, cohortFields, datasetCohort, hasDataset, maps} from './models/map';
import Integrations from './views/Integrations';
var {assocIn, findIndexDefault, get, getIn, groupBy, isEqual, keys, Let, merge, pick} = require('./underscore_ext').default;
import MapColor from './views/MapColor';
import widgets from './columnWidgets';
import {scaleParams} from './colorScales';
var map = el(Map);
var button = el(Button);
var xRadioGroup = el(XRadioGroup);
var select = el(Select);
var menuItem = el(MenuItem);
var iconButton = el(IconButton);
var icon = el(Icon);
var tab = el(Tab);
var tabs = el(Tabs);
var integrations = el(Integrations);
var mapColor = el(MapColor);
var listSubheader = el(ListSubheader);
var slider = el(Slider);

var welcome = ({handlers: {onEnter}}) =>
	div(span("Welcome to the Xena's multi-omic integration single cell portal"),
		button({onClick: onEnter}, 'enter'));

// XXX change cohortList to be an object instead of a list (in the controller),
// so we don't have to search it for the current selection.
var studyList = ['defaultStudy', 'studyList'];

// XXX take max & round to a few digits.
var maxCells = (state, datasets = []) => Math.max(...datasets.map(({host, name}) =>
	getIn(state, ['datasetMetadata', host, name, 'count'], 0)));

var allAssays = state => cohort => (cohort.preferredDataset || []).map(({host, name}) =>
	getIn(state, ['datasetMetadata', host, name, 'assay'])).join(' / ');

var findStudy = (studyList, studyID) =>
	studyList.find(({study}) => study === studyID);

var studyRows = (state, study, label = study.label) => ({
	label,
	cohorts: (study.cohortList || []).map(cohort => ({
		donors: cohort.donorNumber,
		cells: maxCells(state, cohort.preferredDataset),
		assays: allAssays(state)(cohort)
	}))
});

var integrationsList = state =>
	Let((slist = getIn(state, studyList, [])) =>
		slist.map(itgr => itgr.subStudy ? {
			label: itgr.label,
			studies: itgr.subStudy.map(ss =>
				studyRows(state, findStudy(slist, ss.studyID), ss.displayLabel))
		} :
		{
			studies: [studyRows(state, itgr)]
		}));

var integration = ({handlers: {onHighlight, onIntegration}, highlight,
		props: {state}}) =>
	div({className: styles.integration},
		h2('Select an integration:'),
		integrations({list: integrationsList(state), onHighlight, highlight}),
		button({onClick: onIntegration, disabled: highlight == null}, 'Next'));

// Page layout after selecting integration

var layouts = {
	'embedding': 'UMAP/t-SNE',
	'spatial': 'Spatial'
};

var available = state =>
	groupBy(get(state, 'map'), ([, m]) => m.type);

var availableCategories = available => keys(pick(layouts, keys(available)));

var integrationLabel = state =>
	getIn(state, ['defaultStudy', 'studyList']).find(c => c.study === state.integration).label;


var layoutSelect = ({onLayout, props: {state}}) =>
	xRadioGroup({label: 'Select layout', value: state.layout || '',
		onChange: onLayout,
		options:
		availableCategories(available(state)).map(l => ({label: layouts[l], value: l}))});

var getOpt = opt => menuItem({value: opt.value}, opt.label);

// XXX change models::maps to return them grouped, so we don't have to do
// this.
var mapOpts = maps => Let((g = groupBy(maps, 'cohort')) =>
	Object.keys(g).sort().map(k => [listSubheader(k), ...g[k].map(getOpt)]).flat());

function mapSelect(availableMaps, layout, selected, onChange) {
       var opts = availableMaps[layout].map(([, {label, cohort}], i) => ({'value': i,
                       label, cohort})),
               sel = select({value: selected ? findIndexDefault(availableMaps[layout], av => av[0] === selected[0], '') : '', onChange},
                       ...mapOpts(opts));

       return (
               div({className: styles.mapSelector},
                       label(textNode(`Select a ${layouts[layout]} layout`)), div(sel)));
}

var mapSelectIfLayout = (availableMaps, layout, selected, onChange) =>
	layout ? mapSelect(availableMaps, layout, selected, onChange) : div();

var vizPanel = ({props: {state}}, {dataset, layout} = state) =>
	dataset ? map({state}) :
	layout ? h2(`Select a ${layouts[layout]} layout`) :
	h2('Select a layout type');

var closeButton = onReset => iconButton({onClick: onReset}, icon('close'));

var tabPanel = ({value, index}, ...children) =>
	div({hidden: value !== index}, ...children);

var colorScale = state => getIn(state, ['colorBy', 'scale']);
var scaleValue = state => Let((scale = colorScale(state)) =>
	scale && scaleParams(scale));

var dotRange = Let((ratio = 4) =>
	radius => ({min: radius / ratio, max: radius * ratio,
		step: radius * (ratio - 1 / ratio) / 200}));

var dotSize = (state, onChange) =>
	!state.dataset || !state.radiusBase ? null :
	div(
		label('Dot size'),
		slider({...dotRange(state.radiusBase), value: state.radius, onChange}));

class MapTabs extends PureComponent {
	state = {value: 0}
	onChange = (ev, value) => {
		this.setState({value});
	}
	render() {
		var {onChange, state: {value}, props: {handlers:
				{onLayout, onDataset, onRadius, ...handlers}, state}} = this;
		return div( // XXX use a Box vs div?
			tabs({value, onChange, className: styles.tabs},
				tab({label: 'Layout'}),
				tab({label: 'Color by', disabled: !hasDataset(state)}),
				tab({label: 'Cells in View', disabled: true})),
			tabPanel({value, index: 0},
				layoutSelect({onLayout, props: {state}}),
				mapSelectIfLayout(available(state), state.layout,
					state.dataset, onDataset),
				dotSize(state, onRadius)),
			tabPanel({value, index: 1},
				// XXX move scale lookup to MapColors?
				mapColor({state, scale: scaleValue(state), handlers})),
			tabPanel({value, index: 2}));
	}
}

var mapTabs = el(MapTabs);

var fieldType = 'probes';
var legend = state => {
	var valueType = getIn(state, ['field', 'codes']) ? 'coded' : 'float',
		heatmap = [getIn(state, ['field', 'req', 'values', 0])],
		colors = [get(state, 'scale')],
		codes = getIn(state, ['field', 'codes']);

	return heatmap[0] ?
		widgets.legend({column: {fieldType, valueType, heatmap, colors, codes}}) :
		null;
};

var viz = ({handlers: {onReset, ...handlers}, props: {state}}) => div(
	{className: styles.vizPage},
	h2(integrationLabel(state), closeButton(onReset)),
	div({className: styles.vizBody},
		div(vizPanel({props: {state}})),
		div(mapTabs({state, handlers}),
			legend(state.colorBy))));

var page = state =>
	get(state, 'integration') ? viz :
	get(state, 'enter') ? integration :
	welcome;

class SingleCellPage extends PureComponent {
	state = {highlight: undefined};
	constructor() {
		super();
		this.handlers = pick(this, (v, k) => k.startsWith('on'));
	}
	callback = ([action, ...params]) => {
		// set scope for actions, to prevent aliasing with other controllers.
		this.props.callback(['singlecell-' + action, ...params]);
	}
	onEnter = () => {
		this.callback(['enter']);
	}
	onHighlight = i => {
		// highlight integration when clicked
		this.setState({highlight: i});
	}
	onIntegration = () => {
		var row = this.state.highlight;
		this.callback(['integration',
			this.props.state.defaultStudy.studyList[row].study]);
	}
	onLayout = layout => {
		this.callback(['layout', layout]);
	}
	onDataset = ev => {
		var {state} = this.props,
			{layout} = state,
			i = parseInt(ev.target.value, 10);
		this.callback(['dataset', available(state)[layout][i]]);
	}
	onGene = gene => {
		this.callback(['gene', gene]);
	}
	onReset = () => {
		this.callback(['reset']);
	}
	onColorBy = ev => {
		this.callback(['color-mode', ev.target.value]);
	}
	onScale = (ev, params) => {
		var {colorBy} = this.props.state,
			scale = colorBy.scale,
			newScale = scale.slice(0, scale.length - params.length).concat(params);
		this.callback(['color-scale', newScale]);
	}
	onRadius = (ev, r) => {
		this.callback(['radius', r]);
	}
	onCellType = ev => {
		this.callback(['cellType', ev.target.value]);
	}
	onProb = ev => {
		this.callback(['prob', ev.target.value]);
	}
	onProbCell = ev => {
		this.callback(['probCell', ev.target.value]);
	}
	onNavigate = (page, params) => {
		this.props.callback(['navigate', page, params]);
	};

	componentDidUpdate() {
		const {getState, onImport, state: {isPublic}} = this.props,
			{onNavigate} = this;

		// nested render to different DOM tree
		nav({isPublic, getState, onImport, onNavigate, activeLink: 'singlecell'});
	}
	render() {
		var {state: {highlight}, props: {state},
			handlers: {onNavigate, ...handlers}} = this;

		return page(state)({highlight, props: {state}, handlers});
	}
}

var singleCellPage = el(SingleCellPage);

var {createSelectorCreator, defaultMemoize} = require('reselect');
var createSelector = createSelectorCreator(defaultMemoize, isEqual);

var mapSelector = createSelector(
	state => allCohorts(state),
	state => get(state, 'cohortDatasets'),
	(cohorts, cohortDatasets) => maps(cohorts, cohortDatasets));

var cohortFieldsSelector = createSelector(
	state => datasetCohort(state),
	state => get(state, 'cohortDatasets'),
	cohortFields);

var selector = state => assocIn(
	merge(state, cohortFieldsSelector(state)),
	['map'], mapSelector(state)
);


export default ({state: {singlecell: state}, ...rest}) =>
	singleCellPage({state: selector(state), ...rest});
