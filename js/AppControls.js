/*global require: false, module: false */

'use strict';

var React = require('react');
var CohortSelect = require('./views/CohortSelect');
var {ButtonToolbar, ButtonGroup, Button, Glyphicon} = require('react-bootstrap/lib');
var Tooltip = require('react-bootstrap/lib/Tooltip');
var pdf = require('./pdfSpreadsheet');
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

var modeButtons = [
	{id: 'heatmap', name: 'Spreadsheet', icon: 'th'},
	{id: 'chart', name: 'Chart Analysis', icon: 'stats'},
	{id: 'kmPlot', name: 'KM Plot', icon: 'random'}
];

var makeModeBtn = (modeMeta, activeMode, onMode) => {
	let isActive = modeMeta.id === activeMode;
	return (
		<Button key={modeMeta.id} bsStyle={isActive ? "default" : 'success'}
			disabled={isActive} onClick={() => onMode(modeMeta.id)}>
			{!isActive ? <Glyphicon glyph={modeMeta.icon} /> : ''} {modeMeta.name}
		</Button>
	);
}

// XXX drop this.props.style? Not sure it's used.
var AppControls = React.createClass({
	getInitialState: function() {
		let {mode} = this.props.appState;
		return {
			modeButtons: modeButtons.map(modeBtn => makeModeBtn(modeBtn, mode, this.onMode))
		};
	},
	onMode: function (newMode) {
		this.props.callback([newMode]);
	},
	onRefresh: function () {
		var {callback} = this.props;
		callback(['refresh-cohorts']);
	},
	onPdf: function () {
		pdf(this.props.appState);
	},
	onSamplesSelect: function (value) {
			this.props.callback(['samplesFrom', value]);
	},
	onCohortSelect: function (value) {
			this.props.callback(['cohort', value]);
	},
	componentWillReceiveProps: function(newProps) {
		if (newProps.appState.mode !== this.props.appState.mode) {
			this.setState({
				modeButtons: modeButtons.map(modeBtn =>
					makeModeBtn(modeBtn, newProps.appState.mode, this.onMode))
			});
		}
	},
	render: function () {
		let {appState: {cohort, cohorts, columnOrder, mode}, onColumnEdit} = this.props,
			{modeButtons} = this.state,
			hasCohort = !!cohort,
			hasColumns = cohort && (columnOrder.length > 0),
			disableMenus = (mode === modeEvent.heatmap);
		const tooltip = <Tooltip id='reload-cohorts'>Reload cohorts from all hubs.</Tooltip>;
		return (
			<div className="row container-fluid">
				<div className="col-md-4 row">
					<CohortSelect onSelect={this.onCohortSelect} cohort={cohort} cohorts={cohorts} disable={disableMenus}/>
				</div>
				{hasCohort ?
				<div className="col-md-2">
					<ButtonToolbar>
						<Button bsStyle="info" title='Add a column'
								onClick={() => onColumnEdit(true)}>
							<Glyphicon glyph="plus" /> Data
						</Button>
						{hasColumns ?
						<Button bsStyle="info" title='Filter columns'
							onClick={() => console.log("Filtering...")}>
							<Glyphicon glyph="filter" /> Filter
						</Button> : null}
					</ButtonToolbar>
				</div> : null}
				{hasColumns ?
				<div className="col-md-4 row">
					<ButtonGroup>{modeButtons}</ButtonGroup>
				</div> : <div className="col-md-offset-6" />}
				{hasColumns ?
				<div className="col-md-2 row">
					<ButtonGroup>
						<Button href='#' onClick={this.onPdf}>
							<Glyphicon glyph="cloud-download" /> Download
						</Button>
						<Button href='#' onClick={this.onPdf}>PDF</Button>
					</ButtonGroup>
				</div> : <div className="col-md-offset-6" />}
			</div>
		);
	}
});

module.exports = AppControls;
