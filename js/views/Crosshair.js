'use strict';

var React = require('react');
var createReactClass = require('create-react-class');
var {Portal} = require('react-overlays');
var {deepPureRenderMixin} = require('../react-utils');
require('./Crosshair.css');

var Crosshair = createReactClass({
	mixins: [deepPureRenderMixin],
	getInitialState() {
		return {mousing: false, x: -1, y: -1};
	},
	componentWillReceiveProps(nextProps) {
		if (!nextProps.frozen) {
			this.setState({mousing: false, x: -1, y: -1});
		}
	},
	onMouseMove(ev) {
		if (!this.props.frozen) {
			this.setState({mousing: true, x: ev.clientX, y: ev.clientY});
		}
	},
	onMouseOut() {
		if (!this.props.frozen) {
			this.setState({mousing: false});
		}
	},
	render() {
		let {mousing, x, y} = this.state,
			{onMouseMove, onMouseOut} = this,
			{frozen, children} = this.props,
			cursor = frozen ? 'default' : 'none';
		return (
			<div style={{cursor}} onMouseMove={onMouseMove} onMouseOut={onMouseOut}>
				{children}
				{mousing ?
					<Portal container={document.body}>
						<div className='crosshairs'>
							<span className='crosshair crosshairH' style={{top: y}}/>
							<span className='crosshair crosshairV' style={{left: x}}/>
						</div>
					</Portal> : null}
			</div>
		);
	}
});

module.exports = Crosshair;

