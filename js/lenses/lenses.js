/*global define: false, console :false */
'use strict';
define(['./lens', '../underscore_ext'], function (L, _) {

	function syncKeys(x, v, ks) {
		return _.reduce(ks, (acc, key) => _.has(v, key) ? _.assoc(acc, key, v[key]) : _.dissoc(acc, key), x);
	}

	function log() {
		if (console) {
			console.log.apply(null, arguments);
		}
	}

	function spy(msg) {
		return L.lens(x => {
				log(`${msg} view ${JSON.stringify(x)}`);
				return x;
			},
			(x, v) => {
				log(`${msg} set ${JSON.stringify(x)} ${JSON.stringify(v)}`);
				return v;
			}
		);
	}

	return {
		key: k => L.lens(x => _.getIn(x, [k]), (x, v) => _.assoc(x, k, v)),
		path: p => L.lens(x => _.getIn(x, p), (x, v) => _.assocIn(x, p, v)),
		keys: ks => L.lens(x => _.pick(x, ks), (x, v) => syncKeys(x, v, ks)),
		keyArray: ks => L.lens(x => _.map(ks, k => _.getIn(x, k)),
			(x, v) => _.reduce(ks, (acc, key, i) => _.assoc(acc, key, v[i]), x)),
		stringify: L.lens(x => JSON.stringify(x), (x, v) => JSON.parse(v)),
		spy: spy
	};
});
