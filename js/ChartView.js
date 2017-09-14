'use strict';

var React = require('react');
var _ = require('./underscore_ext');

// Styles
var compStyles = require('./ChartView.module.css');

var ChartView = React.createClass({
	shouldComponentUpdate: function () {
		return false;
	},
	componentDidMount: function () {
		this.chartRender(this.props);
	},
	componentWillReceiveProps(newProps) {
		// Updating this way is clumsy. Need to refactor chart view.
		if (!_.isEqual(_.omit(this.props.appState, 'chartState'),
				_.omit(newProps.appState, 'chartState'))) {
			this.chartRender(newProps);
		}
	},
	chartRender(props) {
		var {appState, callback} = props,
			{root} = this.refs;
		require.ensure(['./chart'], function () {
			var chart = require('./chart');
			root.innerHTML = '';
			chart(root, callback, {xena: JSON.stringify(appState)});
		});
	},
	render: function () {
		return <div ref='root' className={compStyles.ChartView}/>;
	}
});

module.exports = ChartView;
