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

// return cardinalty, up to max (avoids full iteration of collection)
function cardinality(coll, max) {
	var s = new Set();
	var l = coll.length;
	for (var i = 0; i < l && s.size < max; ++i) {
		s.add(coll[i]);
	}
	return s.size;
}

// no dense data
var noData = subcols => subcols.every(subcol => subcol.every(isNaN));

var isSuitable = ({data, columns}, allowMulti, id) =>
	!(
		id === "samples" ||  // ignore samples column
		!columns[id] || // deleted
		columns[id].valueType === "mutation" || // to be implemented
		data[id].status !== "loaded" || // bad column
		data[id].req.values && noData(data[id].req.values) || // bad column
		data[id].req.rows && data[id].req.rows.length === 0 || // bad column
		// ignore any coded columns with too many items
		columns[id].codes && cardinality(data[id].req.values[0], 100) === 100 ||
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
		chartState = setIfNot(chartState, ['avgState', ycolumn], 0);
		chartState = setIfNot(chartState, ['pctState', ycolumn], 0);
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

export var showWizard = ({mode, chartState: {ycolumn, setColumn, another} = {}}) =>
	mode === 'chart' && (!v(ycolumn) || setColumn || another);

//
// dataset selections for ChartWizard, per-mode. These are moved to this file
// so we can check if anything is drawable (anyCanDraw) from AppControls,
// without needing to load all the rest of the chart code.
//

export var isFloat = (columns, id) => !columns[id].codes;
var optIsFloat = ({columns}) => ({value}) => isFloat(columns, value);
var optNotFloat = x => y => !optIsFloat(x)(y);
export var isMulti = _.curry(({columns}, {value}) =>
		isFloat(columns, value) && columns[value].fields.length > 1);

var optNotBigMulti = ({columns}) => ({value}) => columns[value].fields.length <= 10;
var and = (a, b) => x => y => a(x)(y) && b(x)(y); // getting crazy with the point-free

// limit subcolumns in Y to something reasonable
export var scatterYDatasets = appState => suitableColumns(appState, true)
	.filter(and(optIsFloat, optNotBigMulti)(appState));

export var scatterXDatasets = appState => suitableColumns(appState, false)
	.filter(optIsFloat(appState));

var scatterCanDraw = appState => {
	var y = _.pluck(scatterYDatasets(appState), 'value'),
		x = _.pluck(scatterXDatasets(appState), 'value');
	return x.length && y.length && _.uniq(y.concat(x)).length > 1;
};

var histCanDraw = appState => suitableColumns(appState, true).length > 0;

export var boxOrViolinYDatasets = appState => suitableColumns(appState, true);

export var boxOrViolinXDatasets = appState => suitableColumns(appState, false)
	.filter(optNotFloat(appState));

var boxOrViolinDatasets = appState => {
	var x = boxOrViolinXDatasets(appState),
		y = boxOrViolinYDatasets(appState);

	return {x, y};
};

var boxOrViolinCanDraw = appState =>
	boxOrViolinDatasets(appState).y.length > 0 &&
	boxOrViolinDatasets(appState).x.length > 0;


export var canDraw = {
	boxOrViolin: boxOrViolinCanDraw,
	histOrDist: histCanDraw,
	scatter: scatterCanDraw
};

export var anyCanDraw = appState => _.any(_.values(canDraw), x => x(appState));
