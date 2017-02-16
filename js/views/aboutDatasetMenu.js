'use strict';
var React = require('react');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var _ = require('../underscore_ext');
var xenaQuery = require('../xenaQuery'); // XXX does this belong here?

function onAbout(dsID, root) {
	var [host, dataset] = xenaQuery.parseDsID(dsID);
	var url = `${root}/datapages/?dataset=${encodeURIComponent(dataset)}&host=${encodeURIComponent(host)}`;
	window.open(url);
}

var getAbout = (dsID, root, text) => (
	<MenuItem key={dsID} onSelect={() => onAbout(dsID, root)}>{text} </MenuItem>);

function aboutDatasetMenu({dsIDs, label}, root = '..') {
	if (dsIDs.length === 0) {
		return null;
	} else if (dsIDs.length === 1) {
		return getAbout(dsIDs[0], root, 'About the Dataset');
	}
	return [
		<MenuItem key='d0' divider/>,
		<MenuItem key='header' header>About the Datasets</MenuItem>,
		..._.map(dsIDs, dsID => getAbout(dsID, label(dsID))),
		<MenuItem key='d1' divider/>
	];
}

module.exports = aboutDatasetMenu;
