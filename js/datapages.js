'use strict';

require('./base');
var controller = require('./controllers/hub');
const React = require('react');
const datapages = require('ucsc-xena-datapages/datapages');
const connector = require('./connector');
const createStore = require('./store');
var xenaQuery = require('./xenaQuery');
var nav = require('./nav');

nav();

var Datapages = React.createClass({
	shouldComponentUpdate: () => false,
	componentDidMount: function () {
		var {state, selector, callback} = this.props;
		datapages(this.refs.datapages, selector(state), callback, xenaQuery);
	},
	componentWillReceiveProps: function (newProps) {
		var {state, selector, callback} = newProps;
		datapages(this.refs.datapages, selector(state), callback, xenaQuery);
	},
	render: () => <div ref='datapages'/>
});

var store = createStore();
var main = window.document.getElementById('main');

var selector = state => state.spreadsheet.servers;

connector({...store, controller, main, selector, Page: Datapages, persist: true, history: false});
