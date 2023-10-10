var React = require('react');
import {MenuItem} from '@material-ui/core';
var {parseDsID} = require('../xenaQuery');

var getAbout = (onClick, dsID, root, text) => {
    var [host, dataset] = parseDsID(dsID);
	return <MenuItem key='about' onClick={ev => onClick(ev, host, dataset)}>{text}</MenuItem>;
};


function aboutDatasetMenu(onClick, dsID, root = '..') {
	return dsID ? getAbout(onClick, dsID, root, 'About') : null;
}

module.exports = aboutDatasetMenu;
