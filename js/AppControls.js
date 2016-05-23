/*global require: false, module: false */

'use strict';

var React = require('react');
var CohortSelect = require('./views/CohortSelect');
var DatasetSelect = require('./views/DatasetSelect');
var Button = require('react-bootstrap/lib/Button');
var Tooltip = require('react-bootstrap/lib/Tooltip');
var OverlayTrigger = require('react-bootstrap/lib/OverlayTrigger');
var pdf = require('./pdfSpreadsheet');
var _ = require('./underscore_ext');
require('./AppControls.css');

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
		this.props.callback(['samplesFrom', 0 /* index into composite cohorts */, value]);
	},
	onCohortSelect: function (value) {
		this.props.callback(['cohort', 0 /* index into composite cohorts */, value]);
	},
	onResetSampleFilter: function () {
		this.props.callback(['sampleFilter', 0 /* index into composite cohorts */, null]);
	},
	render: function () {
		var {appState: {cohort: activeCohorts, cohorts, datasets, mode, columnOrder}} = this.props,
			cohort = _.getIn(activeCohorts, [0, 'name']),
			samplesFrom = _.getIn(activeCohorts, [0, 'samplesFrom']),
			sampleFilter = _.getIn(activeCohorts, [0, 'sampleFilter']),
			hasCohort = !!cohort,
			hasColumn = !!columnOrder.length,
			noshow = (mode !== "heatmap");

		const tooltip = <Tooltip id='reload-cohorts'>Reload cohorts from all hubs.</Tooltip>;
		return (
			<form className='form-inline'>
				<OverlayTrigger placement="top" overlay={tooltip}>
					<Button onClick={this.onRefresh} bsSize='sm' style={{marginRight: 5}}>
						<span className="glyphicon glyphicon-refresh" aria-hidden="true"/>
					</Button>
				</OverlayTrigger>
				<CohortSelect cohort={cohort} cohorts={cohorts} disable={noshow} onSelect={this.onCohortSelect}/>
				{' '}
				{hasCohort ?
					<div className='form-group' style={this.props.style}>
						<label> Samples in </label>
						{' '}
						<DatasetSelect
							disable={noshow}
							onSelect={this.onSamplesSelect}
							nullOpt="Any Datasets (i.e. show all samples)"
							style={{display: hasCohort ? 'inline' : 'none'}}
							datasets={datasets}
							cohort={cohort}
							value={samplesFrom} />
						{sampleFilter ?
							(<span>
								&#8745;
								<Button className='hoverStrike'
									onClick={this.onResetSampleFilter}>

									{sampleFilter.length} samples
								</Button>
							</span>) : null}
					</div> : null}
				{' '}
				{hasColumn ? <Button disabled={!hasColumn} onClick={this.onMode} bsStyle='primary'>{modeButton[mode]}</Button> : null}
				{' '}
				{(noshow || !hasColumn) ? null : <Button onClick={this.onPdf}>PDF</Button>}
			</form>
		);
	}
});

module.exports = AppControls;
