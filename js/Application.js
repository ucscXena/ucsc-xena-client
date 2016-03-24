/*global require: false, module: false */
'use strict';
var React = require('react');
var Grid = require('react-bootstrap/lib/Grid');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
var Spreadsheet = require('./Spreadsheet');
var AppControls = require('./AppControls');
var KmPlot = require('./KmPlot');
var kmModel = require('./models/km');
var ChartView = require('./ChartView');
var _ = require('./underscore_ext');
//var Perf = require('react/addons').addons.Perf;

var views = {
	heatmap: Spreadsheet,
	chart: ChartView
};

// This seems odd. Surely there's a better test?
function hasSurvival(survival) {
	return !! (_.get(survival, 'ev') &&
			   _.get(survival, 'tte') &&
			   _.get(survival, 'patient'));
}

// For geneProbesMatrix we will average across probes to compute KM. For
// other types, we can't support multiple fields.
function disableKM(column, features, km) {
	var survival = kmModel.pickSurvivalVars(features, km);
	if (!hasSurvival(survival)) {
		return [true, 'No survival data for cohort'];
	}
	if (column.fields.length > 1) {
		return [true, 'Unsupported for multiple genes/ids'];
	}
	return [false, ''];
}

function getFieldFormat(uuid, columns, data) {
	var columnFields = _.getIn(columns, [uuid, 'fields']),
		label = _.getIn(columns, [uuid, 'fieldLabel', 'default']),
		fields = _.getIn(data, [uuid, 'req', 'probes'], columnFields);
	if (fields.length === 1) {                           // 1 gene/probe, or 1 probe in gene: use default field label
		return () => label;
	} else if (fields.length === columnFields.length) {  // n > 1 genes/probes
		return _.identity;
	} else {                                             // n > 1 probes in gene
		return field => `${label} (${field})`
	}
}

var Application = React.createClass({
//	onPerf: function () {
//		this.perf = !this.perf;
//		if (this.perf) {
//			console.log("Starting perf");
//			Perf.start();
//		} else {
//			console.log("Stopping perf");
//			Perf.stop();
//			Perf.printInclusive();
//			Perf.printExclusive();
//			Perf.printWasted();
//		}
//	},
	fieldFormat: function (uuid) {
		var {columns, data} = this.props.state;
		return getFieldFormat(uuid, columns, data);
	},
	disableKM: function (uuid) {
		var {columns, features, km} = this.props.state;
		return disableKM(_.get(columns, uuid), features, km);
	},
	render: function() {
		let {state, selector, ...otherProps} = this.props,
			computedState = selector(state),
			{mode} = computedState,
			View = views[mode];

		return (
			<Grid onClick={this.onClick}>
			{/*
				<Row>
					<Button onClick={this.onPerf}>Perf</Button>
				</Row>
			*/}
				<Row>
					<Col md={12}>
						<AppControls {...otherProps} appState={computedState} />
					</Col>
				</Row>
				<View {...otherProps} fieldFormat={this.fieldFormat} disableKM={this.disableKM} appState={computedState} />
				{_.getIn(computedState, ['km', 'id']) ? <KmPlot
						callback={this.props.callback}
						km={computedState.km}
						features={computedState.features} /> : null}
				<div className='chartRoot' style={{display: 'none'}} />
			</Grid>
		);
	}
});

module.exports = Application;
