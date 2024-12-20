
// experimenting with using destructuring to omit handler props. This creates
// an unused var, so override eslint here, allowing an unused var if it is
// an object rest sibling.
//
/*eslint no-unused-vars: ["error", { "ignoreRestSiblings": true }]*/
// alternate approach that requires explicit naming to ignore the var:
/******* no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

import PureComponent from './PureComponent';
import nav from './nav';
import {br, div, el, h2, label, span} from './chart/react-hyper';
import {Map} from './views/Map';
import {Accordion, AccordionDetails, AccordionSummary, Button, Icon,
	IconButton, ListSubheader, MenuItem, Slider, Tab, Tabs} from '@material-ui/core';
import {ExpandMore} from '@material-ui/icons';
var XRadioGroup = require('./views/XRadioGroup');
import styles from './SingleCell.module.css';
import {allCohorts, cellTypeValue, cohortFields, datasetCohort, defaultColor,
	dotRange, getData, getDataSubType, getRadius, getSamples, hasColor, hasImage,
	isLog, log2p1, maps, otherValue, probValue, setRadius} from './models/map';
import Integrations from './views/Integrations';
var {assoc, assocIn, conj, constant, contains, findIndexDefault, get, getIn, groupBy, isEqual, keys, Let, merge, object, pick, range, without} = require('./underscore_ext').default;
import {kde} from './chart/chart';
import mapColor from './views/MapColor';
import widgets from './columnWidgets';
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
	div({className: styles.welcome},
		span("Welcome to the Xena's multi-omic integration single cell portal"),
			button({onClick: onEnter}, 'enter'));

var studyList = ['defaultStudy', 'studyList'];

// XXX take max & round to a few digits.
var maxCells = (state, datasets = []) => Math.max(...datasets.map(({host, name}) =>
	getIn(state, ['datasetMetadata', host, name, 'count'], 0)));

var allAssays = state => cohort => (cohort.preferredDataset || []).map(({host, name}) =>
	getIn(state, ['datasetMetadata', host, name, 'assay'])).join(' / ');

var findStudy = (studyList, studyID) =>
	studyList.find(({study}) => study === studyID);

var studyRows = (state, study, label = study.label) => {
	let cohorts = (study.cohortList || [])
		.filter(cohort => get(cohort.preferredDataset, 'length'))
		.map(cohort => ({
			donors: cohort.donorNumber,
			cells: maxCells(state, cohort.preferredDataset),
			assays: allAssays(state)(cohort)
		}));

	// Grouping by 'assays' and summing 'donors' and 'cells'
	let groupedCohorts = cohorts.reduce((acc, item) => {
		let key = item.assays;

		if (!acc[key]) {
			acc[key] = { donors: 0, cells: 0, assays: key }; // Initialize with 0 sums
	    }

	    // Sum the 'donors' and 'cells' for the group
	    acc[key].donors += item.donors;
	    acc[key].cells += item.cells;

	    return acc;
	}, {});

	// Convert the result to an array
	return {
		label,
		cohorts: Object.values(groupedCohorts)
	};
};

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
	state.defaultStudy ?
		getIn(state, ['defaultStudy', 'studyList'])
			.find(c => c.study === state.integration).label :
	'';


var layoutSelect = ({onLayout, layout, state}) =>
	xRadioGroup({label: 'Select layout type', value: layout || '',
		onChange: onLayout,
		options:
		availableCategories(available(state)).map(l => ({label: layouts[l], value: l}))});

var getOpt = opt => menuItem({value: opt.value}, opt.label);

var mapValue = (list, selected) =>
	findIndexDefault(list, m => isEqual(m, selected), '');

var subHeaderOpt = {style: {fontSize: 'unset'}};
var mapOpts = maps => Let((g = groupBy(maps, 'cohort')) =>
	Object.keys(g).sort().map(k =>
		[listSubheader(subHeaderOpt, k), ...g[k].map(getOpt)]).flat());

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
		div({style: {flexDirection: 'column'}},
			h2('All Xena derived data is in beta'),
			h2('Select a layout type')));

var closeButton = onReset => iconButton({onClick: onReset}, icon('close'));

var tabPanel = ({value, index}, ...children) =>
	div({hidden: value !== index, className: styles.panel}, ...children);

var dotSize = (state, onChange) =>
	!state.dataset || !state.radiusBase ? null :
	div(
		label('Dot size'),
		slider({...dotRange(state.radiusBase), marks: [{value: state.radiusBase}], value: getRadius(state), onChange}));

var colorBy2State = state => assoc(state,
	'colorBy', get(state, 'colorBy2'));

var validDataset = (state, layout) =>
	getIn(state, ['dataset', 'type']) === layout;

class MapTabs extends PureComponent {
	state = {value: 0}
	onChange = (ev, value) => {
		this.setState({value});
	}
	render() {
		var {onChange, state: {value}, props: {handlers: {onOpacity,
			onVisible, onSegmentationVisible, onChannel, onBackgroundOpacity,
			onBackgroundVisible, onAdvanced, onLayout, onDataset, onRadius,
			onColorByHandlers}, state, layout}} = this;
		return div({className: styles.maptabs}, // XXX use a Box vs div?
			tabs({value, onChange, className: styles.tabs},
				tab({label: 'Layout'}),
				tab({label: 'Image', disabled: !validDataset(state, layout) ||
					!hasImage(state)}),
				tab({label: 'Cell/dot', disabled: !validDataset(state, layout)}),
//				tab({label: 'Cells in View', disabled: true})
			),
			tabPanel({value, index: 0},
				layoutSelect({onLayout, layout, state}),
				mapSelectIfLayout(available(state), layout,
					state.dataset, onDataset),
				dotSize(state, onRadius)),
			tabPanel({value, index: 1},
				imgControls({state, onOpacity, onVisible, onSegmentationVisible,
					onChannel, onBackgroundOpacity, onBackgroundVisible})),
			tabPanel({value, index: 2},
				// XXX move scale lookup to MapColors?
				mapColor({key: datasetCohort(state), state,
					handlers: onColorByHandlers[0]}),
				accordion({expanded: !!state.advanced, onChange: onAdvanced},
					accordionSummary({expandIcon: expandMore()}, 'Advanced'),
					accordionDetails({className: styles.advanced},
						Let((state2 = colorBy2State(state)) =>
							mapColor({key: datasetCohort(state2) + '2', state: state2,
								handlers: onColorByHandlers[1]}))))));
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
	state.dataset ? div(`${state.dataset.cohort} - ${state.dataset.label}`) : null;

var tooltipView = tooltip =>
	div({className: styles.tooltip},
		...(tooltip ? [tooltip.sampleID, br(), tooltip.valTxt0, br(), tooltip.valTxt1] :
			['']));

var viz = ({handlers: {onReset, onTooltip, onViewState, onCode, ...handlers},
		tooltip, layout, props: {state}}) =>
	div(
		{className: styles.vizPage},
		h2(integrationLabel(state), closeButton(onReset)),
		datasetLabel(state),
		div({className: styles.vizBody},
			vizPanel({props: {state, onTooltip, onViewState}}),
			div({className: styles.sidebar},
				mapTabs({state, handlers, layout}),
				legendTitle(state),
				legend(state.colorBy, handlers.onColorByHandlers[0].onCode),
				...Let((state2 = colorBy2State(state)) => [
					legendTitle(state2),
					legend(state2.colorBy, handlers.onColorByHandlers[1].onCode)]),
				tooltipView(tooltip))));

var page = state =>
	get(state, 'integration') ? viz :
	get(state, 'enter') ? integration :
	welcome;

var getColorTxt = (state, i) =>
	hasColor(state) ?
		Let((value = getIn(state, ['data', 'req', 'values', 0, i])) =>
			getIn(state, ['data', 'codes', value], String(value))) :
		'';

class SingleCellPage extends PureComponent {
	constructor(props) {
		super();
		this.state = {highlight: undefined, tooltip: null,
			layout: getIn(props.state, ['dataset', 'type'])};

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
	onViewState = viewState => {
		this.callback(['view-state', viewState]);
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
	onHighlight = (ev, i) => {
		// highlight integration when clicked
		if (ev.type === 'dblclick') {
			this.onIntegration();
		} else {
			this.setState({highlight: i});
		}
	}
	onIntegration = () => {
		var row = this.state.highlight;
		this.callback(['integration',
			this.props.state.defaultStudy.studyList[row].study]);
	}
	onLayout = layout => {
		this.setState({layout});
	}
	onDataset = ev => {
		var {props: {state}, state: {layout}} = this,
			i = parseInt(ev.target.value, 10),
			dataset = available(state)[layout][i],
			colorBy =
				dataset.cohort === datasetCohort(state) ? state.colorBy :
				dataset.image ? {} :
				{field: defaultColor(state, dataset.cohort)};

		this.callback(['dataset', dataset, colorBy]);
	}
	onReset = () => {
		this.setState({layout: null});
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
		var iStr = getIn(firstMatch(ev.target, '.' + item), ['dataset', 'code']);

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
	onSegmentationVisible = (i, checked) => {
		this.callback(['segmentation-visible', i, checked]);
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
	onCancelLogin = origin => {
		this.callback(['cancel-login', origin]);
	}

	componentDidMount() {
		const {getState, onImport, state: {isPublic}} = this.props,
			{onNavigate} = this;

		// nested render to different DOM tree
		nav({isPublic, getState, onImport, onNavigate, activeLink: 'singlecell'});
	}

	render() {
		var {props: {state},
			handlers: {onNavigate, ...handlers}} = this,
			viewArgs = {...this.state, props: {state}, handlers};

		return page(state)(viewArgs);
	}
}

var singleCellPage = el(SingleCellPage);

var {createSelectorCreator, defaultMemoize} = require('reselect');
var createSelector = createSelectorCreator(defaultMemoize, isEqual);

var dataDist = (data, min, max, n = 100) =>
	kde().sample(data.filter(x => !isNaN(x)))(range(min, max, (max - min) / n));

var logTransform = (k, log) =>
	log ? k.map(([x, y]) => [log2p1(x), y]) : k;

var densitySelector = key => createSelector(
	state => getIn(state, [key, 'data', 'req']),
	state => getIn(state, [key, 'data', 'avg']),
	state => isLog(getIn(state, [key, 'data', 'scale'])),
	(req, avg, log) =>
			req && avg &&
			logTransform(dataDist(req.values[0], avg.min[0], avg.max[0]), log));

var density0Selector = densitySelector('colorBy');
var density1Selector = densitySelector('colorBy2');

var mergeDensityField = (state, field, density) =>
	density ? assocIn(state, [field, 'data', 'density'], density) : state;

var mergeDensity = state =>
	Let((d0 = density0Selector(state), d1 = density1Selector(state)) =>
		mergeDensityField(mergeDensityField(state, 'colorBy', d0), 'colorBy2', d1));

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
	merge(mergeDensity(state), cohortFieldsSelector(state)),
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
