
// experimenting with using destructuring to omit handler props. This creates
// an unused var, so override eslint here, allowing an unused var if it is
// an object rest sibling.
//
/*eslint no-unused-vars: ["error", { "ignoreRestSiblings": true }]*/
// alternate approach that requires explicit naming to ignore the var:
/******* no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

import PureComponent from './PureComponent';
import nav from './nav';
import {br, div, el, h2, h3, label, span} from './chart/react-hyper';
import {Map} from './views/Map';
import {Accordion, AccordionDetails, AccordionSummary, Button, Icon,
	IconButton, ListSubheader, MenuItem, Slider, Tab, Tabs} from '@material-ui/core';
import {ExpandMore} from '@material-ui/icons';
var XRadioGroup = require('./views/XRadioGroup');
import styles from './SingleCell.module.css';
import {allCohorts, cellTypeValue, cohortFields, datasetCohort, defaultColor,
	dotRange, getData, getDataSubType, getRadius, getSamples, hasDataset, hasImage,
	maps, otherValue, probValue, setRadius} from './models/map';
import Integrations from './views/Integrations';
var {assoc, conj, constant, contains, findIndexDefault, get, getIn, groupBy, isEqual, keys, Let, merge, object, pick, without} = require('./underscore_ext').default;
import mapColor from './views/MapColor';
import widgets from './columnWidgets';
import {scaleParams} from './colorScales';
import xSelect from './views/xSelect';
import {item} from './views/Legend.module.css';
import {MuiThemeProvider, createTheme} from '@material-ui/core';
import ImgControls from './views/ImgControls';
var map = el(Map);
var button = el(Button);
var accordion = el(Accordion);
var accordionDetails = el(AccordionDetails);
var accordionSummary = el(AccordionSummary);
var expandMore = el(ExpandMore);
var xRadioGroup = el(XRadioGroup);
var menuItem = el(MenuItem);
var iconButton = el(IconButton);
var icon = el(Icon);
var tab = el(Tab);
var tabs = el(Tabs);
var integrations = el(Integrations);
var listSubheader = el(ListSubheader);
var slider = el(Slider);
var muiThemeProvider = el(MuiThemeProvider);
var imgControls = el(ImgControls);

var firstMatch = (el, selector) =>
	el.matches(selector) ? el :
		el.parentElement ? firstMatch(el.parentElement, selector) :
		null;

var welcome = ({handlers: {onEnter}}) =>
	div(span("Welcome to the Xena's multi-omic integration single cell portal"),
		button({onClick: onEnter}, 'enter'));

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
	cohorts: (study.cohortList || [])
		.filter(cohort => get(cohort.preferredDataset, 'length'))
		.map(cohort => ({
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
		h2('Select a study:'),
		integrations({list: integrationsList(state), onHighlight, highlight}),
		button({onClick: onIntegration, disabled: highlight == null}, 'Next'));

// Page layout after selecting integration

var layouts = {
	'embedding': 'UMAP/t-SNE',
	'spatial': 'Spatial'
};

var available = state =>
	groupBy(get(state, 'map'), 'type');

var availableCategories = available => keys(pick(layouts, keys(available)));

var integrationLabel = state =>
	getIn(state, ['defaultStudy', 'studyList']).find(c => c.study === state.integration).label;


var layoutSelect = ({onLayout, props: {state}}) =>
	xRadioGroup({label: 'Select layout type', value: state.layout || '',
		onChange: onLayout,
		options:
		availableCategories(available(state)).map(l => ({label: layouts[l], value: l}))});

var getOpt = opt => menuItem({value: opt.value}, opt.label);

var mapValue = (list, selected) =>
	findIndexDefault(list, m => isEqual(m, selected), '');

var mapOpts = maps => Let((g = groupBy(maps, 'cohort')) =>
	Object.keys(g).sort().map(k => [listSubheader(k), ...g[k].map(getOpt)]).flat());

function mapSelect(availableMaps, layout, selected, onChange) {
	var opts = availableMaps[layout].map((m, i) => assoc(m, 'value', i));
	return xSelect({
		id: 'map-select',
		label: `Select a ${layouts[layout]} layout`,
		value: mapValue(availableMaps[layout], selected),
		onChange}, ...mapOpts(opts));
}

var mapSelectIfLayout = (availableMaps, layout, selected, onChange) =>
	layout ? mapSelect(availableMaps, layout, selected, onChange) : div();

var vizPanel = ({props: {state, ...handlers}}) =>
	Let(({dataset, layout} = state) =>
		dataset ? map({state, ...handlers}) :
		layout ? h2(`Select a ${layouts[layout]} layout`) :
		h2('Select a layout type'));

var closeButton = onReset => iconButton({onClick: onReset}, icon('close'));

var tabPanel = ({value, index}, ...children) =>
	div({hidden: value !== index, className: styles.panel}, ...children);

var colorScale = state => getIn(state, ['colorBy', 'data', 'scale']);
var scaleValue = state => Let((scale = colorScale(state)) =>
	scale && scaleParams(scale));

var dotSize = (state, onChange) =>
	!state.dataset || !state.radiusBase ? null :
	div(
		label('Dot size'),
		slider({...dotRange(state.radiusBase), marks: [{value: state.radiusBase}], value: getRadius(state), onChange}));

var colorBy2State = state => assoc(state,
	'colorBy', get(state, 'colorBy2'));

class MapTabs extends PureComponent {
	state = {value: 0}
	onChange = (ev, value) => {
		this.setState({value});
	}
	render() {
		var {onChange, state: {value}, props: {handlers: {
			onOpacity, onVisible, onChannel, onBackgroundOpacity, onBackgroundVisible,
			onAdvanced, onLayout, onDataset, onRadius, onColorByHandlers},
			state}} = this;
		return div({className: styles.maptabs}, // XXX use a Box vs div?
			tabs({value, onChange, className: styles.tabs},
				tab({label: 'Layout'}),
				tab({label: 'Color by', disabled: !hasDataset(state)}),
				tab({label: 'Layers', disabled: !hasImage(state)}),
				tab({label: 'Cells in View', disabled: true})
			),
			tabPanel({value, index: 0},
				layoutSelect({onLayout, props: {state}}),
				mapSelectIfLayout(available(state), state.layout,
					state.dataset, onDataset),
				dotSize(state, onRadius)),
			tabPanel({value, index: 1},
				// XXX move scale lookup to MapColors?
				mapColor({key: datasetCohort(state), state,
					scale: scaleValue(state), handlers: onColorByHandlers[0]}),
				accordion({expanded: state.advanced, onChange: onAdvanced},
					accordionSummary({expandIcon: expandMore()}, 'Advanced'),
					accordionDetails({className: styles.advanced},
						Let((state2 = colorBy2State(state)) =>
							mapColor({key: datasetCohort(state2) + '2', state: state2,
								scale: scaleValue(state2), handlers: onColorByHandlers[1]}))))),
			tabPanel({value, index: 2},
				imgControls({state, onOpacity, onVisible, onChannel,
					onBackgroundOpacity, onBackgroundVisible})));
	}
}

var mapTabs = el(MapTabs);

var gray = '#F0F0F0';
var fieldType = 'probes';
var legend = (state, onCode) => {
	var codes = getIn(state, ['data', 'codes']),
		valueType = codes ? 'coded' : 'float',
		heatmap = [getIn(state, ['data', 'req', 'values', 0])],
		scale = getIn(state, ['data', 'scale']),
		hidden = get(state, 'hidden'),
		unit = getIn(state, ['field', 'unit']),
		colors = [hidden ? assoc(scale, 2, object(hidden, hidden.map(constant(gray))))
			: scale];

	return getIn(state, ['field', 'mode']) && heatmap[0] ?
		widgets.legend({inline: true, max: Infinity, onClick: onCode,
			column: {fieldType, valueType, heatmap, colors, codes, units: [unit]}}) :
		null;
};

var legendTitleMode = {
	datasource: () => 'Data source',
	donor: () => 'Donor',
	type: state => cellTypeValue(state).label,
	prob: state => getIn(state, ['colorBy', 'field', 'field']) ?
		Let(({field} = state.colorBy.field) =>
			`${probValue(state).label}: ${field}`) : '',
	gene: state => getIn(state, ['colorBy', 'field', 'field']) ?
		Let(({host, name, field} = state.colorBy.field) =>
			`${field} - ${getDataSubType(state, host, name)}`) : '',
	other: state => otherValue(state).field,
	null: () => ''
};

var legendTitle = state =>
	span({className: styles.legendTitle},
		legendTitleMode[getIn(state, ['colorBy', 'field', 'mode']) || null](state));

var datasetLabel = state =>
	state.dataset ? h3(state.dataset.label) : null;

var tooltipView = tooltip =>
	div({className: styles.tooltip},
		...(tooltip ? [tooltip.sampleID, br(), tooltip.valTxt0, br(), tooltip.valTxt1] :
			['']));

var viz = ({handlers: {onReset, onTooltip, onCode, ...handlers},
		tooltip, props: {state}}) =>
	div(
		{className: styles.vizPage},
		h2(integrationLabel(state), closeButton(onReset)),
		datasetLabel(state),
		div({className: styles.vizBody},
			vizPanel({props: {state, onTooltip}}),
			div({className: styles.sidebar},
				mapTabs({state, handlers}),
				legendTitle(state),
				legend(state.colorBy, onCode),
				...Let((state2 = colorBy2State(state)) => [
					legendTitle(state2),
					legend(state2.colorBy, onCode)]),
				tooltipView(tooltip))));

var page = state =>
	get(state, 'integration') ? viz :
	get(state, 'enter') ? integration :
	welcome;

var getColorTxt = (state, i) =>
	Let((
		colorVals = getIn(state, ['data', 'req', 'values', 0]),
		hasColor = colorVals && getIn(state, ['field', 'mode']),
		value = hasColor && get(colorVals, i)) =>
	 hasColor ? getIn(state, ['data', 'codes', value],
		String(value)) : '');

class SingleCellPage extends PureComponent {
	state = {highlight: undefined, tooltip: null};
	constructor() {
		super();
		this.onColorByHandlers =
			['colorBy', 'colorBy2'].map(key => ({
				onColorBy: colorBy => this.colorByKey(key, colorBy),
				onScale: (ev, params) => this.scaleKey(key, params),
				onCode: ev => this.codeKey(key, ev)
			}));

		this.handlers = pick(this, (v, k) => k.startsWith('on'));
	}
	callback = ([action, ...params]) => {
		// set scope for actions, to prevent aliasing with other controllers.
		this.props.callback(['singlecell-' + action, ...params]);
	}
	onAdvanced = () => {
		this.callback(['advanced']);
	}
	onTooltip = i => {
		if (i === null) {
			this.setState({tooltip: null});
			return;
		}
		var {state} = this.props,
			sampleID = getSamples(state)[i],
			valTxt0 = getColorTxt(get(state, 'colorBy'), i),
			valTxt1 = getColorTxt(get(state, 'colorBy2'), i);

		this.setState({tooltip: {sampleID, valTxt0, valTxt1}});
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
			i = parseInt(ev.target.value, 10),
			dataset = available(state)[layout][i],
			colorBy = dataset.image ? {} :
				dataset.cohort === datasetCohort(state) ? state.colorBy.field :
				defaultColor(state, dataset.cohort);

		this.callback(['dataset', dataset, {field: colorBy}]);
	}
	onReset = () => {
		this.callback(['reset']);
	}
	colorByKey(key, colorBy) {
		this.callback(['colorBy', key, colorBy]);
	}
	scaleKey(key, params) {
		var scale = getIn(this.props.state, [key, 'data', 'scale']),
			newScale = scale.slice(0, scale.length - params.length).concat(params);
		this.callback(['colorScale', key, newScale]);
	}
	codeKey(key, ev) {
		var iStr = getIn(firstMatch(ev.target, '.' + item), ['dataset', 'i']);

		if (iStr != null) {
			var i = parseInt(iStr, 10),
				hidden = getIn(this.props.state, [key, 'hidden']) || [],
				next = (contains(hidden, i) ? without : conj)(hidden, i);
			this.callback(['hidden', key, next]);
		}
	}
	onRadius = (ev, r) => {
		this.callback(['radius', r, this.props.state.radiusBase]);
	}
	onNavigate = (page, params) => {
		this.props.callback(['navigate', page, params]);
	};
	onVisible = (i, checked) => {
		this.callback(['channel-visible', i, checked]);
	}
	onChannel = (i, channel) => {
		this.callback(['channel', i, channel]);
	}
	onOpacity = (i, op) => {
		this.callback(['channel-opacity', i, op]);
	}
	onBackgroundOpacity = op => {
		this.callback(['background-opacity', op]);
	}
	onBackgroundVisible = visible => {
		this.callback(['background-visible', visible]);
	}

	componentDidMount() {
		const {getState, onImport, state: {isPublic}} = this.props,
			{onNavigate} = this;

		// nested render to different DOM tree
		nav({isPublic, getState, onImport, onNavigate, activeLink: 'singlecell'});
	}

	render() {
		var {props: {state},
			handlers: {onNavigate, ...handlers}} = this;

		return page(state)({...this.state, props: {state}, handlers});
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
	state => allCohorts(state),
	state => get(state, 'cohortDatasets'),
	state => get(state, 'cohortFeatures'),
	cohortFields);

var radiusSelector = createSelector(
	state => getIn(state, ['dataset', 'spot_diameter']),
	state => getData(state),
	setRadius);

var selector = state => assoc(
	merge(state, cohortFieldsSelector(state)),
	'radiusBase', radiusSelector(state),
	'map', mapSelector(state)
);

// MuiThemeProvider does a shallow merge into the outer theme, which is not
// useful. So, we explicitly merge it here by passing a function which will
// receive the outer theme.
var theme = outer => createTheme(outer, {
	overrides: {
		MuiList: {
			root: {
				'& li': {
					minHeight: '10px',
					lineHeight: '24px'
				}
			}
		},
		MuiListSubheader: {
			root: {
				fontWeight: 600,
				color: '#000000'
			}
		}
	}
});

export default ({state: {singlecell: state}, ...rest}) =>
	muiThemeProvider({theme}, singleCellPage({state: selector(state), ...rest}));
