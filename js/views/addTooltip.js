/*globals require: false, module: false */
'use strict';

var Crosshair = require('./Crosshair');
var Tooltip = require('./Tooltip');
var React = require('react');
var {rxEventsMixin} = require('../react-utils');
var meta = require('../meta');
var _ = require('../underscore_ext');

function addTooltip(Component) {
	return React.createClass({
		displayName: 'SpreadsheetTooltip',
		mixins: [rxEventsMixin],
		getInitialState: function () {
			return {
				crosshair: {open: false},
				tooltip: {open: false},
			};
		},
		componentWillMount: function () {
			this.events('tooltip', 'click');

			var toggle = this.ev.click.filter(ev => ev[meta.key])
				.map(() => 'toggle');

			this.tooltip = this.ev.tooltip.merge(toggle)
				// If open + user clicks, toggle freeze of display.
				.scan([null, false],
					([tt, frozen], ev) =>
						ev === 'toggle' ? [tt, tt.open && !frozen] : [ev, frozen])
				// Filter frozen events until frozen state changes.
				.distinctUntilChanged(([ev, frozen]) => frozen ? frozen : [ev, frozen])
				.map(([ev, frozen]) => _.assoc(ev, 'frozen', frozen))
				.subscribe(ev => {
					// Keep 'frozen' and 'open' params for both crosshair && tooltip
					let plotVisuals = {
						crosshair: _.omit(ev, 'data'), // remove tooltip-related param
						tooltip: _.omit(ev, 'point' ) // remove crosshair-related param
					};

					return this.setState(plotVisuals);
				});
		},
		componentWillUnmount: function () {
			this.tooltip.dispose();
		},
		render() {
			var {children, ...props} = this.props;
			return (
				<div>
					<Component {...props} onClick={this.ev.click}>
						{React.Children.map(children, el =>
							React.cloneElement(el, {
								tooltip: this.ev.tooltip
							}))}
					</Component>
					<Crosshair {...this.state.crosshair} />
					<Tooltip onClick={this.ev.click} {...this.state.tooltip}/>
				</div>);
		}
	});
}

module.exports = addTooltip;
