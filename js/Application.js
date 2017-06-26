'use strict';
var React = require('react');
var Grid = require('react-bootstrap/lib/Grid');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
var AppControls = require('./AppControls');
var KmPlot = require('./KmPlot');
var _ = require('./underscore_ext');
var {signatureField} = require('./models/fieldSpec');
var {getColSpec} = require('./models/datasetJoins');
var SampleSearch = require('./views/SampleSearch');
var uuid = require('./uuid');
//var Perf = require('react/lib/ReactDefaultPerf');

// should really be in a config file.
var searchHelp = 'http://xena.ghost.io/highlight-filter-help/';

var Application = React.createClass({
//	onPerf() {
//		if (this.perf) {
//			this.perf = false;
//			console.log('stop perf');
//			Perf.stop();
//			var m = Perf.getLastMeasurements();
//			console.log('inclusive');
//			Perf.printInclusive(m);
//			console.log('exclusive');
//			Perf.printExclusive(m);
//			console.log('wasted');
//			Perf.printWasted(m);
//		} else {
//			this.perf = true;
//			console.log('start perf');
//			Perf.start();
//		}
//	},
	onFilter: function (matches) {
		var {callback, state: {cohortSamples}} = this.props,
			allSamples = _.flatten(cohortSamples),
			matching = _.map(matches, i => allSamples[i]);
		callback(['sampleFilter', 0 /* cohort */, matching]);
	},
	onFilterZoom: function (samples, matches) {
		var {state: {zoom: {height}}, callback} = this.props,
			toOrder = _.object(samples, _.range(samples.length)),
			index = toOrder[_.min(matches, s => toOrder[s])],
			last = toOrder[_.max(matches, s => toOrder[s])];
		callback(['zoom', {index, height, count: last - index + 1}]);
	},
	onFilterColumn: function (matches, columnLabel, fieldLabel) {
		var {state: {datasets, cohortSamples, sampleSearch}, callback} = this.props,
			allSamples = _.flatten(cohortSamples),
			matching = _.map(matches, i => allSamples[i]),
			field = signatureField(`${fieldLabel ? fieldLabel : sampleSearch}`, {
				columnLabel: columnLabel ? columnLabel : 'filter',
				valueType: 'coded',
				filter: sampleSearch,
				signature: ['in', matching]
			}),
			colSpec = getColSpec([field], datasets),
			settings = _.assoc(colSpec,
					'width', 100,
					'user', _.pick(colSpec, ['columnLabel', 'fieldLabel']));
		callback(['add-column', uuid(), settings, true]);
		sampleSearch = '';
	},
	onSearchIDAndFilterColumn: function (qsamplesList) {
		var {state: {samples, cohortSamples}} = this.props,
			qsampleListObj = {},
			cohortSamplesList = [];

		_.map(qsamplesList, (s, i)=>{
			qsampleListObj[s] = i + 1;
		});
		cohortSamplesList = _.flatten(_.map(Object.keys(cohortSamples), i => cohortSamples[i]));

		var matches = _.filter(samples, s => qsampleListObj[cohortSamplesList[s]]),
			fieldLabel = matches.length + ' matches';
		this.onFilterColumn(matches, 'sample list', fieldLabel);
	},
	render: function() {
		let {state, children, onHighlightChange, ...otherProps} = this.props,
			{samplesMatched, sampleSearch, samples, cohortSamples, mode} = state,
			matches = _.get(samplesMatched, 'length', samples.length),
			// Can these closures be eliminated, now that the selector is above this
			// component?
			onFilter = (matches < samples.length && matches > 0) ?
				() => this.onFilter(samplesMatched) : null,
			onFilterColumn = (matches < samples.length && matches > 0) ?
				() => this.onFilterColumn(samplesMatched) : null,
			onFilterZoom = (matches < samples.length && matches > 0) ?
				() => this.onFilterZoom(samples, samplesMatched) : null,
			onSearchIDAndFilterColumn = this.onSearchIDAndFilterColumn;

		return (
			<Grid onClick={this.onClick}>
			{/*
				<Row>
					<button onClick={this.onPerf}>Perf</button>
				</Row>
			*/}
				<Row>
					<Col md={12}>
						<AppControls {...otherProps} appState={state} />
					</Col>
				</Row>
				<Row>
					<Col md={8}>
						<SampleSearch
							help={searchHelp}
							value={sampleSearch}
							matches={matches}
							onFilter={onFilter}
							onZoom={onFilterZoom}
							onCreateColumn={onFilterColumn}
							onSearchIDAndFilterColumn={onSearchIDAndFilterColumn}
							onChange={onHighlightChange}
							cohortSamples={cohortSamples}
							mode={mode}/>
					</Col>
				</Row>
				{children}
				{_.getIn(state, ['km', 'id']) ? <KmPlot
						callback={this.props.callback}
						km={state.km}
						features={state.features} /> : null}
			</Grid>
		);
	}
});

module.exports = Application;
