/*eslint-env browser */
/*global require: false, console: false, module: false */

'use strict';

require('base');
const React = require('react');
const hub = require('ucsc-xena-datapages/hub');
const controller = require('ucsc-xena-datapages/controller');
const connector = require('./connector');
const createStore = require('./store');

var Hub = React.createClass({
	shouldComponentUpdated: () => false,
	componentDidMount: function () {
		hub(this.refs.hubPage);
	},
	render: () => <div ref='hubPage'/>
});

var store = createStore();
var main = window.document.getElementById('main');

var selector = state => state;

connector({...store, controller, main, selector, Page: Hub});
