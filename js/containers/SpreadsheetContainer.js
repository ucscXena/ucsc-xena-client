/*global module: false, require: false */
'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var {rxEventsMixin} = require('../react-utils');
var getLabel = require('../getLabel');

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
		this.plotClick.dispose();
	},
	onReorder: function (order) {
		this.props.callback(['order', order]);
	},
	onResize: function (id, size) {
		this.props.callback(['resize', id, size]);
	},
	onRemove: function (id) {
		this.props.callback(['remove', id]);
	},
	onKm: function (id) {
		this.props.callback(['km-open', id]);
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
	onOpenVizSettings: function (id) {
		this.props.callback(['vizSettings-open', id]);
	},
	onVizSettings: function (id, state) {
		this.props.callback(['vizSettings', id, state]);
	},
	onReload: function (id) {
		this.props.callback(['reload', id]);
	},
	render() {
		var columnProps = _.pick(this.props,
				['searching', 'supportsGeneAverage', 'disableKM', 'datasetMeta', 'fieldFormat', 'sampleFormat', 'samplesMatched']),
			{appState} = this.props,
			{columnOrder} = appState;
		// XXX prune callback from this.props
		// Currently it's required for ColumnEdit2 and zoom helper.
		return (
			<Spreadsheet onReorder={this.onReorder} onOpenVizSettings={this.onOpenVizSettings} onVizSettings={this.onVizSettings} {...this.props}>
				{_.map(columnOrder, (id, i) => (
					<Column
						onViz={this.onOpenVizSettings}
						onFieldLabel={this.onFieldLabel}
						onColumnLabel={this.onColumnLabel}
						onMode={this.onMode}
						onKm={this.onKm}
						onRemove={this.onRemove}
						onResize={this.onResize}
						onReload={this.onReload}
						actionKey={id}
						{...columnProps}
						onClick={this.ev.plotClick}
						{...columnSelector(id, i, appState)}/>))}
			</Spreadsheet>);
	}
});

module.exports = {getSpreadsheetContainer};
