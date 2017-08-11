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
 * frozen - True if card is read only (ie zoom, crosshair, tooltip is disabled). True in wizard mode, if a new variable
 *          is being added or if any variables is being edited.
 * title - Text or element displayed as title.
 * subtitle - Text or element displayed as subtitle.
 * width - Width of card.
 */

'use strict';

// Core dependencies, components
var React = require('react');
var classNames = require('classnames');
import {Card, CardTitle} from 'react-toolbox/lib/card';

// Styles
var compStyles = require('./ColCard.module.css');

var ColCard = React.createClass({
	render() {
		var {children, controls, colId, frozen, subtitle, title, width} = this.props;
		var variableAvatar = colId ? <div className={compStyles.avatar}>{colId}</div> : null;
		return (
			<Card className={classNames('Column', {[compStyles.frozen]: frozen})} style={{width: width}}>
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
