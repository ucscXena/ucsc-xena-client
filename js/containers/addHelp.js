'use strict';

var React = require('react');
var HelpBox = require('../views/HelpBox');
//old text:  The left-most column is used for the initial row sort. In case of a tie, the value in the next column to the right is used to break the tie.
var columnHelp = onClose => (
	<HelpBox w={400} o='Below' onClose={onClose}>
		<p>Column B value is used to sort the rows. In case of a tie, the next columns to the right are used to break the tie.</p>
	</HelpBox>);

var rowHelp = onClose => (
	<HelpBox w={400} o='Right' onClose={onClose}>
		<p>Each row contains data from a single sample.</p>
		<p>Row order is determined by sorting the rows by their column values.</p>
	</HelpBox>);

function addHelp(Component) {
	return React.createClass({
		displayName: 'SpreadsheetHelp',
		onColumnHelp() {
			this.props.callback(['notifications-disable', 'columnHelp']);
		},
		onRowHelp() {
			this.props.callback(['notifications-disable', 'rowHelp']);
		},
		render() {
			var {children, ...props} = this.props,
				{columnOrder, notifications, wizardMode} = this.props.appState,
				last = columnOrder.length - 1;
			return (
				<Component {...props}>
					{React.Children.map(children, (el, i) =>  {
						var append = wizardMode ? undefined :
							i === 1 && !notifications.columnHelp ? columnHelp(this.onColumnHelp) :
							i === last && !notifications.rowHelp ? rowHelp(this.onRowHelp) : undefined;

						return append ? React.cloneElement(el, {append}) : el;
					 })}
				</Component>);
		}
	});
}

module.exports = addHelp;
