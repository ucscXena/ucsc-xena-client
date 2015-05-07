/*globals require: false, module: false, Blob: false, URL: false, document: false, window: false */
'use strict';

var React = require('react');
var _ = require('./underscore_ext');
var L = require('./lenses/lens');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var SplitButton = require('react-bootstrap/lib/SplitButton');
var Label = require('react-bootstrap/lib/Label');
var Resizable = require('react-resizable').Resizable;
var xenaQuery = require('./xenaQuery');

function download([fields, rows]) {
	var txt = _.map([fields].concat(rows), row => row.join('\t')).join('\n');
	// use blob for bug in chrome: https://code.google.com/p/chromium/issues/detail?id=373182
	var url = URL.createObjectURL(new Blob([txt], { type: 'text/tsv' }));
	var a = document.createElement('a');
	a.href = url;
	a.setAttribute('download', 'xenaDownload.tsv');
	a.click();
}

var Column = React.createClass({
	onResizeStop: function (ev, {size: {width, height}}) {
		L.over(this.props.lens,
			   s => _.assocIn(_.assocIn(s, ['zoom', 'height'], height),
							  ['columnRendering', this.props.id, 'width'], width));
	},
	onRemove: function () {
		L.over(this.props.lens,
			s => _.merge(s, {
				columnRendering: _.omit(s.columnRendering, this.props.id),
				columnOrder: _.without(s.columnOrder, this.props.id)
			}));
	},
	onDownload: function () {
		download(this.props.download());
	},
	onAbout: function () {
		var {lens, id} = this.props;
		var dsID = L.view(lens).columnRendering[id].dsID;
		var [host, dataset] = xenaQuery.parse_host(dsID);
		var url =`../datapages/?dataset=${encodeURIComponent(dataset)}&host=${encodeURIComponent(host)}`;
		window.open(url);
	},
	onViz: function () {
		this.props.onViz(this.props.id);
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
					<MenuItem onSelect={this.onDownload}>Download</MenuItem>
					<MenuItem onSelect={this.onAbout}>About the Dataset</MenuItem>
					<MenuItem onSelect={this.onViz}>Viz Settings</MenuItem>
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
