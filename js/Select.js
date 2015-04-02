/*global require: false, module: false */
'use strict';

var React = require('react');
var DropdownButton = require('react-bootstrap/lib/DropdownButton');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var Input = require('react-bootstrap/lib/Input');
var _ = require('underscore_ext');
var L = require('lenses/lens');
require('bootstrap/dist/css/bootstrap.css');

function filterOpts(filter, opts) {
	var f = filter.toLowerCase();
	return _.filter(opts, opt => opt.label.toLowerCase().indexOf(f) !== -1);
}

var Select = React.createClass({
	getInitialState: function () {
		return {filter: ''};
	},
	onSelect: function (value) {
        this.setState({filter: ''});
		L.set(this.props.lens, null, value);
	},
	onChange: function(ev) {
		this.setState({filter: ev.target.value});
	},
    setFocus: function (ev) {
        _.defer(() => this.refs.search.refs.input.getDOMNode().focus());
    },
	render: function () {
		var value = L.view(this.props.lens),
			title = _.find(this.props.options, opt => opt.value === value),
			opts = filterOpts(this.state.filter, this.props.options);
		return (
			<DropdownButton onMouseUp={this.setFocus} title={title && title.label || "Select..."}>
				{[<Input ref="search" key="__search" value={this.state.filter} onChange={this.onChange} type='text'/>].concat(
					_.map(opts, opt =>
						  <MenuItem onSelect={this.onSelect} eventKey={opt.value} key={opt.value}>
							 {opt.label}
						 </MenuItem>))}
			</DropdownButton>
		);
	}
});

module.exports = Select;
