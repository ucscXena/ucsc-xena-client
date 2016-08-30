'use strict';

require('./base');
var controller = require('ucsc-xena-datapages/controller');
const React = require('react');
const hub = require('ucsc-xena-datapages/hub');
const connector = require('./connector');
const createStore = require('./store');

var Hub = React.createClass({
	shouldComponentUpdate: () => false,
	componentDidMount: function () {
		var {state, selector} = this.props;
		hub(this.refs.hubPage, selector(state));
	},
	componentWillReceiveProps: function (newProps) {
		var {state, selector} = newProps;
		hub(this.refs.hubPage, selector(state));
	},
	render: () => <div ref='hubPage'/>
});

var store = createStore(true);
var main = window.document.getElementById('main');

var selector = state => state.servers;

connector({...store, controller, main, selector, Page: Hub, persist: true, history: false});
