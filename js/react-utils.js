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

module.exports = {
	rxEvents
};
