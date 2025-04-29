
import PureComponent from '../PureComponent';
var React = require('react');
import * as widgets from '../columnWidgets.js';
var _ = require('../underscore_ext').default;

// XXX doing layout here.
// XXX we could push width down into widgets.legend, but would
// need to update all the legend components to respect width.
function addLegend(Component) {
	return class extends PureComponent {
	    static displayName = 'SpreadsheetLegend';

	    render() {
			var {children, ...props} = this.props,
				{editing, columns, data: columnData} = this.props.appState;
			return (
				<Component {...props}>
					{React.Children.map(children, el => {
						var id = el.props['data-actionkey'],
							data = columnData[id],
							column = columns[id];
						return (
							<div data-actionkey={id}>
								{el}
								{id != null && editing !== id && !_.isNumber(id) ? (
									<div style={{width: column.width, marginTop: 24}}>
										{widgets.legend({column, id, data})}
									</div>) : null}
							</div>);
					 })}
				</Component>);
		}
	};
}

export default addLegend;
