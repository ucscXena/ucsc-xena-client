/*global require: false, module: false */
'use strict';

var React = require('react');
var {Button, Glyphicon} = require('react-bootstrap/lib');
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

var stopPropagation = ev => {
	ev.stopPropagation();
	ev.nativeEvent.stopImmediatePropagation();
};

function makeMenuItem(choice, opt, key, onSelect) {
	return (
		<MenuItem onSelect={onSelect} header={!!opt.header}
				  key={key} eventKey={opt.value}>
			{(choice && choice.value === opt.value) && !_.has(choice, 'header')
				? <Glyphicon glyph='ok'/> : null}
			{opt.label}
		</MenuItem>
	);
}

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
			//ev.stopPropagation();
			this.refs.dropdown.setDropdownState(false);
			ev.nativeEvent.stopImmediatePropagation();
		}
	},
	onToggle: function(isOpen) {
		this.setState({menuStyle: isOpen ? 'info' : 'default'})
	},
	render: function () {
		var {allowSearch, choice, disable, options} = this.props,
			opts = filterOpts(this.state.filter, options);
		// We wrap the input in a div so DropdownButton decorates the div
		// with event handlers, and we can disable them by using stopPropagation
		// on the input. There's no direct way to override the event handlers
		// installed by DropdownButton.
		let searchSection = allowSearch ?
			<div key='__search'>
				<input className='Select-input'
					key='__search'
					onKeyUp={this.onKeyUp}
					ref='search'
					value={this.state.filter}
					onChange={this.onChange}
					onSelect={stopPropagation}
					onClick={stopPropagation}
					type='text'/>
			</div> : null;
		if (opts.length === 1) {
			let option = _.first(opts);
			return (
				<Button
					onClick={(e) => this.onSelect(e, option.value)}
					bsStyle={_.has(choice, 'value') ? 'success' : this.state.menuStyle}>
					{option.label}
				</Button>
			);
		} else if (opts.length > 1) {
			return (
				<DropdownButton ref='dropdown'
								menuitem='menuitem'
								bsStyle={_.has(choice, 'value') ? 'success' : this.state.menuStyle}
								className='Select'
								disabled={disable}
								onMouseUp={allowSearch ? this.setFocus : null}
								onToggle={this.onToggle}
								title={choice && choice.label || 'Please select...'}>
					{searchSection}
					{_.map(opts, (opt, i) => makeMenuItem(choice, opt, i, this.onSelect))}
				</DropdownButton>
			);
		} else {
			return null;
		}
	}
});

module.exports = Select;
