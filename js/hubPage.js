/*eslint-env browser */
/*global require: false, console: false, module: false */

'use strict';

require('./base');
var _ = require('./underscore_ext');
const React = require('react');
const hub = require('ucsc-xena-datapages/hub');
const connector = require('./connector');
const createStore = require('./store');

var controls = {
	servers: (state, servers) => _.assocIn(state, ['servers', 'pending'], servers),
};

var identity = x => x;
var controller = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, ...args)
};

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
