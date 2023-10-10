var {fmapMemoize1} = require('./underscore_ext').default;

// should be just one dependency, which returns an object.
function createFmapSelector(selector, resultFn) {
	var resultFunc = fmapMemoize1(resultFn);
	// XXX add recalc counter?

	return (state, props, ...args) => resultFunc(selector(state, props, ...args));
}

module.exports = {createFmapSelector};
