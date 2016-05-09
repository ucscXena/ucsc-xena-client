/*global require: false, module: false */
'use strict';

var React = require('react');

var SampleSearch = React.createClass({
	render: function () {
		var {matches, onChange} = this.props;
		return (
			<form className='form-inline'>
				<input onChange={onChange}/>
				{` Matching samples: ${matches}`}
			</form>
		);
	}
});

module.exports = SampleSearch;
