/*eslint-env browser */
/*global require: false, console: false, module: false */

'use strict';

require('./base');
var _ = require('./underscore_ext');
const React = require('react');
const datapages = require('ucsc-xena-datapages/datapages');
const connector = require('./connector');
const createStore = require('./store');

var controls = {
	cohort: (state, cohort) => _.assoc(state, 'cohortPending', [{name: cohort}]),
};

var identity = x => x;
var controller = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, ...args)
};

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
