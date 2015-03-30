/*global define: false */
define(['lens', 'underscore_ext'], function (L, _) {
	return {
		key: k => L.lens(x => _.get_in(x, [k]), (x, v) => _.assoc(x, k, v)),
		path: p => L.lens(x => _.get_in(x, p), (x, v) => _.assoc_in(x, p, v)),
		keys: ks => L.lens(x => _.pick(x, ks), (x, v) => _.extend({}, x, _.pick(v, ks)))
	};
});
