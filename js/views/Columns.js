/*globals require: false, module: false */
'use strict';

var React = require('react');
var {deepPureRenderMixin} = require('../react-utils');

var ColumnsWrapper = React.createClass({
	render() {
		var {children, widgetProps, ...optProps} = this.props;
		return (
			<div {...optProps} className="Columns">
				{children}
			</div>);
	}
});

var getColumns = wrapperFn => {
	let Wrapper = wrapperFn(ColumnsWrapper);

	return React.createClass({
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
