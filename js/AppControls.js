/*global require: false, module: false */

'use strict';

var React = require('react');
var CohortSelect = require('./views/CohortSelect');
var {ButtonGroup, Button, Glyphicon} = require('react-bootstrap/lib');
var Tooltip = require('react-bootstrap/lib/Tooltip');
var pdf = require('./pdfSpreadsheet');
var _ = require('./underscore_ext');
require('./Columns.css'); // XXX switch to js styles
require('./YAxisLabel.css'); // XXX switch to js styles

function datasetControl(cohort, onAction) {
	var hasCohort = !!cohort;
	return hasCohort ?
		(<ButtonGroup bsSize='small'>
			<Button onClick={() => onAction('add')}>
				<Glyphicon glyph="plus" /> Data
			</Button>
		</ButtonGroup>) : null;
}

function filterControl(columnOrder, onAction) {
	var disabled = (columnOrder.length < 1);
	return disabled ? null : (
		<ButtonGroup bsSize='small'>
			<button className='btn btn-default' onClick={() => onAction('filter')}
					style={{float: 'left'}} disabled={disabled}>
				<Glyphicon glyph="filter" />Filter
			</button>
			<button className='btn btn-info' style={{float: 'right'}} disabled>
				<em>55.3% Results</em>
			</button>
		</ButtonGroup>
	);
}

function downloadControls(columnOrder, disabledButtons, onDownloads) {
	return (columnOrder.length < 1) ? null :
		(<ButtonGroup bsSize='small'>
			<Button href='#' onClick={onDownloads.default}>
				<Glyphicon glyph="cloud-download" /> Download
			</Button>
			{_.contains(disabledButtons, 'pdf') ? null :
			<Button href='#' onClick={onDownloads.pdf}>PDF</Button>}
		</ButtonGroup>);
}

function modeControls(state, activeMode, disabledModes, modes, onMode) {
	var buttons = _.map(modes, (mode, key) => {
		let isActive = (key === activeMode),
			disabled = _.contains(disabledModes, key);
		return (
			<Button key={key} bsStyle='default' href='#' active={isActive}
					disabled={disabled} onClick={() => onMode(key)}>
				{disabled ? <s>{mode.name}</s> : mode.name}
			</Button>
		);
	});

	return (state.columnOrder.length < 1) ? null
		: (<ButtonGroup bsSize='small'>{buttons}</ButtonGroup>);
}

// XXX drop this.props.style? Not sure it's used.
var AppControls = React.createClass({
	onDownloads: function() {
		return {
			default: () => console.log("downloading..."),
			pdf: () => pdf(this.props.appState)
		}
	},
	onCohortSelect: function (value) {
		this.props.callback(['cohort', value]);
	},
	onFilter: function() {
		console.log("filtering...");
	},
	onMode: function (newMode) {
		var {activeMode, callback, kmColumns, modes} = this.props,
			activeEvents = modes[activeMode].events,
			newEvents = modes[newMode].events,
			id = (newMode === 'kmPlot') ? _.last(_.keys(kmColumns)) : null;

		if (newMode !== activeMode) {
			if (activeEvents) {
				// closing procedures for the current/active mode
				callback([activeEvents.close]);
			}

			let args = (newEvents ? [newEvents.open] : [newMode]).concat(id ? [id] : []);
			callback(args);
		}
	},
	onRefresh: function () {
		var {callback} = this.props;
		callback(['refresh-cohorts']);
	},
	onSamplesSelect: function (value) {
		this.props.callback(['samplesFrom', value]);
	},
	render: function () {
		const tooltip = <Tooltip id='reload-cohorts'>Reload cohorts from all hubs.</Tooltip>;
		var {activeMode, appState, kmColumns, modes, onAction} = this.props,
			{cohort, cohorts, columnOrder} = appState,
			disabledModes = (_.toArray(kmColumns).length < 1) ? ['kmPlot'] : [];
		/*
			1. Column list with minimum 1 column will enable Km Plot button
				a) Column list assume to have ONLY Km Plot-allowed columns!
			2. Pressing Km Plot button will invoke callback, supplying both 'km-open' and its Id
		 */
		return (
			<div className="row container text-center">
				<div className="col-md-3 text-left">
					<CohortSelect onSelect={this.onCohortSelect} cohort={cohort} cohorts={cohorts}/>
				</div>
				<div className='col-md-1 text-center'>
					{datasetControl(cohort, onAction)}
				</div>
				<div className='col-md-2 text-center'>
					{filterControl(columnOrder, onAction)}
				</div>
				<div className='col-md-4 text-center'>
					{modeControls(appState, activeMode, disabledModes, modes, this.onMode)}
				</div>
				<div className="col-md-2 text-left">
					{downloadControls(columnOrder, (activeMode === 'chart' ? ['pdf'] : []), this.onDownloads())}
				</div>
			</div>
		);
	}
});

module.exports = AppControls;
