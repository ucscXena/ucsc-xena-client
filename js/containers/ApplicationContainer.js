import PureComponent from '../PureComponent';
import React from 'react';
import { getSpreadsheetContainer } from './SpreadsheetContainer.js';
import ChartView from '../chart/ChartView.js';
import Column from '../views/Column';
import * as _ from '../underscore_ext.js';
import { rxEvents } from '../react-utils.js';
import Rx from '../rx';

// Spreadsheet options
import addTooltip from './addTooltip.js';

import addWizardColumns from './addWizardColumns.js';
import addVizEditor from './addVizEditor.js';
import makeSortable from './makeSortable.js';
import addColumnAdd from './addColumnAdd.js';
import addLegend from './addLegend.js';
import addHelp from './addHelp.js';
import getSpreadsheet from '../Spreadsheet.js';
import Application from '../Application.js';
import { schemaCheckThrow } from '../schemaCheck.js';
import wrapLaunchHelper from '../LaunchHelper';
import migrateState from '../migrateState.js';
import { expandState } from '../compactData.js';
import selector from '../appSelector';

function getFieldFormat(uuid, columns, data) {
	var columnFields = _.getIn(columns, [uuid, 'fields']),
		label = _.getIn(columns, [uuid, 'fieldLabel']),
		fields = _.getIn(data, [uuid, 'req', 'probes'], columnFields);
	if (fields.length === 1) {                           // 1 gene/probe, or 1 probe in gene
		return field => (field === label) ? label : `${label} (${field})`;
	} else if (fields.length === columnFields.length) {  // n > 1 genes/probes
		return _.identity;
	} else {                                             // n > 1 probes in gene
		return field => `${label} (${field})`;
	}
}

var columnsWrapper = c => addHelp(addTooltip(addWizardColumns(addColumnAdd(addLegend(makeSortable(addVizEditor(c)))))));
var Spreadsheet = getSpreadsheet(columnsWrapper);
// XXX without tooltip, we have no mouse pointer. Should make the wrapper add the css
// that hides the mouse. Currently this is in Column.
//var columnsWrapper = c => makeSortable(disableSelect(c));
var SpreadsheetContainer = getSpreadsheetContainer(Column, Spreadsheet);


class ApplicationContainer extends PureComponent {
	state = {
		pickSamples: false
	};

	onSearch = (value) => {
		var {callback} = this.props;
		this.setState({searchReplace: false});
		callback(['sample-search', value]);
	};

	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		var events = rxEvents(this, 'highlightChange');
		this.change = events.highlightChange
			.debounceTime(200)
			.subscribe(this.onSearch);
		// high on 1st change, low after some delay
		this.highlight = events.highlightChange
			.switchMap(() => Rx.Observable.of(true).concat(Rx.Observable.of(false).delay(300)))
			.distinctUntilChanged(_.isEqual);
	}

	componentWillUnmount() {
		this.change.unsubscribe();
		this.highlight.unsubscribe();
	}

	fieldFormat = (uuid) => {
		var {spreadsheet: {columns, data}} = this.props.state;
		return getFieldFormat(uuid, columns, data);
	};

	sampleFormat = (index) => {
		var {spreadsheet: {cohortSamples}} = this.props.state;
		return _.get(cohortSamples, index);
	};

	// raw (before selector) state
	getState = () => {
		return _.pick(this.props.state, 'version', 'page', 'spreadsheet');
	};

	onWizardMode = (mode) => {
		this.props.callback(['wizardMode', mode]);
	};

	onShowWelcome = (show) => {
		this.props.callback(['showWelcome', show]);
	};

	onReset = () => {
		this.props.callback(['cohortReset']);
	};

	onResetSampleFilter = () => {
		this.props.callback(['sampleFilter', null]);
	};

	onNavigate = (page, params) => {
		this.props.callback(['navigate', page, params]);
	};

	onImport = content => {
		Rx.Observable.of(content).map(c => migrateState(JSON.parse(c)))
		.flatMap(expandState)
		.map(schemaCheckThrow).subscribe(
			state => this.props.callback(['import', state]),
			err => {
				console.error('import error', err);
				this.props.callback(['import-error']);
			});
	};

	onHighlightSelect = highlight => {
		this.props.callback(['highlightSelect', highlight]);
	};

	onAllowOverSamples = () => {
		this.props.callback(['allowOverSamples', true]);
	};

	onPickSamples = () => {
		this.setState({pickSamples: !this.state.pickSamples});
	};

	onPicking = (newTerm, finish) => {
		var oldSearch = (this.state.oldSearch == null ?
				this.props.state.spreadsheet.sampleSearch : this.state.oldSearch) || '',
			sampleSearch = (oldSearch ? `${oldSearch} OR ` : '') + newTerm;
		this.setState({oldSearch});
		this.props.callback(['sample-search', sampleSearch]);
		if (finish) {
			// There's potentially a race here with callback()
			_.defer(() => this.setState({oldSearch: null}));
		}
	};

	// XXX Change state to appState in Application, for consistency.
	render() {
		let {state, callback, children} = this.props,
			{pickSamples} = this.state,
			{stateError} = state,
			computedState = selector(state),
			{spreadsheet: {mode}, loadPending} = computedState,
			View = {
				heatmap: SpreadsheetContainer,
				chart: ChartView,
			}[mode];
		return (
			<Application
					onReset={this.onReset}
					onResetSampleFilter={this.onResetSampleFilter}
					onWizardMode={this.onWizardMode}
					onShowWelcome={this.onShowWelcome}
					Spreadsheet={SpreadsheetContainer /* XXX */}
					onHighlightChange={this.on.highlightChange}
					onHighlightSelect={this.onHighlightSelect}
					onAllowOverSamples={this.onAllowOverSamples}
					pickSamples={pickSamples}
					onPickSamples={this.onPickSamples}
					oldSearch={this.state.oldSearch}
					sampleFormat={this.sampleFormat}
					getState={this.getState}
					onNavigate={this.onNavigate}
					onImport={this.onImport}
					loadPending={loadPending}
					stateError={stateError}
					state={computedState.spreadsheet}
					callback={callback}>
				<View
					searching={this.highlight}
					fieldFormat={this.fieldFormat}
					sampleFormat={this.sampleFormat}
					appState={computedState.spreadsheet}
					wizard={computedState.wizard}
					pickSamples={pickSamples}
					onPicking={this.onPicking}
					callback={callback}/>
				{children}
			</Application>);
	}
}

// add pop-up notification for old hubs.
export default wrapLaunchHelper(
		props => _.getIn(props, ['state', 'localStatus']) === 'old',
		ApplicationContainer);
