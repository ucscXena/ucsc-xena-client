'use strict';

var React = require('react');
var widgets = require('../columnWidgets');
var {deepPureRenderMixin} = require('../react-utils');
var _ = require('../underscore_ext');

// XXX doing layout here.
// XXX we could push width down into widgets.legend, but would
// need to update all the legend components to respect width.
function addLegend(Component) {
	return React.createClass({
		displayName: 'SpreadsheetLegend',
		mixins: [deepPureRenderMixin],
		render() {
			var {children, ...props} = this.props,
				{editing, columns, data: columnData} = this.props.appState;
			return (
				<Component {...props}>
					{React.Children.map(children, el => {
						var id = el.props.actionKey,
							data = columnData[id],
							column = columns[id];
						return (
							<div actionKey={id}>
								{el}
								{editing !== id && !_.isNumber(id) ? (
									<div style={{width: column.width}}>
										{widgets.legend({column, id, data})}
									</div>) : null}
							</div>);
					 })}
				</Component>);
		}
	});
}

module.exports = addLegend;
