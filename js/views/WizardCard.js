/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Card displayed during (wizard-based) setup.
 *
 * State
 * -----
 * colHeight - Min height of column.
 * colId - ID of column (eg 'A', 'B'). Only applicable on edit of column.
 * colMode - Column mode (eg 'DEFAULT', 'WIZARD').
 * controls - Icons and/or menu displayed at right of card title.
 * subheader - Text displayed under title (helper text).
 * title - Text displayed as title.
 * valid - True if wizard card is complete and done button is enabled.
 * width - Width of card.
 *
 * Actions
 * -------
 * onDone - Called when DONE button is clicked.
 */


// Core dependencies, components
import {
	Box,
	Button,
	Card,
	CardActions,
	CardContent,
	CardHeader,
	CircularProgress,
	Typography
} from '@material-ui/core';
import React from 'react';

// App dependencies
import CardAvatar from './CardAvatar.js';

import XColumnDivider from './XColumnDivider';

// Template variables
var WIZARD_BUTTON_TEXT = {
	A: 'To First Variable',
	B: 'To Second Variable',
	C: 'Done'
};
var WIZARD_CARD_MAX_HEIGHT = 728;

// Styles
var sxCircularProgress = {
	display: 'flex',
	left: -24,
	position: 'absolute',
	top: 5,
};
var sxWizardCard = {
	borderRadius: 6,
	boxShadow: '0 1px 1px rgba(0, 0, 0, 0.14), 0 2px 1px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.2);',
	display: 'flex',
	flexDirection: 'column',
};
var sxWizardCardActions = {
	'&&': {
		padding: 16,
	},
};
var sxWizardCardButton = {
	'&&': {
		borderRadius: 4,
		fontSize: 15,
		letterSpacing: '0.46px',
		lineHeight: '26px',
		minHeight: 48,
		minWidth: 90,
	}
};
var sxWizardCardButtonLabel = {
	position: 'relative', // Positions circular progress
};
var sxWizardCardContent = {
	alignContent: 'flex-start',
	display: 'grid',
	flex: 1,
	gridGap: 24,
	px: 4,
	py: 6,
};
var sxWizardCardHeader = {
	'&&': {
		gap: 16,
		padding: 16,
	},
	'& .MuiCardHeader-title': {
		fontSize: 16,
		letterSpacing: 'normal',
	},
	'& .MuiCardHeader-subheader': {
		fontWeight: 400,
		letterSpacing: 'normal',
		lineHeight: '20px',
	}
};

class WizardCard extends React.Component {

	constructor(props) {
		super(props);
		this.doneButtonRef = React.createRef();
	}

	componentDidUpdate() {
		if (!this.props.pending && this.props.valid && this.doneButtonRef) {
			this.doneButtonRef.current.focus();
		}
	}

	onDone = () => {
		this.props.onDone();
	};

	onDoneExitWizard = () => {
		this.props.onWizardMode(false);
		this.props.onDone();
	};

	onDoneInvalid = (ev) => {
		var {valid, onDoneInvalid} = this.props;
		if (onDoneInvalid && !valid) {
			onDoneInvalid(ev);
		}
	};

	render() {
		var {children, colHeight, colId, colMode, controls, optionalExit,
				subheader, title, subtitle, valid, loading, loadingCohort, width} = this.props,
			minHeight = colHeight || WIZARD_CARD_MAX_HEIGHT;
		return (
			<>
				<Box component={Card} sx={{...sxWizardCard, minHeight, width}}>
					<Box
						component={CardHeader}
						action={controls}
						avatar={<CardAvatar colId={colId} colMode={colMode}/>}
						subheader={subheader}
						subheaderTypographyProps={{noWrap: true}}
						sx={sxWizardCardHeader}
						title={title}
						titleTypographyProps={{component: 'h6', noWrap: true}}/>
					<XColumnDivider/>
					<Box component={CardContent} sx={sxWizardCardContent}>
						{/* TODO(cc) 'error' message refactored temporarily */}
						{subtitle && <Box component={Typography} color='error.main' sx={{mb: loadingCohort ? '8px !important' : 0}}>{subtitle}</Box>}
						{loadingCohort && <p>Loading datasets...</p>}
						{children}
					</Box>
					<XColumnDivider/>
					<Box id={'wizardActions'} component={CardActions} sx={sxWizardCardActions}>
						<Box onClick={this.onDoneInvalid} flex={1}>
							<Box component={Button} ref={this.doneButtonRef} color='secondary' disabled={!valid} disableElevation fullWidth
								 onClick={this.onDone} sx={sxWizardCardButton} variant='contained'>
									<Box sx={sxWizardCardButtonLabel}>
										{loading && <Box sx={sxCircularProgress}><CircularProgress color='inherit' size={16} thickness={4}/></Box>}
										{(WIZARD_BUTTON_TEXT[colId] || 'Done')}
									</Box>
							</Box>
						</Box>
						{optionalExit && <Box component={Button} disabled={!valid} onClick={this.onDoneExitWizard} sx={sxWizardCardButton} variant='outlined'>Skip</Box>}
					</Box>
				</Box>
			</>
		);
	}
}

export { WizardCard, WIZARD_CARD_MAX_HEIGHT };
