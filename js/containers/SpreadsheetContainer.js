'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var {rxEventsMixin} = require('../react-utils');
var getLabel = require('../getLabel');
var {hasSignatureField} = require('../models/fieldSpec');

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

function columnSelector(id, i, appState) {
	var {data, zoom, columns, samples, samplesMatched} = appState;
	return {
		id: id,
		key: id,
		samples: samples,
		samplesMatched: samplesMatched,
		zoom: zoom,
		index: _.getIn(appState, ['index', id]),
		vizSettings: _.getIn(appState, ['columns', id, 'vizSettings']),
		data: _.getIn(data, [id]) /* refGene */,
		column: _.getIn(columns, [id]),
		label: getLabel(i) // <<- put in Spreadsheet? We don't really need it here.
	};
}

var getSpreadsheetContainer = (Column, Spreadsheet) => React.createClass({
	displayName: 'SpreadsheetContainer',
	mixins: [rxEventsMixin],
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
	onReorder: function (order) {
		this.props.callback(['order', order]);
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
	render() {
		var columnProps = _.pick(this.props,
				['searching', 'supportsGeneAverage', 'disableKM', 'datasetMeta', 'fieldFormat', 'sampleFormat', 'samplesMatched']),
			{appState} = this.props,
			{columnOrder} = appState,
			onClick = appState.wizardMode ? null : this.on.plotClick;

		// XXX prune callback from this.props
		// Currently it's required for ColumnEdit2 and zoom helper.
		return (
			<Spreadsheet
					onAddColumn={this.onAddColumn}
					onReorder={this.onReorder}
					onOpenVizSettings={this.onOpenVizSettings}
					onVizSettings={this.onVizSettings}
					{...this.props}>

				{_.map(columnOrder, (id, i) => (
					<Column
						cohort={appState.cohort}
						onViz={this.onOpenVizSettings}
						onEdit={!hasSignatureField(_.get(appState.columns, id)) &&
							appState.editing == null ? this.onEdit : null}
						onFieldLabel={this.onFieldLabel}
						onColumnLabel={this.onColumnLabel}
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
						onClick={onClick}
						{...columnSelector(id, i, appState)}
						wizardMode={appState.wizardMode}
						editing={appState.editing}/>))}
			</Spreadsheet>);
	}
});

module.exports = {getSpreadsheetContainer};
