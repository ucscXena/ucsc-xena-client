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

// Styles
var compStyles = require('./WizardCard.module.css');

var WizardCard = React.createClass({
	onDone() {
		this.props.onDone();
	},
	render() {
		var {children, colId, controls, helpText, title, valid, width} = this.props;
		var variableAvatar = colId ? <div className={compStyles.avatar}>{colId}</div> : null;
		return (
			<Card style={{width: width}} className={compStyles.WizardCard}>
				<div className={compStyles.titleContainer}>
					<CardTitle className={compStyles.title} avatar={variableAvatar} title={title} />
					{controls}
				</div>
				{helpText ? <CardText>{helpText}</CardText> : null}
				{children}
				<CardActions className={compStyles.actions}>
					<Button accent disabled={!valid} onClick={this.onDone}>Done</Button>
				</CardActions>
			</Card>
		);
	}
});
module.exports = WizardCard;
