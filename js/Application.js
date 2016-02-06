/*global require: false, module: false */
'use strict';
var React = require('react');
var Grid = require('react-bootstrap/lib/Grid');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
var Spreadsheet = require('./spreadsheet');
var AppControls = require('./AppControls');
var KmPlot = require('./kmPlot');
import JSONTree from 'react-json-tree';
var meta = require('./meta');
var _ = require('./underscore_ext');
//var Perf = require('react/addons').addons.Perf;

module.exports = React.createClass({
	getInitialState() {
		return {
			debug: false
		};
	},
	onClick: function (ev) {
		if (ev[meta.key]) {
			this.setState({debug: !this.state.debug});
		}
	},
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
	render: function() {
		let {state, selector, ...otherProps} = this.props,
			{km, ...otherState} = selector(state);

		return (
			<Grid onClick={this.onClick}>
			{/*
				<Row>
					<Button onClick={this.onPerf}>Perf</Button>
				</Row>
			*/}
				<Row>
					<Col md={12}>
						<AppControls {...otherProps} appState={otherState} />
					</Col>
				</Row>
				<Spreadsheet {...otherProps} appState={otherState} />
				{_.getIn(km, ['id']) ? <KmPlot
						callback={this.props.callback}
						km={km}
						features={this.props.appState.features} /> : null}
				<Row>
					<Col md={12}>
						<JSONTree
							id='debug'
							style={{display: this.state.debug ? 'block' : 'none'}}
							data={this.props.appState} />
					</Col>
				</Row>
				<div className='chartRoot' style={{display: 'none'}} />
			</Grid>
		);
	}
});
