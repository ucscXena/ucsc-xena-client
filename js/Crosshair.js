/**
 * Created by albertwchang on 3/6/16.
 */
/*globals require: false, module: false */

'use strict';

var React = require('react');
var _ = require('./underscore_ext');
var {deepPureRenderMixin} = require('./react-utils');
var meta = require('./meta');
require('../css/crosshairs.css');

var Crosshair = React.createClass({
	mixins: [deepPureRenderMixin], // XXX any reason to use deep vs. shallow?
	getDefaultProps: function() {
		return {
			point: { x: 0, y: 0 }
		}
	},
	render: function () {
		let { point: {x, y}, open, dims } = this.props,
			baseStyle = open
				? {cursor: 'none', display: 'inline'}
				: {cursor: 'default', display: 'none'},
			containerStyle = _.extend(baseStyle, dims);

		return (
			<div className='Crosshair' style={containerStyle}>
				<span className='CrosshairH' style={{top: y}}/>
				<span className='CrosshairV' style={{left: x}}/>
			</div>
		);
	}
});

module.exports = Crosshair;