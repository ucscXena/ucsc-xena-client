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

var spinner = require('../ajax-loader.gif');

// App dependencies
var CardAvatar = require('./CardAvatar');

// Styles
var compStyles = require('./WizardCard.module.css');
var cardStyles = require('./RTCardTheme.module.css');
var classname = require('classnames');

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
		var {children, colId, controls, contentSpecificHelp,
			title, subtitle, valid, loading, loadingCohort, width} = this.props;
		return (
				<Card style={{width: width}} className={compStyles.WizardCard}>
					<div className={compStyles.headerContainer}>
						<CardAvatar colId={colId}/>
						<div className={compStyles.controls}>
							{controls}
						</div>
					</div>
					<div className={compStyles.titleContainer}>
						<CardTitle className={classname(compStyles.title, subtitle ? cardStyles.warning : '')} title={title} subtitle={subtitle}/>
					</div>
					<div className={compStyles.content}>
						{contentSpecificHelp ? <CardText>{contentSpecificHelp}</CardText> : null}
						{loadingCohort ? <CardText>Loading datasets...</CardText> : null}
						{children}
					</div>
					<CardActions className={compStyles.actions}>
						{loading ? <img src={spinner}/> : null}
						{valid ? <i className='material-icons'>done</i> : null}
						<span onClick={this.onDoneInvalid}>
						<Button accent disabled={!valid} onClick={this.onDone}>Done</Button>
					</span>
					</CardActions>
				</Card>
		);
	}
}

module.exports = WizardCard;
