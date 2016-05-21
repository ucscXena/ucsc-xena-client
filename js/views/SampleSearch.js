/*global require: false, module: false */
'use strict';

var React = require('react');
var Input = require('react-bootstrap/lib/Input');
var Button = require('react-bootstrap/lib/Button');
var {deepPureRenderMixin} = require('../react-utils');

var SampleSearch = React.createClass({
	mixins: [deepPureRenderMixin],
	componentWillReceiveProps: function (newProps) {
		if (this.state.value === this.props.value) {
			this.setState({value: newProps.value});
		}
		// otherwise we have buffered changes to state, and
		// updating from props would revert the user input
		// and move the carat to the end.
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
		var {matches, help, onFilter} = this.props,
			{value} = this.state;
		return (
			<form className='form-inline'>
				<Input style={{width: '26em'}}
					type='text'
					value={value}
					title={value}
					placeholder='Samples to highlight. e.g. TCGA-DB-A4XH, missense'
					onChange={this.onChange}/>
				{` Matching samples: ${matches}`}
				{onFilter ?
					<Button onClick={onFilter} bsSize='sm' title='Apply as filter'>
						<span className='glyphicon glyphicon-filter' aria-hidden='true'/>
					</Button> : null}
				{help ? <Button bsStyle='link' target='_blank' href={help}>Help with search</Button> : null}
			</form>
		);
	}
});

module.exports = SampleSearch;
