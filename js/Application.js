/*global require: false, module: false */
'use strict';
var React = require('react');
var Grid = require('react-bootstrap/lib/Grid');
var ColumnEdit = require('./ColumnEdit');
var Spreadsheet = require('./Spreadsheet');
var AppControls = require('./AppControls');
var KmPlot = require('./KmPlot');
var kmModel = require('./models/km');
var ChartView = require('./ChartView');
var _ = require('./underscore_ext');
//var Perf = require('react/addons').addons.Perf;

var views = {
	heatmap: {
		module: Spreadsheet,
		name: 'Spreadsheet',
		icon: 'th',
		events: null
	},
	chart: {
		module: ChartView,
		name: 'Chart Analysis',
		icon: 'stats',
		events: null
	},
	kmPlot: {
		module: KmPlot,
		name: 'KM Plot',
		icon: 'random',
		events: {
			open: 'km-open',
			close: 'km-close'
		}
	}
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

function supportsGeneAverage({dataType, fields: {length}}) {
	return ['geneProbesMatrix', 'geneMatrix'].indexOf(dataType) >= 0 && length === 1;
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
	getInitialState: function() {
		return ({
			openColumnEdit: false,
			kmColumns: this.getKmColumns()
		});
	},
	getKmColumns: function() {
		let {columns, features, km} = this.props.state;
		return _.omit(columns, col => disableKM(col, features, km)[0]);
	},
	fieldFormat: function (uuid) {
		var {columns, data} = this.props.state;
		return getFieldFormat(uuid, columns, data);
	},
	supportsGeneAverage(uuid) {
		var {columns} = this.props.state;
		return supportsGeneAverage(_.get(columns, uuid));
	},
	onColumnEdit: function(status) {
		this.setState({openColumnEdit: status});
	},
	render: function() {
		/*
			1. Find list of columns that are qualified to allow Km Plot
			2. Send filtered list down to both KmPlot and AppControls
		 */
		let {callback, state, selector, ...otherProps} = this.props,
			computedState = selector(state),
			{features, km, mode} = computedState,
			activeMode = _.get(km, 'id') ? 'kmPlot' : mode,
			{kmColumns, openColumnEdit} = this.state,
			viewMeta = views[activeMode],
			View = viewMeta.module;

		return (
			<Grid onClick={this.onClick}>
				<div className="row">
					<AppControls appState={computedState} activeMode={activeMode}
						kmColumns={kmColumns} onColumnEdit={this.onColumnEdit}
						callback={callback} modes={_.mapObject(views, v => _.omit(v, 'module'))}
						disabledModes={_.toArray(kmColumns).length < 1 ? ['kmPlot'] : []}/>
				</div>
				{openColumnEdit ?
					<ColumnEdit onHide={() => this.onColumnEdit(false)}
						appState={computedState} callback={callback}/>
					: null
				}
				{(viewMeta.name === 'KM Plot')
					? <View activeKm={km} kmColumns={kmColumns}
						callback={callback} features={features}/>
					: <View appState={computedState}
						supportsGeneAverage={this.supportsGeneAverage}
						callback={callback} fieldFormat={this.fieldFormat}/>}
				<div className='chartRoot' style={{display: 'none'}} />
				<div className="form-group text-right">
					<a href="#">I wish I could...</a>
				</div>
			</Grid>
		);
	}
});

module.exports = Application;
