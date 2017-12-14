'use strict';
var React = require('react');
import {MenuItem} from 'react-toolbox/lib/menu';
var {parseDsID} = require('../xenaQuery');

var getAbout = (onClick, dsID, root, text) => {
    var [host, dataset] = parseDsID(dsID);
	return <MenuItem key='about' data-host={host} data-dataset={dataset} onClick={onClick} caption={text}/>;
};


function aboutDatasetMenu(onClick, dsID, root = '..') {
	return dsID ? getAbout(onClick, dsID, root, 'About the data') : null;
}

module.exports = aboutDatasetMenu;
