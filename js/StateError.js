import PureComponent from './PureComponent';
var React = require('react');
import {
	Box,
	Dialog,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Icon,
	IconButton,
	Typography
} from '@material-ui/core';
var {contains} = require('./underscore_ext').default;
import {xenaColor} from './xenaColor';

// Styles
var sxCloseButton = {
	alignSelf: 'flex-start',
	color: xenaColor.BLACK_38,
	'&:hover': {
		backgroundColor: xenaColor.BLACK_6,
	},
};

var stateTypes = ['bookmark', 'import', 'session'];
var getMsg = error =>
	contains(stateTypes, error) ? `We were unable to restore the view from your ${error}, possibly due to software updates. Sorry about that!` :
	error;

export class StateError extends PureComponent {
	render() {
		var message = getMsg(this.props.error);
		return (
			<Dialog
				fullWidth
				maxWidth={'sm'}
				onClose={this.props.onHide}
				open={!!this.props.error}
				PaperProps={{style: {alignSelf: 'flex-start', marginTop: 96}}}>
				<DialogTitle disableTypography>
					<Box sx={{display: 'flex', gap: 8, justifyContent: 'space-between'}}>
						<Typography variant='subtitle1'>Whoops...</Typography>
						<Box color='default' component={IconButton} onClick={this.props.onHide} sx={sxCloseButton}>
							<Icon>close</Icon>
						</Box>
					</Box>
				</DialogTitle>
				<DialogContent>
					<DialogContentText>{message}</DialogContentText>
				</DialogContent>
			</Dialog>
		);
	}
}
