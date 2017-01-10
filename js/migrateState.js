'use strict';

// This version should be changed if and only if there is a new
// state migration required. The migration(s) should be added
// to the 'migrations' object, below, at the bottom, under the
// *previous* version, not the *new* version. Migrations are
// applied by finding the migration matching the version in
// 'state', and all subsequent migrations.
//
// That is,
// 1) Create a new key in 'migration' for the current 'version',
//    which migrates the state for the new changes.
// 2) Increment the value of 'version'
var version = 's2.0';

var _ = require('./underscore_ext');
var {setFieldType} = require('./models/fieldSpec');


var setVersion = state => _.assoc(state, 'version', version);

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

// We have two scenarios: user has visited hub page, or user hasn't visited
// hub page. If they have, then allHosts is set. Otherwise, we only have user.
// We are dropping metadataFilterHosts.
var serverObject = state => {
	var {servers: {allHosts, user}} = state,
		all = allHosts || user,
		newServer = _.object(all, all.map(h => ({
			user: _.contains(user, h)
		})));

	return _.assoc(state, 'servers', newServer);
};

var getVersion = state => _.get(state, 'version', 's0.0');

// This must be sorted, with later versions appearing last.
var migrations = {
	's0.0': [setFieldTypeSV],
	's1.0': [serverObject]
};

// return index of value, or array length
function indexOf(arr, v) {
	var i = arr.indexOf(v);
	return i === -1 ? arr.length : i;
}

function apply(state) {
	var v = getVersion(state),
		versions = _.keys(migrations),
		toDo = _.flatmap(versions.slice(indexOf(versions, v)), v => migrations[v]);

	return setVersion(toDo.reduce((prev, fn) => fn(prev), state));
}

module.exports = apply;
