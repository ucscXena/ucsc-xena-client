/**
 * Created by albertwchang on 3/6/16.
 */
/*globals require: false, module: false */

'use strict';

var React = require('react');
var {deepPureRenderMixin} = require('./react-utils');
require('../css/crosshairs.css');

var Crosshair = React.createClass({
	mixins: [deepPureRenderMixin], // XXX any reason to use deep vs. shallow?
	getDefaultProps: function() {
		return {
			point: { x: 0, y: 0 }
		};
	},
	render: function () {
		let { point: {x, y}, open } = this.props,
			containerStyle = {display: open ? 'inline' : 'none'};
		return (
			<div className='crosshairs' style={containerStyle}>
				<span className='crosshair crosshairH' style={{top: y}}/>
				<span className='crosshair crosshairV' style={{left: x}}/>
			</div>
		);
	}
});

module.exports = Crosshair;
