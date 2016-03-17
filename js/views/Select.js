/*global require: false, module: false */
'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var DropdownButton = require('react-bootstrap/lib/DropdownButton');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');
//require('./Select.css');

function filterOpts(filter, opts) {
	var f = filter.toLowerCase();
	return _.filter(opts, opt => opt.label.toLowerCase().indexOf(f) !== -1);
}

var notUndefined = x => !_.isUndefined(x);

var stopPropagation = ev => {
	ev.stopPropagation();
	ev.nativeEvent.stopImmediatePropagation();
};

var Select = React.createClass({
	mixins: [deepPureRenderMixin],
	getInitialState: function () {
		return {filter: ''};
	},
	getDefaultProps: function () {
		return {
			disable: false,
			event: 'change'
		};
	},
	onSelect: function (ev, value) {
        this.setState({filter: ''});
		this.props.onSelect(value);
	},
	onChange: function(ev) {
		this.setState({filter: ev.target.value});
	},
    setFocus: function () {
        _.defer(() => ReactDOM.findDOMNode(this.refs.search).focus());
    },
	// This is a work-around for
	// https://github.com/react-bootstrap/react-bootstrap/issues/486
	// We intercept the onKeyUp that would propagate to parent nodes,
	// close the menu ourselves, and stop the propagation.
	// ev.stopPropagation doesn't work here because the esc key listener
	// is on document, outside the React bubbling implementation (which also
	// binds document). So, we have to use stopImmediatePropagation to cancel
	// pending callbacks.
	onKeyUp: function (ev) {
		if (ev.key === 'Escape') {
//			ev.stopPropagation();
			this.refs.dropdown.setDropdownState(false);
			ev.nativeEvent.stopImmediatePropagation();
		}
	},
	render: function () {
		var {disable, value} = this.props,
			title = notUndefined(value) &&
				_.find(this.props.options, opt => opt.value === value),
			opts = filterOpts(this.state.filter, this.props.options);
		// We wrap the input in a div so DropdownButton decorates the div
		// with event handlers, and we can disable them by using stopPropagation
		// on the input. There's no direct way to override the event handlers
		// installed by DropdownButton.
		return (
			<DropdownButton ref='dropdown'
				className='Select'
				disabled={disable}
				onMouseUp={this.setFocus}
				title={title && title.label || 'Select...'}>

				{[<div key='__search'><input className='Select-input'
					onKeyUp={this.onKeyUp}
					ref='search'
					value={this.state.filter}
					onChange={this.onChange}
					onSelect={stopPropagation}
					onClick={stopPropagation}
					type='text'/></div>
				].concat(_.map(opts, (opt, i) =>
						  <MenuItem onSelect={this.onSelect} header={!!opt.header}
							eventKey={opt.value} key={i}>

							{opt.label}
						 </MenuItem>))}
			</DropdownButton>
		);
	}
});

module.exports = Select;
