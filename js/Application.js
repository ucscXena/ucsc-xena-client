/*global require: false, module: false */
'use strict';
var React = require('react');
var Grid = require('react-bootstrap/lib/Grid');
var ColumnAdd = require('./ColumnEdit');
var ColumnFilter = require('./ColumnFilter');
var Spreadsheet = require('./Spreadsheet');
var AppControls = require('./AppControls');
var KmPlot = require('./KmPlot');
var kmModel = require('./models/km');
var ChartView = require('./ChartView');
var _ = require('./underscore_ext');

var views = {
	heatmap: {
		module: Spreadsheet,
		name: 'Visual Spreadsheet',
		events: null
	},
	chart: {
		module: ChartView,
		name: 'Chart Analysis',
		events: null
	},
	kmPlot: {
		module: KmPlot,
		name: 'KM Plot',
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

function getKmColumns(state) {
	var {columns, features, km} = state;
	return _.omit(columns, col => disableKM(col, features, km)[0]);
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
	getInitialState: function() {
		return ({
			column: {
				add: false,
				filter: false
			},
			kmColumns: getKmColumns(this.props.state)
		});
	},
	componentWillReceiveProps: function(newProps) {
		if (!_.isEqual(newProps.state.columns, this.props.state.columns)){
			this.setState({kmColumns: getKmColumns(newProps.state)});
		}
	},
	fieldFormat: function (uuid) {
		var {columns, data} = this.props.state;
		return getFieldFormat(uuid, columns, data);
	},
	supportsGeneAverage(uuid) {
		var {columns} = this.props.state;
		return supportsGeneAverage(_.get(columns, uuid));
	},
	onColumnAction: function(context, status) {
		this.setState(_.assocIn(this.state, ['column', context], status));
	},
	render: function() {
		/*
			1. Find list of columns that are qualified to allow Km Plot
			2. Send filtered list down to both KmPlot and AppControls
		 */
		var {callback, state, selector} = this.props,
			computedState = selector(state),
			{features, km, mode} = computedState,
			activeMode = _.get(km, 'id') ? 'kmPlot' : mode,
			{kmColumns, column: {add, filter}} = this.state,
			viewMeta = views[activeMode],
			View = viewMeta.module;

		return (
			<Grid onClick={this.onClick}>
				<AppControls appState={computedState} activeMode={activeMode}
					kmColumns={kmColumns} onAction={(context) => this.onColumnAction(context, true)}
					callback={callback} modes={_.mapObject(views, v => _.omit(v, 'module'))}/>
				<hr />
				{add ?
					<ColumnAdd appState={computedState} callback={callback}
						onHide={() => this.onColumnAction('add', false)}/>
					: null
				}
				{filter ?
					<ColumnFilter appState={computedState} callback={callback}
						   onHide={() => this.onColumnAction('filter', false)}/>
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
