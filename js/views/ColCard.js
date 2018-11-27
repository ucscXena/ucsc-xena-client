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

class ColCard extends React.Component {
	render() {
		var {children, sortable, controls, colId, subtitle, title, wizardMode, zoomCard} = this.props;
		return (
			<Card className={classNames('Column', {[compStyles.zoomCard]: zoomCard})}>
				<div className={classNames(compStyles.headerContainer, sortable && 'Sortable-handle')}>
					<CardAvatar colId={colId} zoomCard={zoomCard}/>
					<div className={compStyles.controls}>
						{controls}
						<div className={classNames(compStyles.cover, {[compStyles.showOnHover]: !wizardMode})}/>
					</div>
				</div>
				<div className={compStyles.titleContainer}>
					<CardTitle className={compStyles.title} title={title} subtitle={subtitle}/>
				</div>
				{children}
			</Card>
		);
	}
}

module.exports = ColCard;
