'use strict';
var React = require('react');
var _ = require('../underscore_ext');

var BasicDatasetSelect = React.createClass({
	render() {
		var {preferred} = this.props;
		return (
			<div>
				{_.flatmap(preferred, ({dsID, label}) => [<input type='checkbox' value={dsID}/>, <label>{label}</label>, <br/>])}
			</div>
		);
	}
});

module.exports = BasicDatasetSelect;
