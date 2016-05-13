/*global require: false, module: false */
'use strict';

var React = require('react');
var Input = require('react-bootstrap/lib/Input');

var SampleSearch = React.createClass({
	render: function () {
		var {matches, value, onChange} = this.props;
		return (
			<form className='form-inline'>
				<Input style={{width: '40em'}} type='text' value={value} onChange={onChange}/>
				{` Matching samples: ${matches}`}
			</form>
		);
	}
});

module.exports = SampleSearch;
