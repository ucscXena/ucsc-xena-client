import PureComponent from './PureComponent';
import nav from './nav';
import {div, el, h2, label, span, textNode} from './chart/react-hyper';
import {Map} from './views/Map';
import {Button, Icon, IconButton, MenuItem,
	Select, Tab, Tabs} from '@material-ui/core';
var XRadioGroup = require('./views/XRadioGroup');
import styles from './SingleCell.module.css';
import {maps} from './models/map';
import {allCohorts} from './controllers/singlecell.js';
import Integrations from './views/Integrations';
var {/*spy, */assoc, assocIn, findIndexDefault, get, getIn, groupBy, isEqual, keys, pick} = require('./underscore_ext').default;
import MapColor from './views/MapColor';
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

var welcome = ({onEnter}) =>
	div(span("Welcome to the Xena's multi-omic integration single cell portal"),
		button({onClick: onEnter}, 'enter'));

// XXX change cohortList to be an object instead of a list (in the controller),
// so we don't have to search it for the current selection.
var studyList = ['singlecell', 'defaultStudy', 'studyList'];

var maxCells = (state, datasets = []) => Math.max(...datasets.map(({host, name}) =>
	getIn(state, ['singlecell', 'datasetMetadata', host, name, 'count'], 0)));

// XXX take max & round to a few digits.
//var cells = (state, cohorts) => div(...cohorts.map(cohort => maxCells(state, cohort.preferredDataset).toString()));

var cells = (state, cohorts) => cohorts.map(cohort => maxCells(state, cohort.preferredDataset).toString());

var allAssays = state => cohort => (cohort.preferredDataset || []).map(({host, name}) =>
	getIn(state, ['singlecell', 'datasetMetadata', host, name, 'assay'])).join(' / ');

var assays = (state, cohorts) => cohorts.map(allAssays(state));

var donors = cohorts => cohorts.map(cohort =>
	get(cohort, 'donorNumber', '').toString());

var findStudy = (studyList, studyID) =>
	studyList.find(({study}) => study === studyID);

// Follow subStudy and fill in cohort list
var subs = studyList =>
	studyList.map(study => study.subStudy ?
		assoc(study, 'cohortList', study.subStudy.map(({studyID}) =>
			findStudy(studyList, studyID).cohortList).flat()) :
		study);

var integrationsList = (state, onHighlight, highlight) =>
	subs(getIn(state, studyList, [])).map(
		({label, cohortList = []}, row) => ({
			onClick: onHighlight,
			highlight: row === highlight,
			label,
			donors: donors(cohortList),
			cells: cells(state, cohortList),
			assays: assays(state, cohortList)
		}));

var integration = ({onHighlight, onIntegration, state: {highlight}, props: {state}}) =>
	div({className: styles.integration},
		h2('Select an integration:'),
		integrations({list: integrationsList(state, onHighlight, highlight)}),
		button({onClick: onIntegration, disabled: highlight == null}, 'Next'));

// Page layout after selecting integration

var layouts = {
	'embedding': 'UMAP/t-SNE',
	'spatial': 'Spatial'
};

var available = state =>
	groupBy(getIn(state, ['singlecell', 'map', 'available']), ([, m]) => m.type);

var availableCategories = available => keys(pick(layouts, keys(available)));

var integrationLabel = state =>
	getIn(state, ['singlecell', 'defaultStudy', 'studyList']).find(c => c.study === state.singlecell.integration).label;


var layoutSelect = ({onLayout, props: {state}}) =>
	xRadioGroup({label: 'Select layout', value: state.singlecell.layout || '',
		onChange: onLayout,
		options:
		availableCategories(available(state)).map(l => ({label: layouts[l], value: l}))});

var getOpt = opt => menuItem({value: opt.value}, opt.label);

function mapSelect(availableMaps, layout, selected, onChange) {
       var opts = availableMaps[layout].map(([, params], i) => ({'value': i,
                       label: params.label})),
		// XXX is 'form-control' doing anything here?
               sel = select({className: 'form-control', value: selected ? findIndexDefault(availableMaps[layout], av => av[0] === selected[0], '') : '', onChange},
                       ...opts.map(getOpt));

       return (
               div({className: styles.mapSelector},
                       label(textNode(`Select a ${layouts[layout]} layout`)), div(sel)));
}

var mapSelectIfLayout = (availableMaps, layout, selected, onChange) =>
	layout ? mapSelect(availableMaps, layout, selected, onChange) : div();

var vizPanel = ({props: {state}}, {singlecell: {dataset, layout}} = state) =>
	dataset ? map({state}) :
	layout ? h2(`Select a ${layouts[layout]} layout`) :
	h2('Select a layout type');

var closeButton = onReset => iconButton({onClick: onReset}, icon('close'));

var tabPanel = ({value, index}, ...children) =>
	div({hidden: value !== index}, ...children);

class MapTabs extends PureComponent {
	state = {value: 0}
	onChange = (ev, value) => {
		this.setState({value});
	}
	render() {
		var {onChange, state: {value}, props: {onLayout, onDataset, onGene, onColorBy, state}} = this;
		return div( // XXX use a Box vs div?
			tabs({value, onChange, className: styles.tabs},
				tab({label: 'Layout'}),
				tab({label: 'Color by'}),
				tab({label: 'Cells in View'})),
			tabPanel({value, index: 0},
				layoutSelect({onLayout, props: {state}}),
				mapSelectIfLayout(available(state), state.singlecell.layout,
					state.singlecell.dataset, onDataset)),
			tabPanel({value, index: 1},
				mapColor({state, onColorBy, gene: state.singlecell.gene, onGene})
			),
			tabPanel({value, index: 2}));
	}
}

var mapTabs = el(MapTabs);

var viz = ({onReset, onLayout, onDataset, onGene, onColorBy, props: {state}}) => div(
	{className: styles.vizPage},
	h2(integrationLabel(state), closeButton(onReset)),
	div({className: styles.vizBody},
		div(vizPanel({props: {state}})),
		mapTabs({state, onLayout, onDataset, onGene, onColorBy})));

var page = state =>
	getIn(state, ['singlecell', 'integration']) ? viz :
	getIn(state, ['singlecell', 'enter']) ? integration :
	welcome;

class SingleCellPage extends PureComponent {
	state = {highlight: undefined};
	callback = ([action, ...params]) => {
		// set scope for actions, to prevent aliasing with other controllers.
		this.props.callback(['singlecell-' + action, ...params]);
	}
	onEnter = () => {
		this.callback(['enter']);
	}
	onHighlight = ev => {
		// highlight integration when clicked
		this.setState({highlight: parseInt(ev.currentTarget.dataset.row, 10)});
	}
	onIntegration = () => {
		var row = this.state.highlight;
		this.callback(['integration', this.props.state.singlecell.defaultStudy.studyList[row].study]);
	}
	onLayout = layout => {
		this.callback(['layout', layout]);
	}
	onDataset = ev => {
		var {state} = this.props,
			{singlecell: {layout}} = state,
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
		var {state} = this.props;
		return page(state)(this);
	}
}

var singleCellPage = el(SingleCellPage);

var {createSelectorCreator, defaultMemoize} = require('reselect');
var createSelector = createSelectorCreator(defaultMemoize, isEqual);

var mapSelector = createSelector(
	state => allCohorts(state),
	state => getIn(state, ['singlecell', 'cohortDatasets']),
	(cohorts, cohortDatasets) => maps(cohorts, cohortDatasets));

var selector = state => assocIn(state,
	['singlecell', 'map', 'available'], mapSelector(state));


export default ({state, ...rest}) => singleCellPage({...rest, state: selector(state)});
