'use strict';
var _ = require('./underscore_ext');
var Rx = require('./rx');

// XXX Should also do a takeUntil componentWillUnmount, perhaps
// via rx-react.
var rxEvents = (comp, ...args) => {
	var ev = {};
	comp.on = {};
	_.each(args, name => {
		var sub = new Rx.Subject();
		ev[name] = sub;
		comp.on[name] = sub.next.bind(sub);
	});
	return ev;
};

var deepPureRenderMixin = {
	shouldComponentUpdate: function (nextProps, nextState) {
		return !_.isEqual(nextProps, this.props) ||
			!_.isEqual(nextState, this.state);
	}
};

module.exports = {
	rxEvents,
	deepPureRenderMixin: deepPureRenderMixin
};
