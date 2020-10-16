import getLabel from '../getLabel';
var _ = require('../underscore_ext').default;

// The string 'none' has been used in several user settings where null or
// undefined would be more typical. Since we have stored state like this,
// we retain the behavior and use this helper to retrive values that
// might be 'none'.
export var v = x => x === 'none' ? undefined : x;

export function columnLabel(i, {user}) {
	var	label = [user.fieldLabel, user.columnLabel]
		.filter(e => e.trim() !== '').join(" - ");
	return "column " + getLabel(i) + ": " + label;
}

var isSuitable = ({data, columns}, allowMulti, id) =>
	!(
		id === "samples" ||  // ignore samples column
		!columns[id] || // deleted
		columns[id].valueType === "mutation" || // to be implemented
		data[id].status !== "loaded" || // bad column
		data[id].req.values && data[id].req.values.length === 0 || // bad column
		data[id].req.rows && data[id].req.rows.length === 0 || // bad column
		// ignore any coded columns with too many items
		columns[id].codes && _.uniq(data[id].req.values[0]).length > 100 ||
		!allowMulti &&
			data[id].req.values && data[id].req.values.length !== 1);

export var suitableColumns = ({columnOrder, columns, data}, allowMulti) =>
	columnOrder.map((id, i) => ({
			value: id,
			label: columnLabel(i, columns[id])}))
		.filter(({value: id}) => isSuitable({data, columns}, allowMulti, id));

var setIfNot = (state, path, value) =>
	v(_.getIn(state, path)) ? state : _.assocIn(state, path, value);

// initialize exp and norm for active columns
var initSettings = chartState => {
	var ycolumn = chartState.ycolumn;
	if (v(ycolumn)) {
		chartState = setIfNot(chartState, ['normalizationState', ycolumn], 0);
		chartState = setIfNot(chartState, ['expState', ycolumn], 0);
	}
	var xcolumn = chartState.xcolumn;
	if (v(xcolumn)) {
		chartState = setIfNot(chartState, ['expState', xcolumn], 0);
	}
	return chartState;
};

var resetColumn = (xenaState, chartState, column, allowMulti) => {
	var id = _.get(chartState, column);
	return v(id) && !isSuitable(xenaState, allowMulti, id) ?
		_.assoc(chartState, column, 'none') : chartState;
};

// Handle
//  initialization, if chartState doesn't exist.
//  resetting columns, if they've been removed.
//  setting exp and norm for active columns.
export var defaultState = xenaState => {
	var chartState = xenaState.chartState;

	chartState = resetColumn(xenaState, chartState, 'ycolumn', true);
	chartState = resetColumn(xenaState, chartState, 'xcolumn', false);
	chartState = resetColumn(xenaState, chartState, 'colorColumn', false);

	chartState = initSettings(chartState);
	// assoc will discard noop assignments, so won't cause re-render.
	return _.assoc(xenaState, 'chartState', chartState);
};

export var showWizard = ({chartState: {ycolumn, setColumn} = {}}) =>
	!v(ycolumn) || setColumn;
