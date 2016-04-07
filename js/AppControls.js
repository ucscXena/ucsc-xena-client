/*global require: false, module: false */

'use strict';

var React = require('react');
var CohortSelect = require('./views/CohortSelect');
var {ButtonToolbar, ButtonGroup, Button, Glyphicon} = require('react-bootstrap/lib');
var Tooltip = require('react-bootstrap/lib/Tooltip');
var pdf = require('./pdfSpreadsheet');
var _ = require('./underscore_ext');
require('./Columns.css'); // XXX switch to js styles
require('./YAxisLabel.css'); // XXX switch to js styles

var ModeControls = React.createClass({
	makeModeBtn: function(mode, key) {
		let {disabledModes, activeMode, onMode} = this.props,
			isActive = (key === activeMode),
			disabled = _.contains(disabledModes, key);
		return (
			<Button key={key} bsStyle='default' href='#' active={isActive}
				disabled={disabled} onClick={() => onMode(key)}>
				{disabled ? <s>{mode.name}</s> : mode.name}
			</Button>
		);
	},
	render: function() {
		return (
			<ButtonGroup>
				{_.map(this.props.modes, (mode, key) => this.makeModeBtn(mode, key))}
			</ButtonGroup>
		);
	}
});

// XXX drop this.props.style? Not sure it's used.
var AppControls = React.createClass({
	onMode: function (newMode) {
		let {activeMode, callback, kmColumns, modes} = this.props,
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
	onPdf: function () {
		pdf(this.props.appState);
	},
	//onSamplesSelect: function (value) {
	//	this.props.callback(['samplesFrom', value]);
	//},
	onCohortSelect: function (value) {
		this.props.callback(['cohort', value]);
	},
	render: function () {
		const tooltip = <Tooltip id='reload-cohorts'>Reload cohorts from all hubs.</Tooltip>;
		let {activeMode, appState: {cohort, cohorts, columnOrder},
				disabledModes, modes, onColumnEdit} = this.props,
			hasCohort = !!cohort,
			hasColumns = cohort && (columnOrder.length > 0);
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
				{hasCohort ?
				<div className="col-md-2">
					<ButtonGroup>
						<Button title='Add a column' onClick={() => onColumnEdit(true)}>
							<Glyphicon glyph="plus" /> Data
						</Button>
						{hasColumns ?
						<Button title='Filter columns' onClick={this.onRefresh}>
							<Glyphicon glyph="filter" /> Filter
						</Button> : null}
					</ButtonGroup>
				</div> : null}
				{hasColumns ?
				<div className="col-md-5">
					<ModeControls activeMode={activeMode} modes={modes}
						disabledModes={disabledModes} onMode={this.onMode}/>
				</div> : null}
				{hasColumns ?
				<div className="col-md-2">
					<ButtonGroup>
						<Button href='#' onClick={this.onPdf}>
							<Glyphicon glyph="cloud-download" /> Download
						</Button>
						<Button href='#' onClick={this.onPdf}>PDF</Button>
					</ButtonGroup>
				</div> : null}
			</div>
		);
	}
});

module.exports = AppControls;
