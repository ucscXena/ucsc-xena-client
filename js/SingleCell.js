import PureComponent from './PureComponent';
import nav from './nav';
import {div, el, h2, label, span, textNode} from './chart/react-hyper';
import {Map} from './views/Map';
import {Button, Icon, IconButton, ListSubheader, MenuItem,
	Select, Slider, Tab, Tabs} from '@material-ui/core';
var XRadioGroup = require('./views/XRadioGroup');
import styles from './SingleCell.module.css';
import {maps, cellTypeCluster, hasDataset, labelTransfer} from './models/map';
import {allCohorts} from './controllers/singlecell.js';
import Integrations from './views/Integrations';
var {assocIn, findIndexDefault, getIn, groupBy, isEqual, keys, Let, pick} = require('./underscore_ext').default;
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

var welcome = ({onEnter}) =>
	div(span("Welcome to the Xena's multi-omic integration single cell portal"),
		button({onClick: onEnter}, 'enter'));

// XXX change cohortList to be an object instead of a list (in the controller),
// so we don't have to search it for the current selection.
var studyList = ['singlecell', 'defaultStudy', 'studyList'];

// XXX take max & round to a few digits.
var maxCells = (state, datasets = []) => Math.max(...datasets.map(({host, name}) =>
	getIn(state, ['singlecell', 'datasetMetadata', host, name, 'count'], 0)));

var allAssays = state => cohort => (cohort.preferredDataset || []).map(({host, name}) =>
	getIn(state, ['singlecell', 'datasetMetadata', host, name, 'assay'])).join(' / ');

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

var integrationsList = (state/*, onHighlight, highlight*/) =>
	Let((slist = getIn(state, studyList, [])) =>
		slist.map(itgr => itgr.subStudy ? {
			label: itgr.label,
			studies: itgr.subStudy.map(ss =>
				studyRows(state, findStudy(slist, ss.studyID), ss.displayLabel))
		} :
		{
			studies: [studyRows(state, itgr)]
		}));

var integration = ({onHighlight, onIntegration, state: {highlight}, props: {state}}) =>
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

var vizPanel = ({props: {state}}, {singlecell: {dataset, layout}} = state) =>
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
		var {onChange, state: {value}, props: {onLayout, onDataset, onGene, onColorBy, onScale, onRadius, onCellType, state}} = this;
		return div( // XXX use a Box vs div?
			tabs({value, onChange, className: styles.tabs},
				tab({label: 'Layout'}),
				tab({label: 'Color by', disabled: !hasDataset(state.singlecell)}),
				tab({label: 'Cells in View', disabled: true})),
			tabPanel({value, index: 0},
				layoutSelect({onLayout, props: {state}}),
				mapSelectIfLayout(available(state), state.singlecell.layout,
					state.singlecell.dataset, onDataset),
				dotSize(state.singlecell, onRadius)),
			tabPanel({value, index: 1},
				mapColor({state, onColorBy, gene: state.singlecell.gene, onGene, scale: scaleValue(state.singlecell), onScale, onCellType})),
			tabPanel({value, index: 2}));
	}
}

var mapTabs = el(MapTabs);

var fieldType = 'probes';
var legend = state => {
	var valueType = getIn(state, ['mode']) !== 'gene' ? 'coded' : 'float',
		heatmap = [getIn(state, ['field', 'req', 'values', 0])],
		colors = [getIn(state, ['scale'])],
		codes = getIn(state, ['field', 'codes']);

	return heatmap[0] ?
		widgets.legend({column: {fieldType, valueType, heatmap, colors, codes}}) :
		null;
};

var viz = ({onReset, onLayout, onDataset, onGene, onColorBy, onScale, onRadius, onCellType, props: {state}}) => div(
	{className: styles.vizPage},
	h2(integrationLabel(state), closeButton(onReset)),
	div({className: styles.vizBody},
		div(vizPanel({props: {state}})),
		div(mapTabs({state, onLayout, onDataset, onGene, onColorBy, onScale, onRadius, onCellType}),
			legend(state.singlecell.colorBy))));

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
	onHighlight = i => {
		// highlight integration when clicked
		this.setState({highlight: i});
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
	onScale = (ev, params) => {
		var {colorBy} = this.props.state.singlecell,
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

var cellTypeSelector = createSelector(
	state => allCohorts(state),
	state => getIn(state, ['singlecell', 'cohortDatasets']),
	(cohorts, cohortDatasets) => cellTypeCluster(cohorts, cohortDatasets));

var labelTransferSelector = createSelector(
	state => allCohorts(state),
	state => getIn(state, ['singlecell', 'cohortDatasets']),
	(cohorts, cohortDatasets) => labelTransfer(cohorts, cohortDatasets));

var selector = state => assocIn(state,
	// XXX why two keys, 'map' and 'available'?
	['singlecell', 'map', 'available'], mapSelector(state),
	['singlecell', 'cellType'], cellTypeSelector(state),
	['singlecell', 'labelTransfer'], labelTransferSelector(state));


export default ({state, ...rest}) => singleCellPage({...rest, state: selector(state)});
