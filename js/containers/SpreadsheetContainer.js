
var React = require('react');
var _ = require('../underscore_ext').default;
var getLabel = require('../getLabel');
var {supportsEdit} = require('../models/fieldSpec');
var {addCommas} = require('../util').default;
import {pickSamplesFilter} from '../models/searchSamples';

function fixSampleTitle(column, i, samples, wizardMode, cohort) {
	return i === 0 ? _.updateIn(column,
		['user', 'fieldLabel'], label => wizardMode ?
			`${addCommas(samples.length)} samples` : label,
		['user', 'columnLabel'], label => wizardMode ? cohort.name : label) :
	column;
}

function columnSelector(id, i, appState) {
	var {data, zoom, columns, samples, samplesMatched, wizardMode, cohort} = appState;
	return {
		id: id,
		key: id,
		samples: samples,
		samplesMatched: samplesMatched,
		zoom: zoom,
		index: _.getIn(appState, ['index', id]),
		vizSettings: _.getIn(appState, ['columns', id, 'vizSettings']),
		data: _.getIn(data, [id]) /* refGene */,
		column: fixSampleTitle(_.getIn(columns, [id]), i, samples, wizardMode, cohort),
		label: getLabel(i) // <<- put in Spreadsheet? We don't really need it here.
	};
}

function isInteractive(props, state) {
	var {interactive} = state,
		{appState: {wizardMode, editing}} = props;
	return !wizardMode && editing == null && _.every(interactive);
}

var getSpreadsheetContainer = (Column, Spreadsheet) => class extends React.Component {
	static displayName = 'SpreadsheetContainer';

	state = {
	    interactive: {}
	};

	onInteractive = (key, interactive) => {
		this.setState({interactive:
			_.assoc(this.state.interactive, key, interactive)});
	};

	onResize = (id, size) => {
		this.props.callback(['resize', id, size]);
	};

	onXZoom = (id, xzoom) => {
		this.props.callback(['xzoom', id, xzoom]);
	};

	onYZoom = (yzoom) => {
		this.props.callback(['enableTransition'], false);
		this.props.callback(['zoom', yzoom]);
	};

	onRemove = (id) => {
		this.props.callback(['remove', id]);
	};

	onKm = (id) => {
		this.props.callback(['km-open', id]);
	};

	onSortDirection = (id, newDir) => {
		this.props.callback(['sortDirection', id, newDir]);
	};

	onMode = (id, newMode) => {
		this.props.callback(['fieldType', id, newMode]);
	};

	onColumnLabel = (id, value) => {
		this.props.callback(['columnLabel', id, value]);
	};

	onFieldLabel = (id, value) => {
		this.props.callback(['fieldLabel', id, value]);
	};

	onShowIntrons = (id) => {
		this.props.callback(['showIntrons', id]);
	};

	onChart = (id) => {
		this.props.callback(['chart-set-column', id]);
		this.props.callback(['chart']);
	};

	onCluster = (id, value, data) => {
		this.props.callback(['cluster', id, value, data]);
	};

	onSortVisible = (id, value) => {
		this.props.callback(['sortVisible', id, value]);
	};

	onOpenVizSettings = (id) => {
		this.props.callback(['vizSettings-open', id]);
	};

	onVizSettings = (id, state) => {
		this.props.callback(['vizSettings', id, state]);
	};

	onEdit = (id) => {
		this.props.callback(['edit-column', id]);
	};

	onAddColumn = (pos) => {
		this.props.callback(['edit-column', pos]);
	};

	onReload = (id) => {
		this.props.callback(['reload', id]);
	};

	onReset = () => {
		this.props.callback(['cohortReset']);
	};

	onAbout = (host, dataset) => {
        this.props.callback(['navigate', 'datapages', {host, dataset}]);
	};

	onPickSamplesSelect = (id, zoom, flop, finish) => {
		// This will be called from a drag-select callback, where 'finish' is
		// false during the drag and true on mouseup.  We stash the current
		// search term in local state during the initial call, and splice in
		// the new term.
		// 'flop' is true if the drag start is below the drag end. This is used
		// to clip the drag end point if it extends into an incongruous region.
		var oldSearch = (this.state.picking ? this.state.oldSearch
				: this.props.appState.sampleSearch);

		if (!this.state.picking) {
			this.setState({picking: true, oldSearch: this.props.appState.sampleSearch});
		}
		if (finish) {
			this.setState({picking: false, oldSearch: null});
		}
		var {data, columns, columnOrder, samples} = this.props.appState,
			last = columnOrder.indexOf(id),
			ids = columnOrder.slice(1, last + 1),
			cols = ids.map(c => columns[c]),
			colData = ids.map(c => data[c]);

		// splice the new term into the front, where it's more visible to the user.
		this.props.callback(['sample-search',
				pickSamplesFilter(flop, colData, samples, cols, id, zoom) +
				((oldSearch || '').trim().length ? ` OR ${oldSearch}` : '')]);
	};

	render() {
		var columnProps = _.pick(this.props,
				['pickSamples', 'searching', 'fieldFormat', 'sampleFormat', 'samplesMatched']),
			{appState, wizard: {cohortTumorMap}} = this.props,
			{columnOrder, wizardMode, hasSurvival} = appState,
			interactive = isInteractive(this.props, this.state);

		// XXX prune callback from this.props
		// Currently it's required for ColumnEdit2 and zoom helper.
		return (
			<Spreadsheet
					onAddColumn={this.onAddColumn}
					onOpenVizSettings={this.onOpenVizSettings}
					onVizSettings={this.onVizSettings}
					interactive={interactive}
					onInteractive={this.onInteractive}
					{...this.props}>

				{_.map(columnOrder, (id, i) => (
					<Column
						interactive={interactive}
						hasSurvival={hasSurvival}
						cohort={appState.cohort}
						onAbout={this.onAbout}
						onViz={this.onOpenVizSettings}
						onEdit={supportsEdit(_.get(appState.columns, id)) &&
							interactive ? this.onEdit : null}
						onFieldLabel={this.onFieldLabel}
						onColumnLabel={this.onColumnLabel}
						onReset={this.onReset}
						onShowIntrons={this.onShowIntrons}
						onCluster={this.onCluster}
						onSortVisible={this.onSortVisible}
						onMode={this.onMode}
						onInteractive={this.onInteractive}
						onKm={this.onKm}
						onChart={this.onChart}
						onSortDirection={this.onSortDirection}
						onXZoom={this.onXZoom}
						onYZoom={this.onYZoom}
						onRemove={this.onRemove}
						onResize={this.onResize}
						onReload={this.onReload}
						onPickSamplesSelect={this.onPickSamplesSelect}
						actionKey={id}
						first={i === 0}
						{...columnProps}
						{...columnSelector(id, i, appState)}
						wizardMode={wizardMode}
						editing={appState.editing}
						tumorMap={cohortTumorMap}/>))}
			</Spreadsheet>);
	}
};

module.exports = {getSpreadsheetContainer};
