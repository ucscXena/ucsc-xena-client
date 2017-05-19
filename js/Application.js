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
import { Button as RTBButton } from 'react-toolbox/lib/button';
require('./foo.css');
var hello = require('./foo.mcss');
console.log({hello});

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
	onFilterColumn: function (matches) {
		var {state: {datasets, cohortSamples, sampleSearch}, callback} = this.props,
			allSamples = _.flatten(cohortSamples),
			matching = _.map(matches, i => allSamples[i]),
			field = signatureField(`${sampleSearch}`, {
				columnLabel: 'filter',
				valueType: 'coded',
				filter: sampleSearch,
				signature: ['in', matching]
			}),
			colSpec = getColSpec([field], datasets),
			settings = _.assoc(colSpec,
					'width', 100,
					'user', _.pick(colSpec, ['columnLabel', 'fieldLabel']));
		callback(['add-column', uuid(), settings, true]);
	},
	render: function() {
		let {state, children, onHighlightChange, ...otherProps} = this.props,
			{samplesMatched, sampleSearch, samples, mode} = state,
			matches = _.get(samplesMatched, 'length', samples.length),
			// Can these closures be eliminated, now that the selector is above this
			// component?
			onFilter = (matches < samples.length && matches > 0) ?
				() => this.onFilter(samplesMatched) : null,
			onFilterColumn = (matches < samples.length && matches > 0) ?
				() => this.onFilterColumn(samplesMatched) : null,
			onFilterZoom = (matches < samples.length && matches > 0) ?
				() => this.onFilterZoom(samples, samplesMatched) : null;

		return (
			<Grid onClick={this.onClick}>
			{/*
				<Row>
					<button onClick={this.onPerf}>Perf</button>
				</Row>
			*/}
				<RTBButton className='hello' theme={hello} label="Hello"/>
				<RTBButton label="World"/>
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
							onChange={onHighlightChange}
							mode={mode}/>
					</Col>
				</Row>
				{children}
				{_.getIn(state, ['km', 'id']) ? <KmPlot
						callback={this.props.callback}
						km={state.km}
						features={state.features} /> : null}
				<div className='chartRoot' style={{display: 'none'}} />
			</Grid>
		);
	}
});

module.exports = Application;
