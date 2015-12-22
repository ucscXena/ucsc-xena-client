/*globals require: false, module: false, Blob: false, URL: false, document: false, window: false */
'use strict';

var React = require('react');
var _ = require('./underscore_ext');
var L = require('./lenses/lens');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var SplitButton = require('react-bootstrap/lib/SplitButton');
var Resizable = require('react-resizable').Resizable;
var xenaQuery = require('./xenaQuery');
var DefaultTextInput = require('./defaultTextInput');
var {RefGeneAnnotation} = require('./refGeneExons');

// XXX move this?
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
	onResizeStop: function (ev, {size}) {
		this.props.callback(['resize', this.props.id, size]);
	},
	onRemove: function () {
		this.props.callback(['remove', this.props.id]);
	},
	onDownload: function () {
		download(this.props.download());
	},
	onAbout: function () {
		var {lens, id} = this.props;
		var dsID = L.view(lens).columnRendering[id].dsID;
		var [host, dataset] = xenaQuery.parse_host(dsID);
		var url = `../datapages/?dataset=${encodeURIComponent(dataset)}&host=${encodeURIComponent(host)}`;
		window.open(url);
	},
	onViz: function () {
		this.props.onViz(this.props.id);
	},
	onKm: function () {
		let {callback, id} = this.props;
		callback(['km-open', id]);
	},
	render: function () {
		var {id, callback, plot, legend, column, zoom, menu, data} = this.props,
			{width, columnLabel, fieldLabel} = column,
			// move this to state to generalize to other annotations.
			doRefGene = column.dataType === 'mutationVector',
			moveIcon = (<span
				className="glyphicon glyphicon-resize-horizontal Sortable-handle"
				aria-hidden="true">
			</span>);

// Disable km for certain column types?
//				if (!this.columnUi.plotData || (column.dataType !== 'geneProbesMatrix' && column.fields.length > 1)) {

		return (
			<div className='Column' style={{width: width}}>
				<SplitButton title={moveIcon} bsSize='xsmall'>
					{menu}
					{menu && <MenuItem divider />}
					<MenuItem onSelect={this.onKm}>Kaplan Meier Plot</MenuItem>
					<MenuItem onSelect={this.onDownload}>Download</MenuItem>
					<MenuItem onSelect={this.onAbout}>About the Dataset</MenuItem>
					<MenuItem onSelect={this.onViz}>Viz Settings</MenuItem>
					<MenuItem onSelect={this.onRemove}>Remove</MenuItem>
				</SplitButton>
				<br/>
				<DefaultTextInput
					dsID={id}
					callback={callback}
					eventName='columnLabel'
					value={columnLabel} />
				<DefaultTextInput
					dsID={id}
					callback={callback}
					eventName='fieldLabel'
					value={fieldLabel} />
				<div style={{height: 20}}>
					{doRefGene && data ?
						<RefGeneAnnotation
							width={width}
							refGene={data.refGene[column.fields[0]]}
							layout={column.layout}
							position={{gene: column.fields[0]}}/> : null}
				</div>

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
