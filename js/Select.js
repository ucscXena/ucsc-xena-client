/*global require: false, module: false */
'use strict';

var React = require('react');
var DropdownButton = require('react-bootstrap/lib/DropdownButton');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var _ = require('underscore_ext');
var L = require('lenses/lens');
require('./Select.css');

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
        _.defer(() => this.refs.search.getDOMNode().focus());
    },
	// This is a work-around for
	// https://github.com/react-bootstrap/react-bootstrap/issues/486
	// We intercept the onKeyUp that would propagate to parent nodes,
	// close the menu ourselves, and stop the propagation. I'm not sure
	// why ev.stopPropagation doesn't work here.
	onKeyUp: function (ev) {
		if (ev.key === 'Escape') {
//			ev.stopPropagation();
			this.refs.dropdown.setDropdownState(false);
			ev.nativeEvent.stopImmediatePropagation();
		}
	},
	render: function () {
		var value = L.view(this.props.lens),
			title = _.find(this.props.options, opt => opt.value === value),
			opts = filterOpts(this.state.filter, this.props.options);
		return (
			<DropdownButton ref='dropdown'
				className='Select'
				onMouseUp={this.setFocus}
				title={title && title.label || 'Select...'}>

				{[<input className='Select-input'
					onKeyUp={this.onKeyUp}
					ref='search'
					key='__search'
					value={this.state.filter}
					onChange={this.onChange}
					type='text'/>
				].concat(_.map(opts, opt =>
						  <MenuItem onSelect={this.onSelect}
							eventKey={opt.value} key={opt.value}>

							{opt.label}
						 </MenuItem>))}
			</DropdownButton>
		);
	}
});

module.exports = Select;
