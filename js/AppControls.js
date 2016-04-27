/*global require: false, module: false */

'use strict';

var React = require('react');
var CohortSelect = require('./views/CohortSelect');
var DatasetSelect = require('./views/DatasetSelect');
var Button = require('react-bootstrap/lib/Button');
var Tooltip = require('react-bootstrap/lib/Tooltip');
var OverlayTrigger = require('react-bootstrap/lib/OverlayTrigger');
var pdf = require('./pdfSpreadsheet');

var modeButton = {
	chart: 'Visual Spreadsheet',
	heatmap: 'Chart'
};

var modeEvent = {
	chart: 'heatmap',
	heatmap: 'chart'
};

// XXX drop this.props.style? Not sure it's used.
var AppControls = React.createClass({
	onMode: function () {
		var {callback, appState: {mode}} = this.props;
		callback([modeEvent[mode]]);
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
	render: function () {
		var {appState: {cohort, cohorts, datasets, mode, samplesFrom}} = this.props,
			hasCohort = !!cohort,
			noshow = (mode !== "heatmap");

		const tooltip = <Tooltip id='reload-cohorts'>Reload cohorts from all hubs.</Tooltip>;
		return (
			<form className='form-inline'>
				<OverlayTrigger placement="top" overlay={tooltip}>
					<Button onClick={this.onRefresh} bsSize='sm' style={{marginRight: 5}}>
						<span className="glyphicon glyphicon-refresh" aria-hidden="true"/>
					</Button>
				</OverlayTrigger>
				{noshow ? null : <CohortSelect cohort={cohort} cohorts={cohorts}
					  onSelect={this.onCohortSelect}/>}
				{' '}
				{hasCohort && !noshow ?
					<div className='form-group' style={this.props.style}>
						<label> Samples in </label>
						{' '}
						<DatasetSelect
							onSelect={this.onSamplesSelect}
							nullOpt="Any Datasets (i.e. show all samples)"
							style={{display: hasCohort ? 'inline' : 'none'}}
							datasets={datasets}
							cohort={cohort}
							value={samplesFrom} />
					</div> : null}
				{' '}
				<Button onClick={this.onMode} bsStyle='primary'>{modeButton[mode]}</Button>
				{' '}
				{noshow ? null : <Button onClick={this.onPdf}>PDF</Button>}
			</form>
		);
	}
});

module.exports = AppControls;
