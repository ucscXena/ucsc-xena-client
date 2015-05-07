/*globals require: false, module: false */
'use strict';

var React = require('react');
var _ = require('./underscore_ext');
var L = require('./lenses/lens');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var SplitButton = require('react-bootstrap/lib/SplitButton');
var Label = require('react-bootstrap/lib/Label');
var Resizable = require('react-resizable').Resizable;

var Column = React.createClass({
	onResizeStop: function (ev, {size: {width, height}}) {
		L.over(this.props.lens,
			   s => _.assocIn(_.assocIn(s, ['zoom', 'height'], height),
							  ['columnRendering', this.props.id, 'width'], width));
	},
	onRemove: function () {
		L.over(this.props.lens,
			   s => _.assoc(
				   _.assoc(s, 'columnRendering', _.omit(s.columnRendering, this.props.id)),
				   'columnOrder', _.without(s.columnOrder, this.props.id)));
	},
	render: function () {
		var {plot, legend, column, zoom} = this.props;
		var {width, columnLabel, fieldLabel} = column,
		moveIcon = <span
			className="glyphicon glyphicon-resize-horizontal Sortable-handle"
			aria-hidden="true">
		</span>;

		return (
			<div className='Column' style={{width: width}}>
				<SplitButton title={moveIcon} bsSize='xsmall'>
					<MenuItem onSelect={this.onRemove}>Remove</MenuItem>
				</SplitButton>
				<br/>
				<Label>{columnLabel.user}</Label>
				<br/>
				<Label>{fieldLabel.user}</Label>
				<br/>
				<Resizable handleSize={[20, 20]}
					onResizeStop={this.onResizeStop}
					width={width}
					height={zoom.height}>

					<div style={{position: 'relative'}}>
						{plot}
					</div>
				</Resizable>
				{legend}
			</div>
		);
	}
});

module.exports = Column;
