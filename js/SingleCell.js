
// experimenting with using destructuring to omit handler props. This creates
// an unused var, so override eslint here, allowing an unused var if it is
// an object rest sibling.
//
/*eslint no-unused-vars: ["error", { "ignoreRestSiblings": true }]*/
// alternate approach that requires explicit naming to ignore the var:
/******* no-unused-vars: ["error", { "varsIgnorePattern": "^_" }]*/

import PureComponent from './PureComponent';
import nav from './nav';
import {div, el, fragment, h2, label, span} from './chart/react-hyper';
import {Map as CellView} from './views/Map';
import {Card, Button, createTheme, Icon,
	IconButton, ListSubheader, MenuItem, MuiThemeProvider, Tab,
	Tabs, Tooltip} from '@material-ui/core';
import styles from './SingleCell.module.css';
import {allCohorts, cellTypeMarkers, cellTypeValue, cohortFields, colorByMode,
	datasetCohort, defaultColor, defaultShadow, getData,
	getDataSubType, hasColor, hasColorBy, hasDataset, hasImage, isLog, log2p1,
	availableMaps, mergeColor, ORDINAL, otherValue, phenoValue, probValue,
	setColor, setRadius
	} from './models/singlecell';
import Integrations from './views/Integrations';
var {assoc, assocIn, conj, constant, contains, find, get, getIn, groupBy,
	isEqual, keys, Let, mapObject, merge, object, pick, range, sortByI,
	times, uniq, updateIn, values, without} = require('./underscore_ext').default;
import {kde} from './models/kde';
import singlecellLegend from './views/singlecellLegend';
import singlecellChart from './views/singlecellChart';
import mapColor from './views/MapColor';
import xSelect from './views/xSelect';
import {item} from './views/Legend.module.css';
import ImgControls from './views/ImgControls';
import markers from './views/markers';
import colorPicker from './views/colorPicker';
import {chartTypeControl} from './chart/chartControls';
var cellView = el(CellView);
var button = el(Button);
var menuItem = el(MenuItem);
var iconButton = el(IconButton);
var icon = el(Icon);
var tab = el(Tab);
var tabs = el(Tabs);
var integrations = el(Integrations);
var listSubheader = el(ListSubheader);
var muiThemeProvider = el(MuiThemeProvider);
var imgControls = el(ImgControls);
var tooltip = el(Tooltip);
var card = el(Card);

var firstMatch = (el, selector) =>
	el.matches(selector) ? el :
		el.parentElement ? firstMatch(el.parentElement, selector) :
		null;

var welcome = ({handlers: {onEnter}}) =>
	div({className: styles.welcome},
		span("Welcome to Xena Single Cell"),
			button({onClick: onEnter}, 'enter'));

var studyList = ['defaultStudy', 'studyList'];

// XXX take max & round to a few digits.
var maxCells = (state, cohort) =>
	Math.max(...values(getIn(state, ['cohortMaxSamples', cohort])));

var allAssays = state => cohort => (cohort.preferredDataset || []).map(({host, name}) =>
	getIn(state, ['datasetMetadata', host, name, 'assay'])).join(' / ');

var findStudy = (studyList, studyID) =>
	studyList.find(({study}) => study === studyID);

