import PureComponent from './PureComponent';
var React = require('react');
import pdfSpreadsheet from './pdfSpreadsheet';
import pdfChart from './pdfChart';
var _ = require('./underscore_ext').default;
import AppBar from 'react-toolbox/lib/app_bar';
var widgets = require('./columnWidgets');
var classNames = require('classnames');
var gaEvents = require('./gaEvents');
var {signatureField} = require('./models/fieldSpec');
var {invert, searchSamples} = require('./models/searchSamples');
import { SampleSearch } from './views/SampleSearch';
import uuid from './uuid';
import {anyCanDraw, showWizard as showChartWizard} from './chart/utils.js';
import Tooltip from 'react-toolbox/lib/tooltip';
import {hidden} from './nav';

// Styles
var compStyles = require('./AppControls.module.css');

var modePdf = {
	chart: pdfChart,
	heatmap: pdfSpreadsheet
};

var modeIcon = {
	chart: 'view_column',
	heatmap: 'insert_chart'
};

var modeEvent = {
	chart: 'heatmap',
	heatmap: 'chart'
};

var modeHelp = {
	chart: 'View as columns',
	heatmap: 'View as chart',
	true: "There is not enough data on the screen to enter Chart View. Please click on 'Click to Add Column'"
};

function download([fields, rows]) {
	var txt = _.map([fields].concat(rows), row => row.join('\t')).join('\n');
	// use blob for bug in chrome: https://code.google.com/p/chromium/issues/detail?id=373182
	var url = URL.createObjectURL(new Blob([txt], { type: 'text/tsv' }));
	var a = document.createElement('a');
	var filename = 'denseDataOnlyDownload.tsv';
	_.extend(a, { id: filename, download: filename, href: url });
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

var TTIcon = Tooltip(props => <i {..._.omit(props, 'theme')} />);
var icon = (i, tooltip, onClick, disabled) =>
	<TTIcon className={classNames('material-icons', disabled && compStyles.disabled)}
		onClick={onClick}
		tooltip={tooltip}>{i}</TTIcon>;

var Actions = ({onPdf, onDownload, onShowWelcome, showWelcome, onMode, onMap, mode}) => (
	<div className={compStyles.actions}>
		{icon(modeIcon[mode], modeHelp[!onMode || mode], onMode, !onMode)}
		{icon('grade', 'Map', onMap, !onMap)}
		{icon('picture_as_pdf', 'Download as PDF', onPdf, !onPdf)}
		{icon('cloud_download', 'Download as tsv', onDownload)}
		{showWelcome ? null : icon('help', 'Show carousel', onShowWelcome)}
	</div>);

var BasicSearch = ({onTies, tiesEnabled, ...searchProps}) => (
	<div className={compStyles.filter}>
		<SampleSearch {...searchProps}/>
		{tiesEnabled ? <a onClick={onTies} className={compStyles.ties}><i className='material-icons'>toys</i></a> : null}
	</div>);

var TiesSearch = () => (
		<div className={compStyles.filter}>
			<span>Pathology Report Search and Filter by TIES</span>
		</div>);

var TiesActions = ({onTies, onTiesColumn}) => (
	<div className={compStyles.actions}>
		<button onClick={onTiesColumn}>Create filtered column</button>
		<a onClick={onTies} className={compStyles.filterHelp}><i className='material-icons'>close</i></a>
	</div>);

function getFilterColumn(title, sampleSets, exprs, opts = {}) {
	var field = signatureField(title, {
			columnLabel: 'Subgroup',
			valueType: 'coded',
			signature: ['cross', sampleSets, exprs],
			...opts
		}),
		settings = _.assoc(field,
				'width', 136,
				'user', _.pick(field, ['columnLabel', 'fieldLabel']));
	return {id: uuid(), settings};
}

// XXX drop this.props.style? Not sure it's used.
export class AppControls extends PureComponent {
	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		hidden.create('help', 'Reset help', {
			onClick: () => {
				this.props.callback(['notifications-enable']);
			}
		});
	}

	componentWillUnmount() {
		hidden.delete('help');
	}

	onSearchHistory = search => {
		gaEvents('spreadsheet', 'samplesearch', 'history');
		this.props.callback(['searchHistory', search]);
	}

	onFilter = inv => {
		const {callback, appState: {samplesMatched, cohortSamples}} = this.props,
			m = inv ? invert(samplesMatched, _.range(cohortSamples.length)) :
				samplesMatched,
			matching = _.map(m, i => cohortSamples[i]);
		gaEvents('spreadsheet', 'samplesearch', inv ? 'remove' : 'keep');
		callback(['sampleFilter', matching]);
	};

	onIntersection = () => {
		var {columns, columnOrder, data, cohortSamples} = this.props.appState,
			m = _.last(searchSamples("!=null", columns,
					columnOrder, data, cohortSamples).matches),
			matching = _.map(m, i => cohortSamples[i]);
		gaEvents('spreadsheet', 'samplesearch', 'nulls');
		this.props.callback(['sampleFilter', matching]);
	}

	onResetSampleFilter = () => {
		gaEvents('spreadsheet', 'samplesearch', 'clear');
		this.props.onResetSampleFilter();
	}

	onFilterZoom = () => {
		const {appState: {samples, samplesMatched, zoom: {height}}, callback} = this.props,
			toOrder = _.object(samples, _.range(samples.length)),
			index = toOrder[_.min(samplesMatched, s => toOrder[s])],
			last = toOrder[_.max(samplesMatched, s => toOrder[s])];
		gaEvents('spreadsheet', 'samplesearch', 'zoom');
		callback(['zoom', {index, height, count: last - index + 1}]);
	};

	onFilterColumn = () => {
		const {appState: {cohortSamples, sampleSearch, allMatches}, callback} = this.props,
			matching = _.map(allMatches.matches, matchSet => _.map(matchSet, i => cohortSamples[i]));

		gaEvents('spreadsheet', 'samplesearch', 'new column');
		callback(['add-column', 0, getFilterColumn(sampleSearch, matching, allMatches.exprs, {filter: sampleSearch})]);
	};

	onTiesColumn = () => {
		const {appState: {ties: {filter, docs}, cohortSamples, survival: {patient}}, callback} = this.props,
			pindex = patient.data.req.values[0],
			pcodes = patient.data.codes,
			keep = new Set(Object.keys(filter).filter(k => filter[k]).map(i => docs[i].patient)),
			matching = cohortSamples.filter((s, i) => keep.has(pcodes[pindex[i]]));
		callback(['add-column', 0, getFilterColumn('TIES selection', matching)]); // XXX broken
		callback(['ties-dismiss']);
	};

	onMode = () => {
		var {callback, appState: {mode}} = this.props;
		gaEvents('spreadsheet', 'mode', modeEvent[mode]);
		callback([modeEvent[mode]]);
	};

	onMap = () => {
		var {callback} = this.props;
		gaEvents('spreadsheet', 'map');
		callback(['map', true]);
	}


	onRefresh = () => {
		var {callback} = this.props;
		callback(['refresh-cohorts']);
	};

	onPdf = () => {
		var {appState: {mode}} = this.props;

		gaEvents('spreadsheet', 'pdf', mode === 'heatmap' ? 'spreadsheet' : 'chart');
		modePdf[mode](this.props.appState);
	};

	onCohortSelect = (value) => {
		this.props.callback(['cohort', value]);
	};

    onTies = () => {
		var {appState: {ties}} = this.props;
        this.props.callback([_.get(ties, 'open') ? 'ties-dismiss' : 'ties-open']);
    };

	onDownload = () => {
		var {sampleFormat} = this.props,
			{samples, columns, columnOrder, index, data} = this.props.appState,
			// only download rectangular data
			rectData = columnOrder.filter(id => _.contains(['float', 'coded', 'segmented'], columns[id].valueType) && _.getIn(data, [id, 'status']) === 'loaded'),
			// Each dataset is two element array: [headers, [rows]]
			datasets = rectData.map(id =>
				widgets.download({samples, column: columns[id], index: index[id], data: data[id], sampleFormat})),
			combinedRows = _.mmap(..._.pluck(datasets, 1), (...rows) => {
				rows.pop(); // mmap passes index
				return [...rows[0], ..._.flatten(rows.slice(1).map(cols => cols.slice(1)))];
			}),
			combinedHeaders = _.flatmap(datasets, ([headers], i) =>
				i === 0 ? headers : headers.slice(1));

		gaEvents('spreadsheet', 'download', 'spreadsheet');
		download([combinedHeaders, combinedRows]);
	};

	onShowWelcome = () => {
		this.props.onShowWelcome();
	};

	onPickSamples = () => {
		var {pickSamples} = this.props;
		gaEvents('spreadsheet', 'samplesearch',
			'picking-' + (pickSamples ? 'end' : 'start'));
		this.props.onPickSamples();
	}

	render() {
		var {appState: {cohort, samplesOver, allowOverSamples, mode, showWelcome,
					samples, sampleSearch, searchHistory, sampleSearchSelection, samplesMatched, allMatches, /*tiesEnabled, */ties},
				onReset, onHighlightChange, onHighlightSelect,
				onAllowOverSamples, oldSearch, pickSamples, callback} = this.props,
			displayOver = samplesOver && !allowOverSamples ? '' : compStyles.hidden,
			matches = _.get(samplesMatched, 'length', samples.length),
			{onMap, onPdf, onDownload, onShowWelcome} = this,
			onMode = anyCanDraw(this.props.appState) ? this.onMode : undefined,
			tiesOpen = _.get(ties, 'open'),
			cohortName = _.get(cohort, 'name'),
			disablePDF = showChartWizard(this.props.appState),
			sampleFilter = _.get(cohort, 'sampleFilter'),
			filter = sampleFilter ? <span onClick={this.onResetSampleFilter} className={compStyles.appliedFilter}>Filtered to </span> : null;
		return (
				<AppBar theme={{inner: compStyles.inner}}>
					<div className={classNames(compStyles.appBarContainer, compStyles.cohort, pickSamples && compStyles.picking)}>
						<div className={compStyles.titleContainer}>
							<span className={compStyles.title}>{cohortName}</span>
							<span className={compStyles.subtitle}>{filter} {samples.length} Samples<i onClick={onAllowOverSamples} title="Samples on screen limited to 50000 for performance. Click to see all samples." className={`${compStyles.overWarning} ${displayOver} material-icons`}>warning</i></span>
						</div>
						{icon('refresh', 'Reload cohort data', this.onRefresh)}
						{icon('close', 'Pick new cohort', onReset)}
					</div>
					<div className={classNames(compStyles.appBarContainer, compStyles.tools)}>
						{tiesOpen ?
							<TiesSearch {...{onTies: this.onTies}}/> :
							<BasicSearch {...{
								value: sampleSearch,
								sampleFilter,
								oldSearch,
								selection: sampleSearchSelection,
								matches,
								offsets: allMatches.offsets,
								onHighlightSelect,
								sampleCount: samples.length,
								history: searchHistory || [],
								onHistory: this.onSearchHistory,
								onFilter: this.onFilter,
								onIntersection: this.onIntersection,
								onZoom: this.onFilterZoom,
								onCreateColumn: this.onFilterColumn,
								pickSamples: pickSamples,
								onPickSamples: this.onPickSamples,
								onChange: onHighlightChange,
								mode,
								onResetSampleFilter: this.onResetSampleFilter,
								cohort,
								callback,
								onTies: this.onTies,
								tiesEnabled: false}}/>}
					</div>
					<div className={classNames(compStyles.appBarContainer, compStyles.tools)}>
						{tiesOpen ? <TiesActions onTies={this.onTies} onTiesColumn={this.onTiesColumn}/> :
							<Actions {...{onMap, onPdf: disablePDF ? undefined : onPdf, onDownload, onShowWelcome, showWelcome, onMode, mode}}/>}
					</div>
				</AppBar>
		);
	}
}
