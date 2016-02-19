/*global module: false, require: false */
'use strict';

var React = require('react');
var chart = require('./chart');
require('../css/chart.css');

var ChartView = React.createClass({
	shouldComponentUpdate: function () {
		return false;
	},
	componentDidMount: function () {
		var {appState, callback} = this.props;
		chart(this.refs.root, callback, {xena: JSON.stringify(appState)});
	},
	render: function () {
		return <div ref='root'/>;
	}
});

module.exports = ChartView;