var studyRows = (state, study, label = study.label) => {
	let cohorts = (study.cohortList || [])
		.map(cohort => ({
			donors: cohort.donorNumber,
			cells: maxCells(state, cohort.cohort),
			assays: cohort.cohortDataType || allAssays(state)(cohort)
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

var integrationLabel = state =>
	state.defaultStudy ?
		getIn(state, ['defaultStudy', 'studyList'])
			.find(c => c.study === state.integration).label :
	'';

var mapValue = (cohorts, selected) =>
	find(values(cohorts).flat(), m => isEqual(m, selected)) || '';
var getOpt = value => menuItem({value}, value.label);
var chartOpt = cohort => ({label: 'Charts and graphs', cohort});
var listSubheaderOpt = title => listSubheader({style: {fontSize: 'unset'}}, title);

var mapOpts = cohortMaps =>
	keys(cohortMaps).sort().map(cohort =>
		[listSubheaderOpt(cohort), ...cohortMaps[cohort].map(getOpt)]).flat();

function mapSelect(availableMaps, selected, onChange) {
	var opts = mapObject(groupBy(availableMaps, 'cohort'),
	                     (maps, cohort) => [chartOpt(cohort),
	                                         ...sortByI(maps, 'label')]);
	return xSelect({
		id: 'map-select',
		label: `Select a layout`,
		value: mapValue(opts, selected),
		onChange}, ...mapOpts(opts));
}

// XXX update this enum to include colorBy
var CHARTY = 2;
var CHARTX = 3;

// XXX fix this overlay by passing a key, or passing the color state
// as a different key.
var overlayColorBy = (state, key) =>
	assoc(state, 'colorBy', state[key]);

var chartSelect = el(class extends PureComponent {
	displayName = 'chartSelect';
	onMode = ev => {
		this.setState({mode: ev.target.value});
	}

	render() {
		var {props: {state, onChartMode, onColorByHandlers: handlers}} = this,
			{chartMode: mode = 'dist'} = state;

		return (!datasetCohort(state) || hasDataset(state)) ? null :
			fragment(
				xSelect({label: 'What do you want to do?', value: mode,
					onChange: onChartMode},
					menuItem({value: 'compare'}, 'Compare groups of cells'),
					menuItem({value: 'dist'}, 'See a distribution')),
				mode === 'dist' ?
					mapColor({label: 'Select a grouping', key: `0${datasetCohort(state)}${mode}`,
						fieldPred: {type: 'coded'},
						state: overlayColorBy(state, 'chartY'),
						handlers: handlers[CHARTY]}) :
				fragment(
					mapColor({label: 'Select a grouping', key: `0${datasetCohort(state)}${mode}`,
						fieldPred: {type: 'coded'},
						state: overlayColorBy(state, 'chartX'),
						handlers: handlers[CHARTX]}),
					mapColor({label: 'Select data', key: `1${datasetCohort(state)}${mode}`,
						state: overlayColorBy(state, 'chartY'),
						handlers: handlers[CHARTY]})));
	}
});

var vizText = (...children) => div({className: styles.vizText}, ...children);

var showChart = state =>
	state.chartMode === 'compare' ?
		hasColorBy(state.chartX) && hasColorBy(state.chartY) :
	hasColorBy(state.chartY);

var vizPanel = ({props: {state, ...handlers}}) =>
	hasDataset(state) ? cellView({state, key: datasetCohort(state), ...handlers}) :
	showChart(state) ? singlecellChart({state}) :
	datasetCohort(state) ? vizText(h2('Select grouping and data')) :
	vizText(h2('All Xena derived data is in beta'),
		h2('Select a layout'));

var closeButton = onReset => iconButton({onClick: onReset}, icon('close'));

var tabPanel = ({value, index}, ...children) =>
	div({hidden: value !== index, className: styles.panel}, ...children);

// overlay colorB2 onto colorBy, for rending subcomponents. Also, set color to
// black if doing coded vs. float.
var blk = '#000000';
var colorBy2State = state =>
	Let(({colorBy, colorBy2} = state,
		cb = getIn(colorBy, ['data', 'codes']) &&
					getIn(colorBy2, ['field', 'field']) ?
			updateIn(colorBy2, ['data', 'scale'], scale => setColor(scale, blk)) :
			colorBy2) =>
	assoc(state, 'colorBy', cb));

var imgDisplay = showImg => showImg ? {} : {style: {display: 'none'}};

var PopperProps = {
	modifiers: {
		preventOverflow: {
			boundariesElement: "viewport", // Ensure Tooltip stays in the viewport
		}
	}
};
var tooltipTab = ({title, open, ...props}) =>
	tooltip({title, open, arrow: true, placement: 'top', PopperProps}, tab(props));

var isChartView = state => datasetCohort(state) && !hasDataset(state);

var showHide = [{style: {display: 'none'}}, {}];

var getChartType = state => getIn(state, ['chartState', 'chartType'], 'dot');
var isBoxplot = state => state.chartMode === 'compare' &&
	!getIn(state.chartY, ['data', 'codes']);

class MapTabs extends PureComponent {
	state = {showedNext: !!localStorage.showedNext, showNext: false,
		showColorBy2: false}
	componentWillUnmount() {
		this.showNext && clearTimeout(this.showNext);
		this.hideNext && clearTimeout(this.hideNext);
	}
	onChange = (ev, value) => {
		this.props.handlers.onTab(value);
		if (value > 0) { // Disable tooltip hint if user finds other tabs.
			this.setState({showedNext: true, showNext: false});
			localStorage.showedNext = 'true';
		}
	}
	onShowColorBy2 = () => {
		this.setState({showColorBy2: true});
	}
	onHideColorBy2 = () => {
		this.setState({showColorBy2: false});
		this.props.handlers.onColorByHandlers[1].onColorBy({mode: ''});
	}
	onDataset = (...args) => {
		if (!this.state.showedNext) {
			// For tooltip, trigger when dataset is selected, first time, if user
			// hasn't interacted with it.
			this.showNext = setTimeout(() => {
				if (!this.state.showedNext) {
					this.setState({showNext: true, showedNext: true});
				}
			}, 20 * 1000);
			this.hideNext =
				setTimeout(() => this.setState({showNext: false}), 140 * 1000);
		}
		this.props.handlers.onDataset(...args);
	}
	render() {
		var {onChange, onDataset, onShowColorBy2, onHideColorBy2,
				state: {showNext, showColorBy2}, props:
				{handlers: {onOpacity, onVisible, onSegmentationVisible, onChannel,
				onChartType, onBackgroundOpacity, onBackgroundVisible,
				onColorByHandlers, onChartMode}, state}} = this,
			{tab: value = 0} = state,
			showImg = !!hasImage(state),
			chart = ~~isChartView(state);
		return div({className: styles.maptabs},
			tabs({value, onChange, variant: 'fullWidth'},
				tab({label: 'View'}),
				tooltipTab({title: 'Next: explore image layers', open: showImg
					&& showNext, label: 'Image', ...imgDisplay(showImg)}),
				tooltipTab({title: 'Next: explore omics', label: 'Data',
					open: !showImg && showNext, ...showHide[chart ^ 1]}),
				tab({label: 'Configure', ...showHide[chart]})),
			tabPanel({value, index: 0},
				mapSelect(get(state, 'availableMaps'), state.dataset, onDataset),
				chartSelect({state, onColorByHandlers, onChartMode})),
			tabPanel({value, index: 1},
				imgControls({state, onOpacity, onVisible, onSegmentationVisible,
					onChannel, onBackgroundOpacity, onBackgroundVisible})),
			tabPanel({value, index: 2},
				card(mapColor({key: datasetCohort(state), state,
					handlers: onColorByHandlers[0]})),
				!hasColorBy(state.colorBy) ? null :
					!showColorBy2 && !hasColorBy(state.colorBy2) ?
						div({className: styles.blendWith, onClick: onShowColorBy2},
							iconButton(icon('addCircle')),
							label('Blend color with')) :
					Let((state2 = colorBy2State(state)) =>
						card({className: styles.colorBy2},
							icon({onClick: onHideColorBy2}, 'close'),
							mapColor({key: datasetCohort(state2) + '2', state: state2,
								label: 'Select data to blend with',
								fieldPred: {type: 'float'},
								handlers: onColorByHandlers[1]})))),
			tabPanel({value, index: 3},
				isBoxplot(state) ?
					chartTypeControl({onChange: onChartType,
					                  chartType: getChartType(state)}) : null)
		);
	}
}

var mapTabs = el(MapTabs);

var shButton = (onClick, txt) =>
	button({className: styles.showHideButton, onClick,
	        variant: 'outlined', size: 'small'}, txt);

var showHideButtons = ({onHideAll, onShowAll}) =>
	fragment(shButton(onHideAll, 'Hide all'), shButton(onShowAll, 'Show all'));

var hasCodes = state => hasColorBy(state) && getIn(state, ['data', 'codes']);

var gray = '#F0F0F0';
var legend = (state, markers, {onCode, onShowAll, onHideAll, onMarkers}) => {
	var codes = getIn(state, ['data', 'codes']),
		codesInView = getIn(state, ['data', 'codesInView']),
		valueType = codes ? 'coded' : 'float',
		scale = getIn(state, ['data', 'scale']),
		hidden = get(state, 'hidden'),
		unit = getIn(state, ['field', 'unit']),
		color = hidden ? updateIn(scale, [ORDINAL.CUSTOM], custom =>
				merge(custom, object(hidden, hidden.map(constant(gray)))))
			: scale;

	return hasColor(state) ?
		fragment(
			div(
				codes ? showHideButtons({onHideAll, onShowAll}) : null,
				markers ? shButton(onMarkers, 'Marker genes') : null),
			singlecellLegend({inline: true, max: Infinity, onClick: onCode,
				column: {valueType, color, codes, codesInView, units: [unit]}})) :
		null;
};

var legendTitleMode = {
	datasource: () => 'Data source',
	donor: () => 'Donor',
	type: state => cellTypeValue(state).label,
	prob: state => getIn(state, ['colorBy', 'field', 'field']) ?
		Let(({field} = state.colorBy.field) =>
			`${probValue(state).label}: ${field}`) : '',
	sig: state => getIn(state, ['colorBy', 'field', 'field'], ''),
	gene: state => getIn(state, ['colorBy', 'field', 'field']) ?
		Let(({host, name, field} = state.colorBy.field) =>
			`${field} - ${getDataSubType(state, host, name)}`) : '',
	other: state => otherValue(state).field,
	pheno: state => phenoValue(state).label,
	null: () => ''
};

var legendTitle = state =>
	span({className: styles.legendTitle},
		legendTitleMode[colorByMode(get(state, 'colorBy')) || null](state));

var datasetCount = state =>
	Let(({host, name} = JSON.parse(state.dataset.dsID)) =>
		find(state.cohortDatasets[datasetCohort(state)][host], {name}).count);

var space = n => times(n, () => '\u00a0').join('');
var datasetLabel = state =>
	hasDataset(state) ? div(`${state.dataset.cohort} - ${state.dataset.label}${space(10)}${datasetCount(state)} cells/dots`) : null;

var colorPickerButton = ({state, onShowColorPicker}) =>
	hasCodes(get(state, 'colorBy')) ?
		iconButton({onClick: onShowColorPicker, color: 'secondary'},
			icon({style: {fontSize: '14px'}}, 'settings')) :
		null;

var legends = ({state, handlers: {onShowColorPicker, onColorByHandlers}}) =>
	isChartView(state) ? null :
	fragment(
		span(legendTitle(state), colorPickerButton({state, onShowColorPicker})),
		legend(state.colorBy, cellTypeMarkers(state),
			   onColorByHandlers[0]),
		...Let((state2 = colorBy2State(state)) => [
			legendTitle(state2),
			legend(state2.colorBy, false,
				   onColorByHandlers[1])]));

var viz = ({handlers: {onReset, onTooltip, onViewState, onCode, onShadow,
			onRadius, onShowColorPicker, onCloseColorPicker, onColor, ...handlers},
		showColorPicker, props: {state}}) =>
	div(
		{className: styles.vizPage},
		h2(integrationLabel(state), closeButton(onReset)),
		datasetLabel(state),
		div({className: styles.vizBody},
			showColorPicker ?
				colorPicker({onClose: onCloseColorPicker, onClick: onColor,
				            data: state.colorBy.data}) :
				null,
			get(state.showMarkers, 'colorBy') ?
				markers(handlers.onColorByHandlers[0].onMarkersClose,
				        cellTypeValue(state)) :
				null,
			vizPanel({props: {state, onTooltip, onViewState, onShadow, onRadius}}),
			div({className: styles.sidebar},
				mapTabs({state, handlers}),
				legends({state, handlers}))));

var page = state =>
	get(state, 'integration') ? viz :
	get(state, 'enter') ? integration :
	welcome;

class SingleCellPage extends PureComponent {
	constructor() {
		super();

		this.state = {highlight: undefined, showColorPicker: false};

		this.onColorByHandlers =
			['colorBy', 'colorBy2', 'chartY', 'chartX'].map(key => ({
				onColorBy: colorBy => this.colorByKey(key, colorBy),
				onScale: (ev, params) => this.scaleKey(key, params),
				onCode: ev => this.codeKey(key, ev),
				onHideAll: ev => this.hideAllKey(key, ev),
				onShowAll: ev => this.showAllKey(key, ev),
				// XXX currently only supporting 1st colorBy, but
				// this creates handlers for both.
				onMarkers: () => this.markersKey(key),
				onMarkersClose: () => this.markersCloseKey(key)
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
	onDataset = ev => {
		var {props: {state}} = this,
			dataset = ev.target.value,
			colorBy =
				dataset.cohort === datasetCohort(state) ? state.colorBy :
				dataset.image ? {} :
				{field: defaultColor(state, dataset.cohort)},
			colorBy2 =
				dataset.cohort === datasetCohort(state) ? state.colorBy2 : {};

		this.callback(['dataset', dataset, colorBy, colorBy2]);
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
		var iStr = getIn(firstMatch(ev.target, '.' + item), ['dataset', 'code']);

		if (iStr != null) {
			var i = parseInt(iStr, 10),
				hidden = getIn(this.props.state, [key, 'hidden']) || [],
				next = (contains(hidden, i) ? without : conj)(hidden, i);
			this.callback(['hidden', key, next]);
		}
	}
	hideAllKey(key) {
		var codes = getIn(this.props.state, [key, 'data', 'codes']);
		this.callback(['hidden', key, range(codes.length)]);
	}
	showAllKey(key) {
		this.callback(['hidden', key, []]);
	}
	onRadius = (ev, r) => {
		var isLabel = /MuiSlider-markLabel/.exec(ev.target.className);
		this.callback(['radius', isLabel ? this.props.state.radiusBase : r]);
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
	onShowColorPicker = () => {
		this.setState({showColorPicker: true});
	}
	onCloseColorPicker = () => {
		this.setState({showColorPicker: false});
	}
	onColor = colors => {
		this.callback(['customColor', colors]);
	}
	onShadow = (ev, shadow) => {
		var isLabel = /MuiSlider-markLabel/.exec(ev.target.className);
		this.callback(['shadow', isLabel ? defaultShadow : shadow]);
	}
	onTab = tab => {
		this.callback(['tab', tab]);
	}
	markersKey = key => {
		this.callback(['show-markers', key, true]);
	}
	markersCloseKey = key => {
		this.callback(['show-markers', key, false]);
	}
	onChartMode = ev => {
		this.callback(['chartMode', ev.target.value]);
	}
	onChartType = (_, v) => {
		this.callback(['chartType', v]);
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

var uniqCodes = (values, dim, isChart) =>
	Let((inMap = isChart ? values : values.filter((v, i) => !isNaN(dim[i]))) =>
		without(uniq(inMap), NaN).sort((v1, v2) =>  v1 - v2));

var codesSelector = createSelector(
	state => getIn(state, ['colorBy', 'data', 'codes']),
	state => getIn(state, ['colorBy', 'data', 'req', 'values', 0]),
	state => getIn(getData(state), ['req', 'values', 0]),
	state => isChartView(state),
	(codes, array, dim, isChart) => codes && dim &&
		uniqCodes(array, dim, isChart));

var mergeCodes = state =>
	Let((codesInView = codesSelector(state)) =>
		codesInView ? assocIn(state, ['colorBy', 'data', 'codesInView'], codesInView) :
		state);

var mapSelector = createSelector(
	state => allCohorts(state),
	state => get(state, 'cohortDatasets'),
	(cohorts, cohortDatasets) => availableMaps(cohorts, cohortDatasets));

var cohortFieldsSelector = createSelector(
	state => allCohorts(state),
	state => get(state, 'cohortDatasets'),
	state => get(state, 'cohortFeatures'),
	cohortFields);

var radiusSelector = createSelector(
	state => getIn(state, ['dataset', 'spot_diameter']),
	state => getData(state),
	setRadius);

var LetIf = (v, f) => v && f(v);

var scaleSetting = (state, key) =>
	LetIf(getIn(state, [key, 'data', 'field']), ({host, name, field}) =>
		getIn(state, ['settings', host, name, field, 'scale']));

// This is required to restore the correct color for stored float scales.
var mergeScaleType = b => a =>
	a[0] === 'ordinal' ? b :
	mergeColor(b, a);

var mergeScale = (state, key) =>
	Let((scale = scaleSetting(state, key)) =>
		scale ? updateIn(state, [key, 'data', 'scale'], mergeScaleType(scale)) :
		state);

var mergeScales = state =>
	mergeScale(mergeScale(state, 'colorBy'), 'colorBy2');

var selector = state => assoc(
	merge(mergeScales(mergeCodes(mergeDensity(state))), cohortFieldsSelector(state)),
	'radiusBase', radiusSelector(state),
	'availableMaps', mapSelector(state));

// MuiThemeProvider does a shallow merge into the outer theme, which is not
// useful. So, we explicitly merge it here by passing a function which will
// receive the outer theme.
var theme = outer => createTheme(outer, {
	overrides: {
		MuiAccordion: {
			root: {
				backgroundColor: '#00000000', //eslint-disable-line ucsc-xena-client/no-hex-color-alpha
				'&:before': {
					opacity: '0.5 !important'
				},
				boxShadow: 'unset'
			}
		},
		MuiAccordionSummary: {
			root: {
				minHeight: 'unset',
				fontSize: '90%',
				color: 'rgba(0, 0, 0, 0.38)'
			},
			content: {
				margin: 'unset'
			}
		},
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
				position: 'static !important',
				fontWeight: 600,
				color: '#000000'
			}
		},
		MuiTab: {
			root: {
				minHeight: 'unset',
				minWidth: 'unset !important',
				border: '1px solid #ccc',
				backgroundColor: '#F0F0F0',
				'&:first-child': {
					borderTopLeftRadius: outer.shape.borderRadius,
				},
				'&:last-child': {
					borderTopRightRadius: outer.shape.borderRadius,
				},
				'&.Mui-selected': {
					backgroundColor: 'rgba(0,0,0,0)',
					borderBottom: 'none',
				}
			}
		},
		MuiTabs: {
			root: {
				minHeight: 'unset'
			},
			indicator: {
				display: 'none'
			}
		},
		MuiSlider: {
			markLabel: {
				border: '1px solid rgba(48, 175, 166, 0.5)',
				borderRadius: outer.shape.borderRadius,
				padding: '0 4px'
			},
			markLabelActive: { // don't highlight 'active' marks
				color: 'rgba(0, 0, 0, 0.54)'
			}
		}
	}
});

export default ({state: {singlecell: state}, ...rest}) =>
	muiThemeProvider({theme}, singleCellPage({state: selector(state), ...rest}));
