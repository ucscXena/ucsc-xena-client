'use strict';
import React, { Component } from 'react';
import { Grid, Row, Col } from "react-material-responsive-grid";
import { AppControls } from './AppControls';
import { KmPlot } from './KmPlot';
import StateError from'./StateError';
import _  from './underscore_ext';
import { signatureField } from './models/fieldSpec';
import { getColSpec } from './models/datasetJoins';
import { SampleSearch } from './views/SampleSearch';
import { Stepper } from './views/Stepper';
import Welcome from './containers/WelcomeContainer';
import uuid from './uuid';
import '../css/index.css'; // Root styles file (reset, fonts, globals)
import { ThemeProvider } from 'react-css-themr';
import appTheme from './appTheme';
import nav from './nav';
//var Perf = require('react/lib/ReactDefaultPerf');

// should really be in a config file.
const searchHelp = 'http://xena.ghost.io/highlight-filter-help/';

class Application extends Component {
//	onPerf = () => {
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
//	}
	componentDidUpdate() {
		const { getState, onImport, onNavigate, state: { isPublic } } = this.props;

		// nested render to different DOM tree
		nav({isPublic, getState, onImport, onNavigate, activeLink: 'heatmap'});
	}
	onFilter= (matches) => {
		const {callback, state: {cohortSamples}} = this.props,
			matching = _.map(matches, i => cohortSamples[i]);
		callback(['sampleFilter', matching]);
	};
	onFilterZoom = (samples, matches) => {
		const { state: { zoom: { height } }, callback } = this.props,
			toOrder = _.object(samples, _.range(samples.length)),
			index = toOrder[_.min(matches, s => toOrder[s])],
			last = toOrder[_.max(matches, s => toOrder[s])];
		callback(['zoom', {index, height, count: last - index + 1}]);
	};
	onFilterColumn= ( matches, columnLabel, fieldLabel) => {
		const {state: {cohortSamples, sampleSearch}, callback} = this.props,
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
	};
	onHideError = () => {
		this.props.callback(['stateError', undefined]);
	};
//	onSearchIDAndFilterColumn = (qsamplesList) => {
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
//	};
	render() {
		let {state, stateError, children, onHighlightChange, onShowWelcome, stepperState, loadPending, ...otherProps} = this.props,
			{callback, onResetSampleFilter} = otherProps,
			{cohort, samplesMatched, sampleSearch,
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
							survivalKeys={_.keys(state.survival)}
							km={state.km} /> : null}
					{stateError ? <StateError onHide={this.onHideError} error={stateError}/> : null}
				</div>
			</div>
		);
	}
}

const ThemedApplication = (props) => {
	return (
		<ThemeProvider theme={appTheme}>
			<Application {...props}/>
		</ThemeProvider>);
};

module.exports = ThemedApplication;
