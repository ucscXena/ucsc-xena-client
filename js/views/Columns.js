'use strict';

import PureComponent from '../PureComponent';
var React = require('react');

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

	return class extends PureComponent {
	    static displayName = 'SpreadsheetColumns';

	    render() {
			var {onClick, children, ...wrapperProps} = this.props;
			return (
				<Wrapper {...wrapperProps}>
					{children}
				</Wrapper>);
		}
	};
};

module.exports = getColumns;
