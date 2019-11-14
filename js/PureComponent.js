
var {Component} = require('react');
var {isEqual} = require('./underscore_ext');

var logDiff, logTime, diff; //eslint-disable-line no-unused-vars

if (process.env.NODE_ENV !== 'production') {
	var diff = (a, b) => {
		Object.keys(a).forEach(p => {
			if (!b.hasOwnProperty(p)) {
				console.log('key deleted:', p);
			} else if (!isEqual(a[p], b[p])) {
				console.log('key changed:', p);
			}
		});
		Object.keys(b).forEach(p => {
			if (!a.hasOwnProperty(p)) {
				console.log('key added:', p);
			};
		});
	};
	logDiff = function(comp, nextProps, nextState) {
		if (!isEqual(comp.props, nextProps)) {
			console.log(comp.constructor.displayName, 'props differ:');
			diff(comp.props, nextProps);
		}
		if (!isEqual(comp.state, nextState)) {
			console.log(comp.constructor.displayName, 'state differs:');
			diff(comp.state, nextState);
		}
	};
	var keyList = Object.keys;
	var hasProp = Object.prototype.hasOwnProperty;
	function updateInBang(x, path, f) {
			var o = x;
			for (var i = 0; i < path.length - 1; ++i) {
					if (!o.hasOwnProperty(path[i])) {
							o[path[i]] = {};
					}
					o = o[path[i]];
			}
			o[path[path.length - 1]] = f(o[path[path.length - 1]]);
	}

	window.timing = {};
	var add = a => b => (b == null ? 0 : b) + a;
	logTime = function(comp, tag, a, b) {
		if (!a || !b || typeof a !==  'object' || typeof b !== 'object') {
			// missing props or state to compare
			return isEqual(a, b);
		}
		var ka = keyList(a),
			kb = keyList(b),
			key, i, t0, t1, r;
		if (ka.length !== kb.length) {
			return false;
		}
		for (i = 0; i < ka.length; ++i) {
			if (!hasProp.call(b, ka[i])) {
				return false; // b mising key in a
			}
		}
		for (i = 0; i < ka.length; ++i) {
			key = ka[i];
			t0 = performance.now();
			r = isEqual(a[key], b[key]);
			t1 = performance.now();
			updateInBang(window.timing, [comp, tag, key, 'count'], add(1));
			updateInBang(window.timing, [comp, tag, key, 'time'], add(t1 - t0));
			if (!r) {
				return false;
			}
		}
		return true;
	};
	function dumpTiming() {
		var t = window.timing;

		var lines =
			Object.keys(t).map(comp =>
				Object.keys(t[comp]).map(tag =>
					Object.keys(t[comp][tag]).map(name =>
						[comp, tag, name, t[comp][tag][name].time, t[comp][tag][name].count])).flatten()).flatten();
		lines.sort((l0, l1) => l0[3] - l1[3]);
		lines.forEach(line => console.log(line.join('\t')));
	}
	window.dumpTiming = dumpTiming;
}

class PureComponent extends Component {
	shouldComponentUpdate(nextProps, nextState) {
//		logDiff(this, nextProps, nextState);
//		var name = this.constructor.displayName || this.constructor.name;
//		return !logTime(name, 'prop', nextProps, this.props)
//			|| !logTime(name, 'state', nextState, this.state);

		return !isEqual(nextProps, this.props) ||
			!isEqual(nextState, this.state);
	}
}

export default PureComponent;
