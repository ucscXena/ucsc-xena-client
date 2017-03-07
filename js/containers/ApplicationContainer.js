'use strict';

// XXX move Application to views
var Application = require('../Application');
var React = require('react');
//var _ = require('../underscore_ext');
var {getSpreadsheetContainer} = require('./SpreadsheetContainer');
var ChartView = require('../ChartView');
var Column = require('../views/Column');
var _ = require('../underscore_ext');
var kmModel = require('../models/km');
var {lookupSample} = require('../models/sample');
var {xenaFieldPaths} = require('../models/fieldSpec');
var {rxEventsMixin} = require('../react-utils');
var Rx = require('../rx');
// Spreadsheet options
var addTooltip = require('../views/addTooltip');
var disableSelect = require('../views/disableSelect');
var addColumnAddButton = require('../views/addColumnAddButton');
var addVizEditor = require('../views/addVizEditor');
var makeSortable = require('../views/makeSortable');
var getSpreadsheet = require('../Spreadsheet');

// This seems odd. Surely there's a better test?
function hasSurvival(survival) {
	return !! (_.get(survival, 'ev') &&
			   _.get(survival, 'tte') &&
			   _.get(survival, 'patient'));
}

// For geneProbes we will average across probes to compute KM. For
// other types, we can't support multiple fields.
// XXX maybe put in a selector.
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

// We check the field length here, before overlaying a probe list from the
// server, and sending to the Application view. XXX Maybe put the result in a selector,
// to avoid passing it far down the component stack.
function supportsGeneAverage({fieldType, fields: {length}}) {
	return ['geneProbes', 'genes'].indexOf(fieldType) >= 0 && length === 1;
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

var getLabel = _.curry((datasets, dsID) => {
	var ds = datasets[dsID];
	return ds.label || ds.name;
});

function datasetMeta(column, datasets) {
	return {
		dsIDs: _.map(xenaFieldPaths(column), p => _.getIn(column, [...p, 'dsID'])),
		label: getLabel(datasets)
	};
}

var columnsWrapper = c => addTooltip(makeSortable(disableSelect(addColumnAddButton(addVizEditor(c)))));
var Spreadsheet = getSpreadsheet(columnsWrapper);
// XXX without tooltip, we have no mouse pointer. Should make the wrapper add the css
// that hides the mouse. Currently this is in Column.
//var columnsWrapper = c => makeSortable(disableSelect(c));
var SpreadsheetContainer = getSpreadsheetContainer(Column, Spreadsheet);


var ApplicationContainer = React.createClass({
	mixins: [rxEventsMixin],
	onSearch: function (value) {
		var {callback} = this.props;
		callback(['sample-search', value]);
	},
	componentWillMount: function () {
		this.events('highlightChange');
		this.change = this.ev.highlightChange
			.debounceTime(200)
			.subscribe(this.onSearch);
		// high on 1st change, low after some delay
		this.highlight = this.ev.highlightChange
			.switchMap(() => Rx.Observable.of(true).concat(Rx.Observable.of(false).delay(300)))
			.distinctUntilChanged(_.isEqual);
	},
	componentWillUnmount: function () {
		this.change.unsubscribe();
		this.highlight.unsubscribe();
	},
	supportsGeneAverage(uuid) { // XXX could be precomputed in a selector
		var {columns} = this.props.state;
		return supportsGeneAverage(_.get(columns, uuid));
	},
	disableKM(uuid) { // XXX could be precomputed in a selector
		var {columns, features, km} = this.props.state;
		return disableKM(_.get(columns, uuid), features, km);
	},
	fieldFormat: function (uuid) {
		var {columns, data} = this.props.state;
		return getFieldFormat(uuid, columns, data);
	},
	sampleFormat: function (index) {
		var {cohortSamples} = this.props.state;
		return lookupSample(cohortSamples, index);
	},
	datasetMeta: function (uuid) {
		var {columns, datasets} = this.props.state;
		return datasetMeta(_.get(columns, uuid), datasets);
	},
	// raw (before selector) state
	getState: function () {
		return this.props.state;
	},
	// XXX Change state to appState in Application, for consistency.
	render() {
		let {state, selector, callback} = this.props,
			computedState = selector(state),
			{mode} = computedState,
			View = {
				heatmap: SpreadsheetContainer,
				chart: ChartView
			}[mode];
		return (
			<Application
					Spreadsheet={SpreadsheetContainer}
					onHighlightChange={this.on.highlightChange}
					sampleFormat={this.sampleFormat}
					getState={this.getState}
					state={computedState}
					callback={callback}>
				<View
					searching={this.highlight}
					supportsGeneAverage={this.supportsGeneAverage}
					disableKM={this.disableKM}
					fieldFormat={this.fieldFormat}
					sampleFormat={this.sampleFormat}
					datasetMeta={this.datasetMeta}
					appState={computedState}
					callback={callback}/>
			</Application>);
	}
});

module.exports = ApplicationContainer;
