'use strict';
var React = require('react');
var _ = require('../underscore_ext');

var categories = ['Copy Number', 'Gene Expression', 'Somatic Mutation'];

var BasicDatasetSelect = React.createClass({
	render() {
		return (
			<div>
				{_.flatmap(categories, c => [<input type='checkbox' value={c}/>, <label>{c}</label>, <br/>])}
			</div>
		);
	}
});

module.exports = BasicDatasetSelect;
