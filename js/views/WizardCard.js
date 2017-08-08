/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Card displayed during (wizard-based) setup.
 *
 * State
 * -----
 * colId - ID of column (eg 'A', 'B').
 * title - Text displayed as title.
 * subtitle - Text displayed as subtitle.
 * helpText - Text displayed under title/subtitle and above children.
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
		var {colId, title, subtitle, helpText, children, valid, width} = this.props;
		var variableAvatar = colId ? <div className={compStyles.wizardVariableAvatar}>{colId}</div> : null;
		return (
			<Card style={{width: width}}>
				<div className={compStyles.wizardTitle}>
					<CardTitle avatar={variableAvatar} title={title} subtitle={subtitle} />
					<i className='material-icons'>close</i>
				</div>
				{helpText ? <CardText>{helpText}</CardText> : null}
				{children}
				<CardActions className={compStyles.wizardActions}>
					<Button accent disabled={!valid} onClick={this.onDone}>Done</Button>
				</CardActions>
			</Card>
		);
	}
});
module.exports = WizardCard;
