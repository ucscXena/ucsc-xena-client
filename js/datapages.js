'use strict';

require('./base');
var controller = require('./controllers/hub');
const React = require('react');
const datapages = require('ucsc-xena-datapages/datapages');
const connector = require('./connector');
const createStore = require('./store');

var Datapages = React.createClass({
	shouldComponentUpdate: () => false,
	componentDidMount: function () {
		var {state, selector} = this.props;
		datapages(this.refs.datapages, selector(state));
	},
	componentWillReceiveProps: function (newProps) {
		var {state, selector} = newProps;
		datapages(this.refs.datapages, selector(state));
	},
	render: () => <div ref='datapages'/>
});

var store = createStore(true);
var main = window.document.getElementById('main');

var selector = state => state.servers;

connector({...store, controller, main, selector, Page: Datapages, persist: true, history: false});
