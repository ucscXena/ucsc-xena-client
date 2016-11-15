'use strict';

var React = require('react');
var {Portal} = require('react-overlays');
var {deepPureRenderMixin} = require('../react-utils');
require('./Crosshair.css');

var Crosshair = React.createClass({
	mixins: [deepPureRenderMixin],
	getInitialState() {
		return {mousing: false, x: -1, y: -1};
	},
	onMouseMove(ev) {
		this.setState({mousing: true, x: ev.clientX, y: ev.clientY});
	},
	onMouseOut() {
		this.setState({mousing: false});
	},
	render: function () {
		let {mousing, x, y} = this.state,
			{onMouseMove, onMouseOut} = this;
		return (
			<div style={{cursor: 'none'}} onMouseMove={onMouseMove} onMouseOut={onMouseOut}>
				{this.props.children}
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

