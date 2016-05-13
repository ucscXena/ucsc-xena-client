/*global require: false, module: false */
'use strict';

var React = require('react');
var Input = require('react-bootstrap/lib/Input');
var {rxEventsMixin, deepPureRenderMixin} = require('../react-utils');

var SampleSearch = React.createClass({
	mixins: [rxEventsMixin, deepPureRenderMixin],
	componentWillMount: function () {
		var {onChange} = this.props;
		this.events('change');
		this.change = this.ev.change
			.map(ev => ev.target.value)
			.do(value => this.setState({value}))
			.throttle(100)
			.subscribe(onChange);
	},
	componentWillUnmount: function () {
		this.change.dispose();
	},
	componentWillReceiveProps: function (newProps) {
		this.setState({value: newProps.value});
	},
	getInitialState: function () {
		return {value: this.props.value};
	},
	render: function () {
		var {matches} = this.props,
			{value} = this.state;
		return (
			<form className='form-inline'>
				<Input style={{width: '40em'}} type='text' value={value} title={value} onChange={this.ev.change}/>
				{` Matching samples: ${matches}`}
			</form>
		);
	}
});

module.exports = SampleSearch;
