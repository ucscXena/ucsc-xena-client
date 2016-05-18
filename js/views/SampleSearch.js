/*global require: false, module: false */
'use strict';

var React = require('react');
var Input = require('react-bootstrap/lib/Input');
var Button = require('react-bootstrap/lib/Button');
var {deepPureRenderMixin} = require('../react-utils');

var SampleSearch = React.createClass({
	mixins: [deepPureRenderMixin],
	componentWillReceiveProps: function (newProps) {
		this.setState({value: newProps.value});
	},
	getInitialState: function () {
		return {value: this.props.value};
	},
	onChange: function (ev) {
		var {onChange} = this.props,
			value = ev.target.value;
		this.setState({value});
		onChange(value);
	},
	render: function () {
		var {matches, help} = this.props,
			{value} = this.state;
		return (
			<form className='form-inline'>
				<Input style={{width: '20em'}}
					type='text'
					value={value}
					title={value}
					placeholder='Enter search terms, e.g. missense'
					onChange={this.onChange}/>
				{` Matching samples: ${matches}`}
				{help ? <Button bsStyle='link' target='_blank' href={help}>Help with search</Button> : null}
			</form>
		);
	}
});

module.exports = SampleSearch;
