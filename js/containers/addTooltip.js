'use strict';

var Tooltip = require('../views/Tooltip');
import PureComponent from '../PureComponent';
var React = require('react');
var {rxEvents} = require('../react-utils');
var meta = require('../meta');
var _ = require('../underscore_ext');

function addTooltip(Component) {
	return class extends PureComponent {
	    static displayName = 'SpreadsheetTooltip';

	    state = {
	        tooltip: {open: false},
	    };

	    componentWillMount() {
			var events = this.ev = rxEvents(this, 'tooltip', 'click', 'close');

			var toggle = events.click.filter(ev => ev[meta.key])
					.map(() => 'toggle'),
				close = events.close.map(() => 'toggle');

			this.tooltip = events.tooltip.merge(toggle).merge(close)
				// If open + user clicks, toggle freeze of display.
				.scan(([tt, frozen], ev) =>
							ev === 'toggle' ? [tt, tt.open && !frozen] : [ev, frozen],
						[{open: false}, false])
				// Filter frozen events until frozen state changes.
				.distinctUntilChanged(_.isEqual, ([ev, frozen]) => frozen ? frozen : [ev, frozen])
				.map(([ev, frozen]) => _.assoc(ev, 'frozen', frozen))
				.subscribe(ev => this.setState({tooltip: ev}));
		}

	    componentWillUnmount() {
			this.tooltip.unsubscribe();
		}

	    render() {
			var {children, ...props} = this.props,
				{interactive} = props,
				open = this.state.tooltip.open && interactive,
				onClick = interactive ? this.on.click : null;
			return (
				<Component
					{...props}
					onClick={onClick}
					append={<Tooltip show={interactive} onClose={this.on.close} onClick={this.on.click} {...{...this.state.tooltip, open}}/>}>
					{React.Children.map(children, el =>
						React.cloneElement(el, {
							tooltip: this.ev.tooltip,
							frozen: this.state.tooltip.frozen
						}))}
				</Component>);
		}
	};
}

module.exports = addTooltip;
