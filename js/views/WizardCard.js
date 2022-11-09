/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Card displayed during (wizard-based) setup.
 *
 * State
 * -----
 * colId - ID of column (eg 'A', 'B'). Only applicable on edit of column.
 * colMode - Column mode (eg 'DEFAULT', 'WIZARD').
 * controls - Icons and/or menu displayed at right of card title.
 * helpText - Text displayed under title/subtitle and above children.
 * title - Text displayed as title.
 * valid - True if wizard card is complete and done button is enabled.
 * width - Width of card.
 *
 * Actions
 * -------
 * onDone - Called when DONE button is clicked.
 */


// Core dependencies, components
import {Box, Button, Card, CardActions, CardContent, CardHeader, Divider, Icon} from '@material-ui/core';
var React = require('react');
import spinner from '../ajax-loader.gif';

// App dependencies
var CardAvatar = require('./CardAvatar');

// Styles
var sxWizardCard = {
	display: 'flex',
	flexDirection: 'column',
	minHeight: 645, /* Must specify minimum height to maintain identical heights across cohort/disease and variable selects during wizard setup */
};
var sxWizardCardHeader = {
	padding: '16px !important',
};

class WizardCard extends React.Component {
	onDone = () => {
		this.props.onDone();
	};

	onDoneInvalid = (ev) => {
		var {valid, onDoneInvalid} = this.props;
		if (onDoneInvalid && !valid) {
			onDoneInvalid(ev);
		}
	};

	render() {
		var {children, colId, colMode, controls, contentSpecificHelp,
			title, subtitle, valid, loading, loadingCohort, width} = this.props;
		return (
			<Box component={Card} sx={{...sxWizardCard, width: width}}>
				<Box
					component={CardHeader}
					action={controls}
					avatar={<CardAvatar colId={colId} colMode={colMode}/>}
					sx={sxWizardCardHeader}/>
				<Divider/>
				<Box
					component={CardHeader}
					subheader={subtitle}
					subheaderTypographyProps={{color: 'error'}}
					sx={{height: 60}}
					title={title}
					titleTypographyProps={{component: 'h5'}}/>
				<Divider/>
				<Box flex='1'>
					{contentSpecificHelp ? <CardContent><p>{contentSpecificHelp}</p></CardContent> : null}
					{loadingCohort ? <CardContent><p>Loading datasets...</p></CardContent> : null}
					{(contentSpecificHelp || loadingCohort) && <Divider/>}
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
		);
	}
}

module.exports = WizardCard;
