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
			containerStyle = _.extend({
				display: open ? 'block' : 'none'
				//position: 'relative'
			}, dims);

		return (
			<div className='Crosshair' style={containerStyle}>
				<span className="CrosshairH"
					  style={{
						top: y,
						backgroundColor: "red"
					}}/>
				<span className="CrosshairV"
					  style={{
						left: x,
						backgroundColor: "blue"
					}}/>
			</div>
		);
	}
});

module.exports = Crosshair;