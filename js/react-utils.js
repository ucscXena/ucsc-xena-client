import * as _ from './underscore_ext.js';
import Rx from './rx';

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

export { rxEvents };
