'use strict';
var React = require('react');
var {Grid, Row, Col} = require("react-material-responsive-grid");
var AppControls = require('./AppControls');
var KmPlot = require('./KmPlot');
var StateError = require('./StateError');
var _ = require('./underscore_ext');
var {signatureField} = require('./models/fieldSpec');
var {getColSpec} = require('./models/datasetJoins');
var SampleSearch = require('./views/SampleSearch');
var Stepper = require('./views/Stepper');
var Welcome = require('./containers/WelcomeContainer');
var uuid = require('./uuid');
import '../css/index.css'; // Root styles file (reset, fonts, globals)
import {ThemeProvider} from 'react-css-themr';
var appTheme = require('./appTheme');
var nav = require('./nav');
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
	componentDidUpdate() {
		var {getState, onImport, onNavigate, state: {isPublic}} = this.props;

		// nested render to different DOM tree
		nav({isPublic, getState, onImport, onNavigate, activeLink: 'heatmap'});
	},
	onFilter: function (matches) {
		var {callback, state: {cohortSamples}} = this.props,
			matching = _.map(matches, i => cohortSamples[i]);
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
		var {state: {cohortSamples, sampleSearch}, callback} = this.props,
			matching = _.map(matches, i => cohortSamples[i]),
			field = signatureField(`${fieldLabel ? fieldLabel : sampleSearch}`, {
				columnLabel: columnLabel ? columnLabel : 'filter',
				valueType: 'coded',
				filter: sampleSearch,
				signature: ['in', matching]
			}),
			colSpec = getColSpec([field], []),
			settings = _.assoc(colSpec,
					'width', 136,
					'user', _.pick(colSpec, ['columnLabel', 'fieldLabel']));
		callback(['add-column', 0, {id: uuid(), settings}]);
	},
	onHideError() {
		this.props.callback(['stateError', undefined]);
	},
//	onSearchIDAndFilterColumn: function (qsamplesList) {
//		var {state: {samples, cohortSamples}} = this.props,
//			qsampleListObj = {},
//			cohortSamplesList = [];
//
//		_.map(qsamplesList, (s, i)=>{
//			qsampleListObj[s] = i + 1;
//		});
//		cohortSamplesList = _.flatten(_.map(Object.keys(cohortSamples), i => cohortSamples[i]));
//
//		var matches = _.filter(samples, s => qsampleListObj[cohortSamplesList[s]]),
//			fieldLabel = matches.length + ((matches.length === 1) ? ' match' : ' matches');
//		this.onFilterColumn(matches, 'sample list', fieldLabel);
//	},
	render: function() {
		let {state, children, onHighlightChange, onShowWelcome, stepperState, loadPending, ...otherProps} = this.props,
			{callback, onResetSampleFilter} = otherProps,
			{cohort, stateError, samplesMatched, sampleSearch,
				samples, mode, wizardMode, showWelcome, zoom} = state,
			matches = _.get(samplesMatched, 'length', samples.length),
			// Can these closures be eliminated, now that the selector is above this
			// component?
			onFilter = (matches < samples.length && matches > 0) ?
				() => this.onFilter(samplesMatched) : null,
			onFilterColumn = (matches < samples.length && matches > 0) ?
				() => this.onFilterColumn(samplesMatched) : null,
			onFilterZoom = (matches < samples.length && matches > 0) ?
				() => this.onFilterZoom(samples, samplesMatched) : null;
//			onSearchIDAndFilterColumn = this.onSearchIDAndFilterColumn;

		if (loadPending) {
			return <p style={{margin: 10}}>Loading your view...</p>;
		}

		return (
			<div>
				<div style={{position: 'relative'}}> {/* Necessary for containing KmPlot pop-up */}
					{showWelcome ? <Welcome onClick={() => onShowWelcome(false)} /> :
						null}
					{wizardMode ? <Stepper mode={stepperState} /> :
						<AppControls {...otherProps} appState={state} help={searchHelp}
									 zoom={zoom} onShowWelcome={() => onShowWelcome(true)}>
							<SampleSearch
								value={sampleSearch}
								matches={matches}
								onFilter={onFilter}
								onZoom={onFilterZoom}
								onCreateColumn={onFilterColumn}
								onChange={onHighlightChange}
								mode={mode}
								onResetSampleFilter={onResetSampleFilter}
								cohort={cohort}
								callback={callback}/>
						</AppControls>
							}
					<Grid onClick={this.onClick}>
					{/*
						<Row>
							<button onClick={this.onPerf}>Perf</button>
						</Row>
					*/}
						<Row>
							<Col xs4={4}>
						{children}
							</Col>
						</Row>
					</Grid>
					{_.getIn(state, ['km', 'id']) ? <KmPlot
							callback={callback}
							km={state.km} /> : null}
					{stateError ? <StateError onHide={this.onHideError} error={stateError}/> : null}
				</div>
			</div>
		);
	}
});

var ThemedApplication = React.createClass({
	render() {
		return (
		<ThemeProvider theme={appTheme}>
			<Application {...this.props}/>
		</ThemeProvider>);
	}
});

module.exports = ThemedApplication;
