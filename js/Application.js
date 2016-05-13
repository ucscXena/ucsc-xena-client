/*global require: false, module: false, window: false */
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
var {lookupSample} = require('./models/sample');
var xenaQuery = require('./xenaQuery');
var {xenaFieldPaths} = require('./models/fieldSpec');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var SampleSearch = require('./views/SampleSearch');
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

// For geneProbes we will average across probes to compute KM. For
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
		label = _.getIn(columns, [uuid, 'fieldLabel']),
		fields = _.getIn(data, [uuid, 'req', 'probes'], columnFields);
	if (fields.length === 1) {                           // 1 gene/probe, or 1 probe in gene: use default field label
		return () => label;
	} else if (fields.length === columnFields.length) {  // n > 1 genes/probes
		return _.identity;
	} else {                                             // n > 1 probes in gene
		return field => `${label} (${field})`;
	}
}

// This was moved out of plotDenseMatrix so that plotDenseMatrix doesn't know
// about fields vs. probes. We check the field length here, before overlaying
// a probe list from the server, and sending to the spreadsheet view.
function supportsGeneAverage({fieldType, fields: {length}}) {
	return ['geneProbes', 'genes'].indexOf(fieldType) >= 0 && length === 1;
}

function onAbout(dsID) {
	var [host, dataset] = xenaQuery.parse_host(dsID);
	var url = `../datapages/?dataset=${encodeURIComponent(dataset)}&host=${encodeURIComponent(host)}`;
	window.open(url);
}

var getLabel = _.curry((datasets, dsID) => {
	var ds = datasets[dsID];
	return ds.label || ds.name;
});

var getAbout = (dsID, text) => (
	<MenuItem key={dsID} onSelect={() => onAbout(dsID)}>{text} </MenuItem>);


function aboutDataset(column, datasets) {
	var dsIDs = _.map(xenaFieldPaths(column), p => _.getIn(column, [...p, 'dsID'])),
		label = getLabel(datasets);
	if (dsIDs.length === 1) {
		return getAbout(dsIDs[0], 'About the Dataset');
	}
	return [
		<MenuItem key='d0' divider/>,
		<MenuItem key='header' header>About the Datasets</MenuItem>,
		..._.map(dsIDs, dsID => getAbout(dsID, label(dsID))),
		<MenuItem key='d1' divider/>
	];
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
	supportsGeneAverage(uuid) {
		var {columns} = this.props.state;
		return supportsGeneAverage(_.get(columns, uuid));
	},
	sampleFormat: function (index) {
		var {cohortSamples} = this.props.state;
		return lookupSample(cohortSamples, index);
	},
	disableKM: function (uuid) {
		var {columns, features, km} = this.props.state;
		return disableKM(_.get(columns, uuid), features, km);
	},
	aboutDataset: function (uuid) {
		var {columns, datasets} = this.props.state;
		return aboutDataset(_.get(columns, uuid), datasets);
	},
	onSearch: function (ev) {
		var {callback} = this.props;
		callback(['sample-search', ev.target.value]);
	},
	render: function() {
		let {state, selector, ...otherProps} = this.props,
			computedState = selector(state),
			{mode, samplesMatched, sampleSearch, samples} = computedState,
			matches = _.get(samplesMatched, 'length', samples.length),
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
				<Row>
					<Col md={12}>
						<SampleSearch value={sampleSearch} matches={matches} onChange={this.onSearch}/>
					</Col>
				</Row>
				<View {...otherProps}
					aboutDataset={this.aboutDataset}
					sampleFormat={this.sampleFormat}
					fieldFormat={this.fieldFormat}
					supportsGeneAverage={this.supportsGeneAverage}
					disableKM={this.disableKM}
					appState={computedState} />
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
