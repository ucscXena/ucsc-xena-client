'use strict';

var React = require('react');

// Styles
var compStyles = require('./ChartView.module.css');

var ChartView = React.createClass({
	shouldComponentUpdate: function () {
		return false;
	},
	componentDidMount: function () {
		var {appState, callback} = this.props,
			{root} = this.refs;
		require.ensure(['./chart'], function () {
			var chart = require('./chart');
			chart(root, callback, {xena: JSON.stringify(appState)});
		});
	},
	render: function () {
		return <div ref='root' className={compStyles.ChartView}/>;
	}
});

module.exports = ChartView;
