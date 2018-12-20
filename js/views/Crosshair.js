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
	state = {mousing: false, x: -1, y: -1};

	componentWillReceiveProps(nextProps) {
		if (!nextProps.frozen) {
			this.setState({mousing: false, x: -1, y: -1});
		}
	}

	onMouseMove = (ev) => {
		var x = ev.clientX - ev.currentTarget.getBoundingClientRect().left;
		if (!this.props.frozen) {
			this.setState({mousing: true, x, y: ev.clientY});
		}
	};

	onMouseOut = () => {
		if (!this.props.frozen) {
			this.setState({mousing: false});
		}
	};

	render() {
		let {mousing, x, y} = this.state,
			{onMouseMove, onMouseOut} = this,
			{frozen, height, selection, children} = this.props,
			zoomMode = selection ? true : false,
			cursor = zoomMode ? 'none' : frozen ? 'default' : 'none';
		if (selection) {
			var {crosshair} = selection,
				xZoomTarget = crosshair.x - 6,
				yZoomTarget = crosshair.y - 6;
		}
		let getCrosshairVClassName = (zoomMode) => {
			return classNames({
				[compStyles.crosshairV]: !zoomMode,
				[compStyles.inspectCrosshair]: !zoomMode,
				[compStyles.zoomCrosshairV]: zoomMode
			});
		};
		let getCrosshairHClassName = (zoomMode) => {
			return classNames({
				[compStyles.crosshairH]: !zoomMode,
				[compStyles.inspectCrosshair]: !zoomMode,
				[compStyles.zoomCrosshairH]: zoomMode
			});
		};
		return (
			<div style={{cursor}} onMouseMove={onMouseMove} onMouseOut={onMouseOut}>
				{children}
				{zoomMode || mousing ?
					<div
						className={classNames(compStyles.crosshair, getCrosshairVClassName(zoomMode))}
						style={{left: zoomMode ? crosshair.x : x, height: zoomMode ? '100%' : height}}/> : null}
				{zoomMode ?
					<div className={classNames(compStyles.crosshair, compStyles.crosshairTarget)}
						 style={{left: xZoomTarget, top: yZoomTarget}}/> : null}
				{zoomMode || mousing ?
					<Portal container={document.body}>
						<div className={classNames(compStyles.crosshairs)}>
									<span
										className={classNames(compStyles.crosshair, getCrosshairHClassName(zoomMode))}
										style={{top: zoomMode ? crosshair.y : y}}/>
						</div>
					</Portal> : null}
			</div>
		);
	}
}

module.exports = Crosshair;

