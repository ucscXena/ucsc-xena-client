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
 * wizardMode - True if currently in wizard mode.
 */

'use strict';

// Core dependencies, components
var React = require('react');
import {Card, CardTitle} from 'react-toolbox/lib/card';
var classNames = require('classnames');

// App dependencies
var CardAvatar = require('./CardAvatar');

// Styles
var compStyles = require('./ColCard.module.css');

var ColCard = React.createClass({
	render() {
		var {children, controls, colId, subtitle, title, wizardMode} = this.props;
		return (
			<Card className='Column'>
				<div className={classNames(compStyles.headerContainer, 'Sortable-handle')}>
					<CardAvatar colId={colId}/>
					<div className={classNames(compStyles.controls, {[compStyles.showOnHover]: !wizardMode})}>
						{controls}
					</div>
				</div>
				<div className={compStyles.titleContainer}>
					<CardTitle className={compStyles.title} title={title} subtitle={subtitle}/>
				</div>
				{children}
			</Card>
		);
	}
});
module.exports = ColCard;
