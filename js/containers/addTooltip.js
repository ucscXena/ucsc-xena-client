'use strict';

var Tooltip = require('../views/Tooltip');
var React = require('react');
var {rxEventsMixin} = require('../react-utils');
var meta = require('../meta');
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');

function addTooltip(Component) {
	return React.createClass({
		displayName: 'SpreadsheetTooltip',
		mixins: [rxEventsMixin, deepPureRenderMixin],
		getInitialState: function () {
			return {
				tooltip: {open: false},
			};
		},
		componentWillMount: function () {
			this.events('tooltip', 'click');

			var toggle = this.ev.click.filter(ev => ev[meta.key])
				.map(() => 'toggle');

			this.tooltip = this.ev.tooltip.merge(toggle)
				// If open + user clicks, toggle freeze of display.
				.scan(([tt, frozen], ev) =>
							ev === 'toggle' ? [tt, tt.open && !frozen] : [ev, frozen],
						[null, false])
				// Filter frozen events until frozen state changes.
				.distinctUntilChanged(_.isEqual, ([ev, frozen]) => frozen ? frozen : [ev, frozen])
				.map(([ev, frozen]) => _.assoc(ev, 'frozen', frozen))
				.subscribe(ev => this.setState({tooltip: ev}));
		},
		componentWillUnmount: function () {
			this.tooltip.unsubscribe();
		},
		render() {
			var {children, ...props} = this.props;
			return (
				<div>
					<Component {...props} onClick={this.on.click}>
						{React.Children.map(children, el =>
							React.cloneElement(el, {
								tooltip: this.ev.tooltip,
								frozen: this.state.tooltip.frozen
							}))}
					</Component>
					<Tooltip onClick={this.on.click} {...this.state.tooltip}/>
				</div>);
		}
	});
}

module.exports = addTooltip;
