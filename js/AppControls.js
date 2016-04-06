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

var modeButton = {
	chart: 'Heatmap',
	heatmap: 'Chart'
};

var modeEvent = {
	chart: 'heatmap',
	heatmap: 'chart'
};

var ModeControls = React.createClass({
	//componentWillReceiveProps: function(newProps) {
	//	if (!_.isEqual(newProps.kmColumns, this.props.kmColumns)) {
	//		let disableKm = this.disableKm(newProps.kmColumns);
	//		this.setState(_.assocIn(this.state, ['modes', 'km-open', 'disable'], disableKm));
	//	}
	//},
	makeModeBtn: function(mode, key) {
		let {disabledModes, activeMode, onMode} = this.props,
			isActive = (key === activeMode);
		return (
			<Button key={key} bsStyle={isActive ? 'default' : 'success'} active={isActive}
				disabled={_.contains(disabledModes, key)} onClick={() => onMode(key)}>
				{!isActive ? <Glyphicon glyph={mode.icon} /> : ''} {mode.name}
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
	//getInitialState: function() {
	//	let {mode} = this.props.appState;
	//	return {
	//		modeButtons: modeButtons.map(modeBtn => {
	//			let activeMode; // means whether the button is allowed to be active
	//			if (_.has(modeBtn, 'prop'))
	//				activeMode = this.props[modeBtn['prop']] ? mode : null;
	//			else
	//				activeMode = mode;
	//			return makeModeBtn(modeBtn, activeMode, this.onMode);
	//		})
	//	};
	//},
	onMode: function (newMode) {
		let {activeMode, callback, kmColumns, modes} = this.props,
			activeEvents = modes[activeMode].events,
			newEvents = modes[newMode].events,
			id = (newMode === 'kmPlot') ? _.last(_.keys(kmColumns)) : null;

		if (newMode !== activeMode) {
			let args = (newEvents ? [newEvents.open] : [newMode]).concat(id ? [id] : []);
			if (activeEvents) {
				callback([activeEvents.close]);
			}

			callback(args);
		}
	},
	//onRefresh: function () {
	//	var {callback} = this.props;
	//	callback(['refresh-cohorts']);
	//},
	onPdf: function () {
		pdf(this.props.appState);
	},
	//onSamplesSelect: function (value) {
	//	this.props.callback(['samplesFrom', value]);
	//},
	onCohortSelect: function (value) {
		this.props.callback(['cohort', value]);
	},
	//componentWillReceiveProps: function(newProps) {
	//	if (newProps.appState.mode !== this.props.appState.mode) {
	//		this.setState({
	//			modeButtons: modeButtons.map(modeBtn =>
	//				makeModeBtn(modeBtn, newProps.appState.mode, this.onMode))
	//		});
	//	}
	//},
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
			<div className="row container-fluid">
				<div className="col-md-3 row">
					<CohortSelect onSelect={this.onCohortSelect} cohort={cohort} cohorts={cohorts}/>
				</div>
				{hasCohort ?
				<div className="col-md-1">
					<ButtonToolbar>
						<Button bsStyle="info" title='Add a column'
								onClick={() => onColumnEdit(true)}>
							<Glyphicon glyph="plus" /> Data
						</Button>
					</ButtonToolbar>
				</div> : null}
				{hasColumns ?
				<div className="col-md-8 row">
					<div className="col-md-2">
						<Button bsStyle="info" title='Filter columns'
								onClick={() => console.log("Filtering...")}>
							<Glyphicon glyph="filter" /> Filter
						</Button>
					</div>
					<div className="col-md-6 row">
						<ModeControls activeMode={activeMode} modes={modes}
							  disabledModes={disabledModes} onMode={this.onMode}/>
					</div>
					<div className="col-md-4 row">
						<ButtonGroup>
							<Button href='#' onClick={this.onPdf}>
								<Glyphicon glyph="cloud-download" /> Download
							</Button>
							<Button href='#' onClick={this.onPdf}>PDF</Button>
						</ButtonGroup>
					</div>
				</div> : null}
			</div>
		);
	}
});

module.exports = AppControls;
