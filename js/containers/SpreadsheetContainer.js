'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var {rxEventsMixin} = require('../react-utils');
var getLabel = require('../getLabel');
var {supportsEdit} = require('../models/fieldSpec');
var {addCommas} = require('../util');

function zoomIn(pos, samples, zoom) {
	var {count, index} = zoom;
	var nCount = Math.max(1, Math.round(count / 3)),
		maxIndex = samples - nCount,
		nIndex = Math.max(0, Math.min(Math.round(index + pos * count - nCount / 2), maxIndex));

	return _.merge(zoom, {count: nCount, index: nIndex});
}

function zoomOut(samples, zoom) {
	var {count, index} = zoom;
	var nCount = Math.min(samples, Math.round(count * 3)),
		maxIndex = samples - nCount,
		nIndex = Math.max(0, Math.min(Math.round(index + (count - nCount) / 2), maxIndex));

	return _.merge(zoom, {count: nCount, index: nIndex});
}

function targetPos(ev) {
	var bb = ev.currentTarget.getBoundingClientRect();
	return (ev.clientY - bb.top) / ev.currentTarget.clientHeight;
}

var zoomInClick = ev => !ev.altKey && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey;
var zoomOutClick = ev => !ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.shiftKey;

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

var getSpreadsheetContainer = (Column, Spreadsheet) => React.createClass({
	displayName: 'SpreadsheetContainer',
	mixins: [rxEventsMixin],
	getInitialState() {
		return {
			interactive: {}
		};
	},
	onInteractive(key, interactive) {
		this.setState({interactive:
			_.assoc(this.state.interactive, key, interactive)});
	},
	componentWillMount() {
		this.events('plotClick');

		this.plotClick = this.ev.plotClick.subscribe(ev => {
			let {callback, appState: {zoom, samples}} = this.props;
			if (zoomOutClick(ev)) {
				callback(['zoom', zoomOut(samples.length, zoom)]);
			} else if (zoomInClick(ev)) {
				callback(['zoom', zoomIn(targetPos(ev), samples.length, zoom)]);
			}
		});
	},
	componentWillUnmount() {
		this.plotClick.unsubscribe();
	},
	onResize: function (id, size) {
		this.props.callback(['resize', id, size]);
	},
	onXZoom: function(id, xzoom) {
		this.props.callback(['xzoom', id, xzoom]);
	},
	onRemove: function (id) {
		this.props.callback(['remove', id]);
	},
	onKm: function (id) {
		this.props.callback(['km-open', id]);
	},
	onSortDirection: function (id, newDir) {
		this.props.callback(['sortDirection', id, newDir]);
	},
	onMode: function (id, newMode) {
		this.props.callback(['fieldType', id, newMode]);
	},
	onColumnLabel: function (id, value) {
		this.props.callback(['columnLabel', id, value]);
	},
	onFieldLabel: function (id, value) {
		this.props.callback(['fieldLabel', id, value]);
	},
	onShowIntrons: function (id) {
		this.props.callback(['showIntrons', id]);
	},
	onSortVisible: function (id, value) {
		this.props.callback(['sortVisible', id, value]);
	},
	onOpenVizSettings: function (id) {
		this.props.callback(['vizSettings-open', id]);
	},
	onVizSettings: function (id, state) {
		this.props.callback(['vizSettings', id, state]);
	},
	onEdit: function (id) {
		this.props.callback(['edit-column', id]);
	},
	onAddColumn(pos) {
		this.props.callback(['edit-column', pos]);
	},
	onReload: function (id) {
		this.props.callback(['reload', id]);
	},
	onReset() {
		this.props.callback(['cohortReset']);
	},
	onPlotClick(ev) {
		// Having callback that checks isInteractive is better than only
		// passing a callback when isInteractive is true, because the latter
		// causes downstream props to change, which causes re-renders.
		if (isInteractive(this.props, this.state)) {
			this.on.plotClick(ev);
		}
	},
    onAbout(host, dataset) {
        this.props.callback(['navigate', 'datapages', {host, dataset}]);
    },
	render() {
		var columnProps = _.pick(this.props,
				['searching', 'supportsGeneAverage', 'disableKM', 'fieldFormat', 'sampleFormat', 'samplesMatched']),
			{appState} = this.props,
			{columnOrder, wizardMode} = appState,
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
						cohort={appState.cohort}
                        onAbout={this.onAbout}
						onViz={this.onOpenVizSettings}
						onEdit={supportsEdit(_.get(appState.columns, id)) &&
							interactive ? this.onEdit : null}
						onFieldLabel={this.onFieldLabel}
						onColumnLabel={this.onColumnLabel}
						onReset={this.onReset}
						onShowIntrons={this.onShowIntrons}
						onSortVisible={this.onSortVisible}
						onMode={this.onMode}
						onKm={this.onKm}
						onSortDirection={this.onSortDirection}
						onXZoom={this.onXZoom}
						onRemove={this.onRemove}
						onResize={this.onResize}
						onReload={this.onReload}
						actionKey={id}
						first={i === 0}
						{...columnProps}
						onClick={this.onPlotClick}
						{...columnSelector(id, i, appState)}
						wizardMode={wizardMode}
						editing={appState.editing}/>))}
			</Spreadsheet>);
	}
});

module.exports = {getSpreadsheetContainer};
