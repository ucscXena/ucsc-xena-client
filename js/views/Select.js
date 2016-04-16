/*global require: false, module: false */
'use strict';

var React = require('react');
var {DropdownButton, MenuItem} = require('react-bootstrap/lib');
var ReactDOM = require('react-dom');
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
		return {
			menuStyle: 'default',
			filter: ''
		};
	},
	getDefaultProps: function () {
		return {
			allowSearch: false,
			disable: false,
			event: 'change'
		};
	},
	onSelect: function (ev, value) {
		this.setState({filter: ''});
		this.props.onSelect(value, this.props.title);
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
			//ev.stopPropagation();
			this.refs.dropdown.setDropdownState(false);
			ev.nativeEvent.stopImmediatePropagation();
		}
	},
	onToggle: function(isOpen) {
		this.setState({menuStyle: isOpen ? 'info' : 'default'})
	},
	render: function () {
		var {allowSearch, options, value} = this.props,
			{filter} = this.state,
			opts = filterOpts(filter, options),
			title = notUndefined(value) && _.findWhere(options, {value: value});
		// We wrap the input in a div so DropdownButton decorates the div
		// with event handlers, and we can disable them by using stopPropagation
		// on the input. There's no direct way to override the event handlers
		// installed by DropdownButton.
		var searchSection = allowSearch ?
			<div key='__search'>
				<input className='Select-input'
					   key='__search'
					   onKeyUp={this.onKeyUp}
					   ref='search'
					   value={filter}
					   onChange={this.onChange}
					   onSelect={stopPropagation}
					   onClick={stopPropagation}
					   type='text'/>
			</div> : null;

		return (
			<DropdownButton ref='dropdown'
							className='Select'
							menuitem='menuitem'
							onMouseUp={allowSearch ? this.setFocus : null}
							onToggle={this.onToggle}
							title={title && title.label || 'Please select...'}>
				{searchSection}
				{_.map(opts, (opt, i) =>
					<MenuItem onSelect={this.onSelect} key={i}
						  header={!!opt.header} eventKey={opt.value}>{opt.label}
					</MenuItem>
				)}
			</DropdownButton>
		);
	}
});

module.exports = Select;
