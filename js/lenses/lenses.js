/*global define: false */
'use strict';
define(['./lens', '../underscore_ext'], function (L, _) {
	function syncKeys(x, v, ks) {
		return _.reduce(ks, (acc, key) => _.has(v, key) ? _.assoc(acc, key, v[key]) : _.dissoc(acc, key), x);
	}
	return {
		key: k => L.lens(x => _.get_in(x, [k]), (x, v) => _.assoc(x, k, v)),
		path: p => L.lens(x => _.get_in(x, p), (x, v) => _.assoc_in(x, p, v)),
		keys: ks => L.lens(x => _.pick(x, ks), (x, v) => syncKeys(x, v, ks)),
		stringify: L.lens(x => JSON.stringify(x), (x, v) => JSON.parse(v))
	};
});
