'use strict';
var _ = require('./underscore_ext');
var Rx = require('./rx.ext');

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
	rxEventsMixin: rxEventsMixin,
	deepPureRenderMixin: deepPureRenderMixin
};
