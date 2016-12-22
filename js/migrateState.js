'use strict';

var _ = require('./underscore_ext');
var {setFieldType} = require('./models/fieldSpec');

// XXX put this in common file
var getFieldType = (datasets, fs) => {
	if (fs.fieldType !== 'mutation') {
		return fs.fieldType;
	}
	var dataSubType = _.getIn(datasets, [fs.dsID, 'dataSubType'], '');
	return (dataSubType.search(/SV|structural/i) !== -1) ? 'SV' : 'mutation';
};

// This isn't quite right, if we have a composite view that mixes
// SV & non-SV. Pretty sure we don't.
var shouldSetSV = (datasets, column) =>
	_.any(column.fieldSpecs, fs => getFieldType(datasets, fs) === 'SV');

var updateColumn = _.curry(
	(datasets, c) => shouldSetSV(datasets, c) ? setFieldType('SV', c) : c);

var setFieldTypeSV = state =>
	_.updateIn(state, ['columns'],
		columns => _.mapObject(columns, updateColumn(state.datasets)));

var serverObject = state => {
	var {server: {allHosts, user, metadataFilterHosts}} = state,
		newServer = _.object(allHosts, allHosts.map(h => ({
			user: _.contains(user, h),
			meta: _.contains(metadataFilterHosts, h)
		})));

	return _.assoc(state, 'server', newServer);
};

var getVersion = state => _.get(state, 'version', 's0.0');

// This must be sorted, with later versions appearing last.
var migrations = {
	's0.0': [setFieldTypeSV],
	's1.0': [serverObject]
};

// return index of value, or array length
function indexOf(arr, v) {
	var i = arr.indexOf(arr, v);
	return i === -1 ? arr.length : i;
}

function apply(state) {
	var v = getVersion(state),
		versions = _.keys(migrations),
		toDo = _.flatmap(versions.slice(indexOf(versions, v)), v => migrations[v]);

	return toDo.reduce((prev, fn) => fn(prev), state);
}

module.exports = apply;
