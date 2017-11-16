'use strict';

require('./base');
const React = require('react');
const datapages = require('ucsc-xena-datapages/datapages');
var xenaQuery = require('./xenaQuery');
var nav = require('./nav');


var Datapages = React.createClass({
	shouldComponentUpdate: () => false,
	onNavigate(page) {
		this.props.callback(['navigate', page]);
	},
	componentDidMount: function () {
		var {state, selector, callback} = this.props;
		this.destroy = datapages(this.refs.datapages, selector(state), callback, xenaQuery);
		nav({activeLink: 'datapages', onNavigate: this.onNavigate});
	},
	componentWillReceiveProps: function (newProps) {
		var {state, selector, callback} = newProps;
		datapages(this.refs.datapages, selector(state), callback, xenaQuery);
	},
	componentWillUnmount() {
		this.destroy();
	},
	render: () => <div className='datapages' ref='datapages'/>
});

var selector = state => state.spreadsheet.servers;

module.exports = props => <Datapages {...props} selector={selector}/>;
