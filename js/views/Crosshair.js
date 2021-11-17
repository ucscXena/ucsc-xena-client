/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Crosshair component.
 */


// Core dependencies, components
import PureComponent from '../PureComponent';

var React = require('react');
var {Portal} = require('react-overlays');

// Styles
var compStyles = require('./Crosshair.module.css');
var classNames = require('classnames');
import pickerCursor from './colorize-24px.svg';

var frozen = (props, state) => !props.interactive || state.frozen;

class Crosshair extends PureComponent {
	state = {mousing: false, x: -1, y: -1};

	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		this.sub = this.props.tooltip.subscribe(ev => {
			var {frozen} = ev;
			this.setState({frozen});

			if (this.state.frozen && !frozen) { // just unfroze
				this.setState({mousing: false, x: -1, y: -1});
			}

		});
	}
	componentWillUnmount() {
		this.sub.unsubscribe();
	}
	UNSAFE_componentWillReceiveProps(nextProps) {//eslint-disable-line camelcase
		if (!frozen(nextProps, this.state)) {
			this.setState({mousing: false, x: -1, y: -1});
		}
	}

	onMouseMove = (ev) => {
		var x = ev.clientX - ev.currentTarget.getBoundingClientRect().left,
			noaction = this.props.picker && !this.props.canPickSamples(ev);
		if (!frozen(this.props, this.state)) {
			this.setState({mousing: true, x, y: ev.clientY, noaction});
		}
	};

	onMouseOut = () => {
		if (!frozen(this.props, this.state)) {
			this.setState({mousing: false});
		}
	};

	render() {
		let {noaction, mousing, x, y} = this.state,
			{onMouseMove, onMouseOut} = this,
			{picker, geneHeight, height, selection, children} = this.props,
			zoomMode = selection ? true : false,
			cursor =
				noaction ? 'not-allowed' :
				picker ? `url(${pickerCursor}) 0 22, none` :
				zoomMode ? 'none' :
				frozen(this.props, this.state) ? 'default' :
				'none';
		if (selection) {
			var {crosshair, offset, zone} = selection,
				xZoomTarget = crosshair.x - 6,
				yZoomTarget = crosshair.y - 6,
				crosshairVHeight = geneHeight + 8 + height,
				crosshairVTop = zone === 'a' ? offset.y - 8 : offset.y - geneHeight - 8;
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
						style={{bottom: zoomMode ? 'unset' : 0, left: zoomMode ? crosshair.x : x, height: zoomMode ? crosshairVHeight : height, top: zoomMode ? crosshairVTop : 'unset'}}/> : null}
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

