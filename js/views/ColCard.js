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
import {Box, Card, CardHeader, Divider, Icon, Typography} from '@material-ui/core';
import {xenaColor} from '../xenaColor';

var classNames = require('classnames');

// App dependencies
var CardAvatar = require('./CardAvatar');

// Styles
var compStyles = require('./ColCard.module.css');

class ColCard extends React.Component {
	render() {
		var {children, sortable, controls, colId, colMode, interactive, onClick, subtitle, title, geneZoomText, zoomCard} = this.props;
		return (
			<Card className={classNames('Column', {[compStyles.zoomCard]: zoomCard})} elevation={2}>
				<CardHeader
					action={controls}
					avatar={zoomCard ? undefined : <CardAvatar colId={colId} colMode={colMode}/>}
					className={classNames(compStyles.headerContainer, sortable && interactive && 'Sortable-handle')}/>
				{!zoomCard && <Divider/>}
				<Box
					component={CardHeader} className={compStyles.titleContainer}
					subheader={
						<>
							{subtitle}
							{geneZoomText ?
								<Box
									component='span' className={compStyles.zoomControl}
									color={xenaColor.PRIMARY_CONTRAST} onClick={onClick}
									title={geneZoomText}>
									<Box
										component={Typography} noWrap
										sx={{fontSize: 8, mr: 1}} variant='inherit'>{geneZoomText}</Box>
									<Box component={Icon} sx={{fontSize: '10px !important'}}>cancel</Box>
								</Box> : null}
						</>} subheaderTypographyProps={{color: 'textSecondary', component: 'p'}}
					sx={{height: 60, position: 'relative'}}
					title={title} titleTypographyProps={{component: 'h5'}}/>
				{!zoomCard && <Divider/>}
				<Box mt={2}>
					{children}
				</Box>
			</Card>
		);
	}
}

module.exports = ColCard;
