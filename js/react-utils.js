'use strict';
var _ = require('./underscore_ext');
var Rx = require('./rx');

// XXX Should also do a takeUntil componentWillUnmount, perhaps
// via rx-react.
var rxEventsMixin = {
	events: function (...args) {
		this.ev = this.ev || {};
		this.on = this.on || {};
		_.each(args, ev => {
			var sub = new Rx.Subject();
			this.ev[ev] = sub;
			this.on[ev] = sub.next.bind(sub);
		});
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
