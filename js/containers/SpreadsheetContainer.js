/*global module: false, require: false */
'use strict';

var React = require('react');
var Spreadsheet = require('../Spreadsheet');

// XXX Does this break hot-loading? Check react hot loading docs
// and Abramov blog.
var getSpreadsheetContainer = Column => React.createClass({
	render() {
		return <Spreadsheet {...this.props} Column={Column}/>;
	}
});

module.exports = {getSpreadsheetContainer};
