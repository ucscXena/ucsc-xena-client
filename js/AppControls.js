import {AppBar, Box, Divider, Icon, IconButton, Tooltip, Typography} from '@material-ui/core';
import PureComponent from './PureComponent';
import React from 'react';
import pdfSpreadsheet from './pdfSpreadsheet';
import pdfChart from './pdfChart';
import * as _ from './underscore_ext.js';
import * as widgets from './columnWidgets.js';
import classNames from 'classnames';
import gaEvents from './gaEvents.js';
import { signatureField } from './models/fieldSpec.js';
import { invert, searchSamples } from './models/searchSamples.js';
import { SampleSearch } from './views/SampleSearch';
import uuid from './uuid';
import {anyCanDraw, showWizard as showChartWizard} from './chart/utils.js';
import {hidden} from './nav';
import {xenaColor} from './xenaColor';
import {fromBitmap, union, removeRows, isSet, bitCount} from './models/bitmap';

// Styles
import compStyles from "./AppControls.module.css";

var sxControlBar = {
	borderBottom: `1px solid ${xenaColor.BLACK_12}`,
	display: 'flex',
	minHeight: 64,
};
var sxControlBarInner = {
	alignItems: 'stretch',
	display: 'flex',
	flex: 1,
	maxWidth: '100vw', /* required for horizontal scroll */
	minWidth: 'fit-content',
	padding: '0 24px',
};
var sxFlex = {
	alignItems: 'center',
	display: 'flex',
};
var sxControlTools = {
	flex: 1,
	paddingLeft: 16,
};

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

var ActionIcon = (i, tooltip, edge, onClick, disabled) => (
	<Tooltip title={tooltip}>
		{/* span is required for wrapping Tooltip around a disabled IconButton; see https://v4.mui.com/components/tooltips/#disabled-elements */}
		<span>
			<IconButton
				disabled={disabled}
				edge={edge && 'end'}
				onClick={onClick}>
				<Icon>{i}</Icon>
			</IconButton>
		</span>
	</Tooltip>
);

var Actions = ({onPdf, onDownload, onShowWelcome, showWelcome, onMode, mode}) => {
	return (
	<>
		{ActionIcon(modeIcon[mode], modeHelp[!onMode || mode], false, onMode, !onMode)}
		{ActionIcon('picture_as_pdf', 'Download as PDF', false, onPdf, !onPdf)}
		{ActionIcon('cloud_download', 'Download as tsv', showWelcome, onDownload)}
		{showWelcome ? null : ActionIcon('help', 'Show carousel', true, onShowWelcome)}
	</>
	);
};

var BasicSearch = ({...searchProps}) => (
	<>
		<SampleSearch {...searchProps}/>
	</>);

function getFilterColumn(title, samples, matches, exprs, opts = {}) {
	var field = signatureField(title, {
			columnLabel: 'Subgroup',
			valueType: 'coded',
			signature: ['cross', matches, exprs, samples],
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
	};

	onFilter = inv => {
		const {callback, appState: {samplesMatched, cohortSamples}} = this.props,
			m = inv ? invert(cohortSamples.length, samplesMatched) :
				samplesMatched;
		gaEvents('spreadsheet', 'samplesearch', inv ? 'remove' : 'keep');
		callback(['sampleFilter', m]);
	};

	onIntersection = () => {
		var {columns, columnOrder, data, cohortSamples} = this.props.appState,
			m = _.last(searchSamples("!=null", columns,
					columnOrder, data, cohortSamples).matches);
		gaEvents('spreadsheet', 'samplesearch', 'nulls');
		this.props.callback(['sampleFilter', m]);
	};

	onResetSampleFilter = () => {
		gaEvents('spreadsheet', 'samplesearch', 'clear');
		this.props.onResetSampleFilter();
	};

	onFilterZoom = () => {
		const {appState: {samples, samplesMatched, zoom: {height}}, callback} = this.props,
			index = _.findIndex(samples, i => isSet(samplesMatched, i)),
			last = _.findLastIndex(samples, i => isSet(samplesMatched, i));
		gaEvents('spreadsheet', 'samplesearch', 'zoom');
		callback(['zoom', {index, height, count: last - index + 1}]);
	};

	onFilterColumn = () => {
		const {appState: {cohortSamples, sampleSearch, allMatches}, callback} = this.props;

		gaEvents('spreadsheet', 'samplesearch', 'new column');
		var u = union(...allMatches.matches);
		cohortSamples.filter(fromBitmap(u)).subscribe(samples => {
			var matching = allMatches.matches.map(m =>
				removeRows(m, u, cohortSamples.length, samples.length));
			callback(['add-column', 0,
				getFilterColumn(sampleSearch, samples, matching, allMatches.exprs,
								{filter: sampleSearch})]);
		});
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
	};


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
	};

	render() {
		var {appState: {cohort, samplesOver, allowOverSamples, mode, showWelcome,
					samples, sampleSearch, searchHistory, sampleSearchSelection, samplesMatched, allMatches},
				onReset, onHighlightChange, onHighlightSelect,
				onAllowOverSamples, oldSearch, pickSamples, callback} = this.props,
			displayOver = samplesOver && !allowOverSamples,
			matches = samplesMatched ? bitCount(samplesMatched) : samples.length,
			{onMap, onPdf, onDownload, onShowWelcome} = this,
			onMode = anyCanDraw(this.props.appState) ? this.onMode : undefined,
			cohortName = _.get(cohort, 'name'),
			disablePDF = showChartWizard(this.props.appState),
			sampleFilter = _.get(cohort, 'sampleFilter'),
			filter = sampleFilter ? <span onClick={this.onResetSampleFilter} className={compStyles.appliedFilter}>Filtered to</span> : null;
		return (
			<AppBar>
				<Box sx={sxControlBar}>
					<Box sx={sxControlBarInner}>
						<Box className={classNames(compStyles.cohort, pickSamples && compStyles.picking)} sx={sxFlex}>
							<div className={compStyles.titleContainer}>
								<Typography component='span' variant='subtitle1'>{cohortName}</Typography>
								<Box
									component={Typography}
									color='text.hint'
									sx={{alignItems: 'center', display: 'flex', gap: 6}}
									variant='caption'><span>{filter} {samples.length} Samples</span>
									{displayOver && <Box
										component={IconButton}
										color='warning.main'
										onClick={onAllowOverSamples}
										sx={{padding: 0}}
										title="Samples on screen limited to 50000 for performance. Click to see all samples.">
										<Icon fontSize='small'>warning</Icon></Box>}
								</Box>
							</div>
							{ActionIcon('refresh', 'Reload cohort data', false, this.onRefresh)}
							{ActionIcon('close', 'Pick new cohort', true, onReset)}
						</Box>
						<Divider flexItem orientation='vertical' />
						<Box sx={{...sxFlex, ...sxControlTools, paddingRight: 16}}>
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
							callback}}/>
							</Box>
						<Divider flexItem orientation='vertical' />
						<Box sx={{...sxFlex, ...sxControlTools, justifyContent: 'flex-end'}}>
							<Actions {...{onMap, onPdf: disablePDF ? undefined : onPdf, onDownload, onShowWelcome, showWelcome, onMode, mode}}/>
						</Box>
					</Box>
					<Divider flexItem orientation='vertical'/>
				</Box>
			</AppBar>
		);
	}
}
