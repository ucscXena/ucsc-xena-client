/*global module: false, require: false */
'use strict';

var React = require('react');

var ChartView = React.createClass({
	shouldComponentUpdate: function () {
		return false;
	},
	componentDidMount: function () {
		var {appState, callback} = this.props,
			{root} = this.refs;
		require.ensure(['./chart', '../css/chart.css'], function () {
			var chart = require('./chart');
			chart(root, callback, {xena: JSON.stringify(appState)});
		});
	},
	render: function () {
		return <div ref='root'/>;
	}
});

module.exports = ChartView;
