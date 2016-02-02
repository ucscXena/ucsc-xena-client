/*global require: false, module: false */
'use strict';
var _ = require('underscore_ext');
var L = require('./lenses/lens');
var Rx = require('rx.ext');

function propsStream(comp) {
	var methods = {
		render: function () {
			this.propsStream.onNext(L.view(this.props.lens));
			return comp.render.call(this);
		},
		componentWillMount: function () {
			this.propsStream = new Rx.Subject();
			comp.componentWillMount.call(this);
		},
		componentWillUnMount: function () {
			this.propsStream.onCompleted();
			comp.componentWillUnMount.call(this);
		}
	};
	return _.extend({}, comp, methods);
}

function statePropsStream(comp) {
	var methods = {
		render: function () {
			this.statePropsStream.onNext([this.state, L.view(this.props.lens)]);
			return comp.render.call(this);
		},
		componentWillMount: function () {
			this.statePropsStream = new Rx.Subject();
			comp.componentWillMount.call(this);
		},
		componentWillUnMount: function () {
			this.statePropsStream.onCompleted();
			comp.componentWillUnMount.call(this);
		}
	};
	return _.extend({}, comp, methods);
}

// adapted from rx-react
function funcSubject() {
	function subject(value) {
		subject.onNext(value);
	}
	_.extend(subject, Rx.Subject.prototype);
	Rx.Subject.call(subject);
	return subject;
}

// XXX Should also do a takeUntil componentWillUnmount, perhaps
// via rx-react.
var rxEventsMixin = {
	events: function (...args) {
		this.ev = this.ev || {};
		_.each(args, ev => this.ev[ev] = funcSubject());
	}
};

var deepPureRenderMixin = {
	shouldComponentUpdate: function (nextProps, nextState) {
		return !_.isEqual(nextProps, this.props) ||
			!_.isEqual(nextState, this.state);
	}
};

module.exports = {
	propsStream: propsStream,
	statePropsStream: statePropsStream,
	rxEventsMixin: rxEventsMixin,
	deepPureRenderMixin: deepPureRenderMixin
};
