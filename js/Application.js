import React from 'react';
import PureComponent from './PureComponent';
import { Grid, Row, Col } from "react-material-responsive-grid";
import { AppControls } from './AppControls';
import { KmPlot } from './KmPlot';
import SheetControls from './SheetControls';
import {StateError} from'./StateError';
import * as _ from './underscore_ext.js';
import Welcome from './containers/WelcomeContainer';
import nav from './nav';
import gaEvents from './gaEvents.js';
//var Perf = require('react-dom/lib/ReactPerf');

function clearZoom(samples, zoom) {
	return _.merge(zoom, {count: samples, index: 0});
}

function zoomOut(samples, zoom) {
	var {count, index} = zoom;
	var nCount = Math.min(samples, Math.round(count * 3)),
		maxIndex = samples - nCount,
		nIndex = Math.max(0, Math.min(Math.round(index + (count - nCount) / 2), maxIndex));

	return _.merge(zoom, {count: nCount, index: nIndex});
}

class Application extends PureComponent {
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
	componentDidMount() {
		const { getState, onImport, onNavigate, state: { isPublic } } = this.props;

		// nested render to different DOM tree
		nav({isPublic, getState, onImport, onNavigate, activeLink: 'heatmap'});
	}
	componentDidUpdate() {
		const { getState, onImport, onNavigate, state: { isPublic } } = this.props;

		// nested render to different DOM tree
		nav({isPublic, getState, onImport, onNavigate, activeLink: 'heatmap'});
	}
	onClearZoom = () => {
		const {state: {samples, zoom}} = this.props;
		gaEvents('spreadsheet', 'zoom', 'clear');
		this.props.callback(['zoom', clearZoom(samples.length, zoom)]);
	};
	onHideError = () => {
		this.props.callback(['stateError', undefined]);
	};
	onShowWelcome = () => {
		this.props.onShowWelcome(true);
	};
	onHideWelcome = () => {
		this.props.onShowWelcome(false);
	};
	onZoomOut = () => {
		const {state: {samples, zoom}} = this.props;
		gaEvents('spreadsheet', 'zoom', 'out');
		this.props.callback(['zoom', zoomOut(samples.length, zoom)]);
		this.props.callback(['enableTransition', false]);
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
		let {state, stateError, children, loadPending, ...otherProps} = this.props,
			{callback} = otherProps,
			{editing, wizardMode, showWelcome, zoom} = state;
//			onSearchIDAndFilterColumn = this.onSearchIDAndFilterColumn;

		if (loadPending) {
			return <p style={{margin: 10}}>Loading your view...</p>;
		}

		return (
			<div>
				<div style={{position: 'relative'}}> {/* Necessary for containing KmPlot pop-up */}
					{showWelcome ? <Welcome onClick={this.onHideWelcome} /> : null}
					{wizardMode ? null :
						<div>
							<AppControls {...otherProps} appState={state} zoom={zoom} onShowWelcome={this.onShowWelcome}/>
							<SheetControls actionsDisabled={true} appState={state} clearZoom={this.onClearZoom}
										   statusDisabled={editing !== null} zoom={zoom} zoomOut={this.onZoomOut}/>
						</div>}
					<Grid onClick={this.onClick}>
					{/*
						<Row>
							<button onClick={this.onPerf}>Perf</button>
						</Row>
					*/}
						<Row>
							<Col xs4={4} style={{position: 'relative'}}>
						{children}
							</Col>
						</Row>
					</Grid>
					{_.getIn(state, ['km', 'id']) ? <KmPlot
							callback={callback}
							survivalKeys={_.keys(state.survival)}
							km={state.km}
							cohort={state.cohort.name} /> : null}
					<StateError onHide={this.onHideError} error={stateError}/>
				</div>
			</div>
		);
	}
}

export default Application;
