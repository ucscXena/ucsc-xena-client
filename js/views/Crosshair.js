/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Crosshair component.
 */

'use strict';

// Core dependencies, components
import PureComponent from '../PureComponent';
var React = require('react');
var {Portal} = require('react-overlays');

// Styles
var compStyles = require('./Crosshair.module.css');
var classNames = require('classnames');

class Crosshair extends PureComponent {
	state = {mousing: false, x: -1, xTarget: -1, y: -1, yTarget: -1};

	componentWillReceiveProps(nextProps) {
		if (!nextProps.frozen && !nextProps.zoomMode) {
			this.setState({mousing: false, x: -1, y: -1});
		}
	}

	onMouseMove = (ev) => {
		var {zoomMode} = this.props,
		x = zoomMode ? ev.clientX : ev.clientX - ev.currentTarget.getBoundingClientRect().left;
		var xTarget = x - ev.currentTarget.getBoundingClientRect().left - 6;
		var yTarget = ev.clientY - ev.currentTarget.getBoundingClientRect().top - 6;
		if (!this.props.frozen) {
			this.setState({mousing: true, x, xTarget, y: ev.clientY, yTarget});
		}
	};

	onMouseOut = () => {
		if (!this.props.frozen) {
			this.setState({mousing: false});
		}
	};

	render() {
		let {mousing, x, xTarget, y, yTarget} = this.state,
			{onMouseMove, onMouseOut} = this,
			{frozen, height, zoomMode, children} = this.props,
			cursor = frozen ? 'default' : 'none';
		return (
			<div style={{cursor}} onMouseMove={onMouseMove} onMouseOut={onMouseOut}>
				{children}
				{mousing || zoomMode ? <div className={classNames(compStyles.crosshair, compStyles.crosshairV, {[compStyles.zoomCrosshair]: zoomMode})} style={{left: x, height: zoomMode ? 'unset' : height}}/> : null}
				{zoomMode ? <div className={compStyles.crosshairTarget} style={{left: xTarget, top: yTarget}}/> : null}
				{mousing || zoomMode ?
					<Portal container={document.body}>
						<div className={compStyles.crosshairs}>
							<span className={classNames(compStyles.crosshair, compStyles.crosshairH, {[compStyles.zoomCrosshair]: zoomMode})} style={{top: y}}/>
						</div>
					</Portal> : null}
			</div>
		);
	}
}

module.exports = Crosshair;

