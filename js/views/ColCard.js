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

'use strict';

// Core dependencies, components
var React = require('react');
import {Card, CardTitle} from 'react-toolbox/lib/card';

// Styles
var compStyles = require('./ColCard.module.css');

var ColCard = React.createClass({
	render() {
		var {children, controls, colId, subtitle, title} = this.props;
		var variableAvatar = colId ? <div className={compStyles.avatar}>{colId}</div> : null;
		return (
			<Card className='Column'>
				<div className={compStyles.titleContainer}>
					<CardTitle className={compStyles.title} avatar={variableAvatar} title={title} subtitle={subtitle} />
					{controls}
				</div>
				{children}
			</Card>
		);
	}
});
module.exports = ColCard;
