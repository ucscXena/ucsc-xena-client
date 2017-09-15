/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Card displayed during (wizard-based) setup.
 *
 * State
 * -----
 * colId - ID of column (eg 'A', 'B'). Only applicable on edit of column.
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

'use strict';

// Core dependencies, components
var React = require('react');
import {Button} from 'react-toolbox/lib/button';
import {Card, CardTitle, CardText, CardActions} from 'react-toolbox/lib/card';

// App dependencies
var CardAvatar = require('./CardAvatar');

// Styles
var compStyles = require('./WizardCard.module.css');

var WizardCard = React.createClass({
	onDone() {
		this.props.onDone();
	},
	render() {
		var {children, colId, controls, contentSpecificHelp, title, valid, width} = this.props;
		return (
			<Card style={{width: width}} className={compStyles.WizardCard}>
				<div className={compStyles.headerContainer}>
					<CardAvatar colId={colId}/>
					<div className={compStyles.controls}>
						{controls}
					</div>
				</div>
				<div className={compStyles.titleContainer}>
					<CardTitle className={compStyles.title} title={title} />
				</div>
				<div className={compStyles.content}>
					{contentSpecificHelp ? <CardText>{contentSpecificHelp}</CardText> : null}
					{children}
				</div>
				<CardActions className={compStyles.actions}>
					<Button accent disabled={!valid} onClick={this.onDone}>Done</Button>
				</CardActions>
			</Card>
		);
	}
});
module.exports = WizardCard;
