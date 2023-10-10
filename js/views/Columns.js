
import PureComponent from '../PureComponent';
import {Box} from '@material-ui/core';
var {omit} = require('../underscore_ext').default;

var React = require('react');

class ColumnsWrapper extends React.Component {
	render() {
		var {appState: {wizardMode}, children, append, onClick} = this.props;
		return (
			<Box onClick={onClick} className="Columns" sx={{gridGap: wizardMode ? 24 : undefined}}>
				{children}
				{append}
			</Box>);
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
