
var {isString, isArray, isObject, isBoolean, isNumber, Let} = require('./underscore_ext').default;

var optBoolean = v => v === undefined || isBoolean(v);
var optObject = o => o === undefined || isObject(o);

// Some ad hoc checks of schema state, to avoid simple errors.  Might want to
// make this more formal, perhaps with a port of clojure spec, or perhaps our
// json spec lib, in docs/schema. For now, mostly trying to avoid loading state
// that is old, or corrupt.

var schemaCheck = state =>
	isObject(state) &&
	isNumber(state.version) &&
	isString(state.page) &&
	optObject(state.wizard) &&
	Let((spreadsheet = state.spreadsheet) =>
			spreadsheet === undefined ||
			(isObject(spreadsheet) &&
			isArray(spreadsheet.columnOrder) &&
			isObject(spreadsheet.columns) &&
			isString(spreadsheet.mode) &&
			isObject(spreadsheet.notifications) &&
			isObject(spreadsheet.servers) &&
			optBoolean(spreadsheet.showWelcome) &&
			optBoolean(spreadsheet.wizardMode) &&
			Let((zoom = spreadsheet.zoom) =>
				isObject(zoom) &&
				isNumber(zoom.height)))) &&
	state;

module.exports = {
	schemaCheck,
	schemaCheckThrow: state => {
		if (!schemaCheck(state)) {
			throw new Error('invalid state schema');
		}
		return state;
	}
};
