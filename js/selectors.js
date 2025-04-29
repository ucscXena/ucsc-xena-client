import { fmapMemoize1 } from './underscore_ext.js';

// should be just one dependency, which returns an object.
function createFmapSelector(selector, resultFn) {
	var resultFunc = fmapMemoize1(resultFn);
	// XXX add recalc counter?

	return state => resultFunc(selector(state));
}

export { createFmapSelector };
