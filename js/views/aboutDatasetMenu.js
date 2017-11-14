'use strict';
var React = require('react');
import {MenuItem} from 'react-toolbox/lib/menu';
var xenaQuery = require('../xenaQuery'); // XXX does this belong here?

function onAbout(dsID, root) {
	var [host, dataset] = xenaQuery.parseDsID(dsID);
	var url = `${root}/datapages/?dataset=${encodeURIComponent(dataset)}&host=${encodeURIComponent(host)}`;
	window.open(url);
}

var getAbout = (dsID, root, text) => (
	<MenuItem key={dsID} onClick={() => onAbout(dsID, root)} caption={text}/>);

function aboutDatasetMenu(dsID, root = '..') {
	return dsID ? getAbout(dsID, root, 'About the Dataset') : null;
}

module.exports = aboutDatasetMenu;
