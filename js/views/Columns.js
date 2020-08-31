
import PureComponent from '../PureComponent';
var {omit} = require('../underscore_ext').default;

var React = require('react');

class ColumnsWrapper extends React.Component {
	render() {
		var {children, append, onClick} = this.props;
		return (
			<div onClick={onClick} className="Columns">
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
			var {children} = this.props,
				wrapperProps = omit(this.props, 'onClick', 'children');
			return (
				<Wrapper {...wrapperProps}>
					{children}
				</Wrapper>);
		}
	};
};

module.exports = getColumns;
