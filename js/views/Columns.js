'use strict';

var React = require('react');
var createReactClass = require('create-react-class');
var {deepPureRenderMixin} = require('../react-utils');

class ColumnsWrapper extends React.Component {
	render() {
		var {children, widgetProps, append, ...optProps} = this.props;
		return (
			<div {...optProps} className="Columns">
				{children}
				{append}
			</div>);
	}
}

var getColumns = wrapperFn => {
	let Wrapper = wrapperFn(ColumnsWrapper);

	return createReactClass({
		displayName: 'SpreadsheetColumns',
		mixins: [deepPureRenderMixin],
		render() {
			var {onClick, children, ...wrapperProps} = this.props;
			return (
				<Wrapper {...wrapperProps}>
					{children}
				</Wrapper>);
		}
	});
};

module.exports = getColumns;
