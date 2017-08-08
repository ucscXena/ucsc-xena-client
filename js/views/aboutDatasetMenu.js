'use strict';
var React = require('react');
import {MenuItem, MenuDivider } from 'react-toolbox/lib/menu';
var _ = require('../underscore_ext');
var xenaQuery = require('../xenaQuery'); // XXX does this belong here?

function onAbout(dsID, root) {
	var [host, dataset] = xenaQuery.parseDsID(dsID);
	var url = `${root}/datapages/?dataset=${encodeURIComponent(dataset)}&host=${encodeURIComponent(host)}`;
	window.open(url);
}

var getAbout = (dsID, root, text) => (
	<MenuItem key={dsID} onClick={() => onAbout(dsID, root)} caption={text}/>);

function aboutDatasetMenu({dsIDs, label}, root = '..') {
	if (dsIDs.length === 0) {
		return null;
	} else if (dsIDs.length === 1) {
		return getAbout(dsIDs[0], root, 'About the Dataset');
	}
	return [
		<MenuDivider key='d0'/>,
		<MenuItem key='header' header caption='About the Datasets'/>,
		..._.map(dsIDs, dsID => getAbout(dsID, label(dsID))),
		<MenuDivider key='d1'/>
	];
}

module.exports = aboutDatasetMenu;
