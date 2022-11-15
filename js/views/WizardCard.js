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
import {Box, Button, Card, CardActions, CardContent, CardHeader, Icon, Typography} from '@material-ui/core';
var React = require('react');
import spinner from '../ajax-loader.gif';

// App dependencies
var CardAvatar = require('./CardAvatar');
import XActionButton from "./XActionButton";
import XColumnDivider from './XColumnDivider';

// Styles
var sxWizardCard = {
	borderRadius: 6,
	boxShadow: '0 1px 1px rgba(0, 0, 0, 0.14), 0 2px 1px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.2);',
	display: 'flex',
	flexDirection: 'column',
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
var sxWizardEarlyExit = {
	alignSelf: 'center',
	fontSize: 15,
	fontWeight: 500,
	letterSpacing: '0.46px',
	lineHeight: '26px'
};

class WizardCard extends React.Component {
	onDone = () => {
		this.props.onDone();
	};

	onDoneExitWizard = () => {
		this.props.onWizardMode(false);
		this.props.onDone();
	}

	onDoneInvalid = (ev) => {
		var {valid, onDoneInvalid} = this.props;
		if (onDoneInvalid && !valid) {
			onDoneInvalid(ev);
		}
	};

	render() {
		var {children, colHeight, colId, colMode, controls, onWizardMode, optionalExit,
				subheader, title, subtitle, valid, loading, loadingCohort, width} = this.props,
		minHeight = Math.max(colHeight || 0, 605),
		showOptionalExit = optionalExit && onWizardMode && valid;
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
					<Box flex='1'>
						{/* TODO(cc) 'error' message refactored temporarily */}
						{(loadingCohort || subtitle) && <>
							<CardContent>
								{subtitle && <Box component={Typography} color='error.main' sx={{mb: loadingCohort ? '8px !important' : 0}}>{subtitle}</Box>}
								{loadingCohort && <p>Loading datasets...</p>}
							</CardContent>
							<XColumnDivider/></>}
						{children}
					</Box>
					<CardActions>
						{loading ? <img alt='loading' src={spinner}/> : null}
						{valid ? <Icon>done</Icon> : null}
						<span onClick={this.onDoneInvalid}>
							<Button disabled={!valid} onClick={this.onDone}>Done</Button>
						</span>
					</CardActions>
				</Box>
				{showOptionalExit && <XActionButton sx={sxWizardEarlyExit} onClick={this.onDoneExitWizard}>Skip Next Step</XActionButton>}
			</>
		);
	}
}

module.exports = WizardCard;
