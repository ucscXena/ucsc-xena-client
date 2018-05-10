'use strict';
var React = require('react');
import {MenuItem} from 'react-toolbox/lib/menu';
var {parseDsID} = require('../xenaQuery');

var getAbout = (onClick, dsID, root, text) => {
    var [host, dataset] = parseDsID(dsID);
	return <MenuItem key='about' onClick={ev => onClick(ev, host, dataset)} caption={text}/>;
};


function aboutDatasetMenu(onClick, dsID, root = '..') {
	return dsID ? getAbout(onClick, dsID, root, 'About') : null;
}

module.exports = aboutDatasetMenu;
