/*eslint-env browser */
/*global require: false, console: false, module: false */

'use strict';

require('base');
const React = require('react');
const datapages = require('ucsc-xena-datapages/datapages');
const controller = require('ucsc-xena-datapages/controller');
const connector = require('./connector');
const createStore = require('./store');

var Datapages = React.createClass({
	shouldComponentUpdated: () => false,
	componentDidMount: function () {
		datapages.start(this.refs.datapages);
	},
	render: () => <div ref='datapages'/>
});


var store = createStore();
var main = window.document.getElementById('main');

var selector = state => state;

connector({...store, controller, main, selector, Page: Datapages});
