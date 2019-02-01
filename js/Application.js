'use strict';
import React, { Component } from 'react';
import { Grid, Row, Col } from "react-material-responsive-grid";
import { AppControls } from './AppControls';
import { KmPlot } from './KmPlot';
import StateError from'./StateError';
import _  from './underscore_ext';
import { Stepper } from './views/Stepper';
import Welcome from './containers/WelcomeContainer';
import '../css/index.css'; // Root styles file (reset, fonts, globals)
import { ThemeProvider } from 'react-css-themr';
import appTheme from './appTheme';
import nav from './nav';
//var Perf = require('react/lib/ReactDefaultPerf');

const stepperSteps = [
	{ label: 'Select a Study to Explore' },
	{ label: 'Select Your First Variable' },
	{ label: 'Select Your Second Variable' }
];
const stepperStateIndex = {
	'COHORT': 0,
	'FIRST_COLUMN': 1,
	'SECOND_COLUMN': 2
};

// should really be in a config file.
const searchHelp = 'https://ucsc-xena.gitbook.io/project/overview-of-features/filter-and-subgrouping';

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
	onHideError = () => {
		this.props.callback(['stateError', undefined]);
	};
	onShowWelcome = () => {
		this.props.onShowWelcome(true);
	}
	onHideWelcome = () => {
		this.props.onShowWelcome(false);
	}
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
		let {state, stateError, children, stepperState, loadPending, ...otherProps} = this.props,
			{callback} = otherProps,
			{wizardMode, showWelcome, zoom} = state;
//			onSearchIDAndFilterColumn = this.onSearchIDAndFilterColumn;

		if (loadPending) {
			return <p style={{margin: 10}}>Loading your view...</p>;
		}

		return (
			<div>
				<div style={{position: 'relative'}}> {/* Necessary for containing KmPlot pop-up */}
					{showWelcome ? <Welcome onClick={this.onHideWelcome} /> :
						null}
					{wizardMode ? <Stepper mode={stepperState} steps={stepperSteps} stateIndex={stepperStateIndex}/> :
						<AppControls {...otherProps} appState={state} help={searchHelp}
									 zoom={zoom} onShowWelcome={this.onShowWelcome}/>}

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
							km={state.km}
							cohort={state.cohort.name} /> : null}
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
