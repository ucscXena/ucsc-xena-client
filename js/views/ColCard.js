/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Card displayed after (wizard-based) setup is complete, contains column visualization.
 *
 * State
 * -----
 * colId - ID of column (eg 'A', 'B').
 * controls - Icons and/or menu displayed at right of card title.
 * title - Text or element displayed as title.
 * subtitle - Text or element displayed as subtitle.
 */

// Core dependencies, components
var React = require('react');
import {Box, Card, CardHeader, Icon, Typography} from '@material-ui/core';
import {xenaColor} from '../xenaColor';

var classNames = require('classnames');

// App dependencies
var CardAvatar = require('./CardAvatar');
import XColumnDivider from './XColumnDivider';

// Styles
var compStyles = require('./ColCard.module.css');
var sxColCardHeader = {
	'&&': {
		gap: 16,
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

class ColCard extends React.Component {
	render() {
		var {children, sortable, controls, colId, colMode, interactive, onClick, subtitle,
			title, geneZoomText, wizardMode, zoomCard} = this.props;
		return (
			<Card className={classNames('Column', {[compStyles.disableInteraction]: !interactive}, {[compStyles.zoomCard]: zoomCard})} elevation={2}>
				<Box
					component={CardHeader}
					action={controls}
					avatar={zoomCard ? undefined : <CardAvatar colId={colId} colMode={colMode}/>}
					subheader={wizardMode ? subtitle : undefined}
					subheaderTypographyProps={{noWrap: true}}
					sx={wizardMode ? sxColCardHeader : undefined}
					title={wizardMode ? title : undefined}
					titleTypographyProps={{component: 'h6', noWrap: true}}
					className={classNames(compStyles.headerContainer, sortable && interactive && 'Sortable-handle')}/>
				{!zoomCard && <XColumnDivider/>}
				{!wizardMode && <>
					<Box component={CardHeader}
						 className={compStyles.titleContainer}
						 subheader={<>
							 {subtitle}
							 {geneZoomText ?
								 <Box component='span' className={compStyles.zoomControl} color={xenaColor.PRIMARY_CONTRAST} onClick={onClick} title={geneZoomText}>
									 <Box component={Typography} noWrap sx={{fontSize: 8, mr: 1}} variant='inherit'>{geneZoomText}</Box>
									 <Box component={Icon} sx={{fontSize: '10px !important'}}>cancel</Box>
								 </Box> : null}</>}
						 subheaderTypographyProps={{color: 'textSecondary', component: 'p'}}
						 sx={{height: 60, position: 'relative'}}
						 title={title}
						 titleTypographyProps={{component: 'h5'}}/>
					{!zoomCard && <XColumnDivider/>}</>}
				<Box mt={2}>
					{children}
				</Box>
			</Card>
		);
	}
}

module.exports = ColCard;
