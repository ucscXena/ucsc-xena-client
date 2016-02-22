/*global require: false, module: false */
'use strict';
var React = require('react');
var Grid = require('react-bootstrap/lib/Grid');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
var Spreadsheet = require('./Spreadsheet');
var AppControls = require('./AppControls');
var KmPlot = require('./KmPlot');
var _ = require('./underscore_ext');
//var Perf = require('react/addons').addons.Perf;

module.exports = React.createClass({
	timer: null,
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
		return {
			dims: {
				width: 860,
				height: 450
			}
		}
	},

	componentWillMount: function() {
		//this.timer = setInterval(() => {
		//	let dims = _.clone(this.state.dims);
		//	dims.width++;
		//	dims.height++;
		//	this.setState({dims: dims});
		//}, 1500);
	},

	componentWillUnmount: function() {
		//clearInterval(this.timer);
	},

	render: function() {
		let {state, selector, ...otherProps} = this.props,
			computedState = selector(state);

		return (
			<Grid onClick={this.onClick}>
			{/*
				<Row>
					<Button onClick={this.onPerf}>Perf</Button>
				</Row>
			*/}
				<Row>
					<Col md={12}>
						<AppControls {...otherProps} appState={computedState} />
					</Col>
				</Row>
				<Spreadsheet {...otherProps} appState={computedState} />
				{_.getIn(computedState, ['km', 'id']) ? <KmPlot
						dims={this.state.dims}
						callback={this.props.callback}
						km={computedState.km}
						features={computedState.features} /> : null}
				<div className='chartRoot' style={{display: 'none'}} />
			</Grid>
		);
	}
});
