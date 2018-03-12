'use strict';

import PureComponent from './PureComponent';
var React = require('react');
import stateErrorStyle from './StateError.module.css';
import Dialog from 'react-toolbox/lib/dialog';

class StateError extends PureComponent {
	render() {

		const actions = [
			{
				label: <i className='material-icons'>close</i>,
				className: stateErrorStyle.dialogClose,
				onClick: this.props.onHide
			},
		];
		return (
			<div>
				<Dialog
					actions={actions}
					active={true}
					title='Whoops...'
					className={stateErrorStyle.dialog}
					onEscKeyDown={this.props.onHide}
					onOverlayClick={this.props.onHide}>
					<p>We were unable to restore the view from your {this.props.error}, possibly due to software
						updates. Sorry about that!</p>
				</Dialog>
			</div>
		);
	}
}

module.exports = StateError;
