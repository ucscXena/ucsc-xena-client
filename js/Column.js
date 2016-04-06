/*eslint-env browser */
/*globals require: false, module: false */
'use strict';

var React = require('react');
var _ = require('./underscore_ext');
var {MenuItem, SplitButton} = require('react-bootstrap/lib');
var Resizable = require('react-resizable').Resizable;
var DefaultTextInput = require('./DefaultTextInput');
var {RefGeneAnnotation} = require('./refGeneExons');
var xenaQuery = require('./xenaQuery');

// XXX move this?
function download([fields, rows]) {
	var txt = _.map([fields].concat(rows), row => row.join('\t')).join('\n');
	// use blob for bug in chrome: https://code.google.com/p/chromium/issues/detail?id=373182
	var url = URL.createObjectURL(new Blob([txt], { type: 'text/tsv' }));
	var a = document.createElement('a');
	var filename = 'xenaDownload.tsv';
	_.extend(a, { id: filename, download: filename, href: url });
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

var ResizeOverlay = React.createClass({
	getInitialState: () => ({zooming: false}),
	onResizeStart: function () {
		var {width, height} = this.props;
		this.setState({zooming: true, zoomSize: {width, height}});
	},
	onResize: function (ev, {size}) {
		this.setState({zoomSize: size});
	},
	onResizeStop: function (...args) {
		var {onResizeStop} = this.props;
		this.setState({zooming: false});
		if (onResizeStop) {
			onResizeStop(...args);
		}
	},
	render: function () {
		var {zooming, zoomSize} = this.state;
		// XXX This margin setting really belongs elsewhere.
		return (
			<div className='resizeOverlay' style={{position: 'relative', marginBottom: '5px'}}>
				{zooming ? <div style={{
					width: zoomSize.width,
					height: zoomSize.height,
					position: 'absolute',
					top: 0,
					left: 0,
					zIndex: 999,
					backgroundColor: 'rgba(0,0,0,0.4)'
				}} /> : null}
				<Resizable handleSize={[20, 20]}
					onResizeStop={this.onResizeStop}
					onResize={this.onResize}
					onResizeStart={this.onResizeStart}
					width={this.props.width}
					height={this.props.height}>

					<div style={{position: 'relative', cursor: 'none', zIndex: 0}}>
						{this.props.children}
					</div>
				</Resizable>
			</div>
		);
	}
});

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
		var {column} = this.props;
		var dsID = column.dsID;
		var [host, dataset] = xenaQuery.parse_host(dsID);
		var url = `../datapages/?dataset=${encodeURIComponent(dataset)}&host=${encodeURIComponent(host)}`;
		window.open(url);
	},
	onViz: function () {
		this.props.onViz(this.props.id);
	},
	//onKm: function () {
	//	let {callback, id} = this.props;
	//	callback(['km-open', id]);
	//},
	render: function () {
		//var {id, callback, disableKm, plot, legend, column, zoom, menu, data} = this.props,
		var {id, callback, plot, legend, column, zoom, menu, data} = this.props,
			{width, columnLabel, fieldLabel} = column,
			//[kmDisabled, kmTitle] = disableKM(id),
			// move this to state to generalize to other annotations.
			doRefGene = _.get(data, 'refGene'),
			// In FF spans don't appear as event targets. In Chrome, they do.
			// If we omit Sortable-handle here, Chrome will only catch events
			// in the button but not in the span. If we omit Sortable-handle
			// in SplitButton, FF will catch no events, since span doesn't
			// emit any.
			moveIcon = (<span
				className="glyphicon glyphicon-resize-horizontal Sortable-handle"
				aria-hidden="true">
			</span>);
		//<MenuItem title={kmTitle} onSelect={this.onKm} disabled={kmDisabled}>Kaplan Meier Plot</MenuItem>
		return (
			<div className='Column' style={{width: width, position: 'relative'}}>
				<SplitButton className='Sortable-handle' title={moveIcon} bsSize='xsmall'>
					{menu}
					{menu && <MenuItem divider />}
					<MenuItem onSelect={this.onDownload}>Download</MenuItem>
					<MenuItem onSelect={this.onAbout}>About the Dataset</MenuItem>
					<MenuItem onSelect={this.onViz}>Viz Settings</MenuItem>
					<MenuItem onSelect={this.onRemove}>Remove</MenuItem>
				</SplitButton>
				<br/>
				<DefaultTextInput
					columnID={id}
					callback={callback}
					eventName='columnLabel'
					value={columnLabel} />
				<DefaultTextInput
					columnID={id}
					callback={callback}
					eventName='fieldLabel'
					value={fieldLabel} />
				<div style={{height: 20}}>
					{doRefGene ?
						<RefGeneAnnotation
							width={width}
							refGene={data.refGene[column.fields[0]]}
							layout={column.layout}
							position={{gene: column.fields[0]}}/> : null}
				</div>

				<ResizeOverlay
					onResizeStop={this.onResizeStop}
					width={width}
					height={zoom.height}>

						{plot}
				</ResizeOverlay>
				{legend}
			</div>
		);
	}
});

module.exports = Column;
