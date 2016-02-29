/*eslint-env browser */
/*globals require: false, module: false */
'use strict';

var React = require('react');
var _ = require('./underscore_ext');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var SplitButton = require('react-bootstrap/lib/SplitButton');
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
	a.href = url;
	a.setAttribute('download', 'xenaDownload.tsv');
	a.click();
}

// For geneProbesMatrix we will average across probes to compute KM. For
// other types, we can't support multiple fields. This should really be
// in a prop set by the column, or in a multimethod. Having this here is bad.

function disableKM(column, hasSurvival) {
	if (!hasSurvival) {
		return [true, 'No survival data for cohort'];
	}
	if (column.fields.length > 1 && column.dataType !== 'geneProbesMatrix') {
		return [true, 'Unsupported for multiple genes/ids'];
	}
	return [false, ''];
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
    var {column} = this.props;
    var dsID = column.dsID;
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
		var {id, callback, plot, legend, column, zoom, menu, data, hasSurvival} = this.props,
			{width, columnLabel, fieldLabel} = column,
			[kmDisabled, kmTitle] = disableKM(column, hasSurvival),
			// move this to state to generalize to other annotations.
			doRefGene = column.dataType === 'mutationVector',
			// In FF spans don't appear as event targets. In Chrome, they do.
			// If we omit Sortable-handle here, Chrome will only catch events
			// in the button but not in the span. If we omit Sortable-handle
			// in SplitButton, FF will catch no events, since span doesn't
			// emit any.
			moveIcon = (<span
				className="glyphicon glyphicon-resize-horizontal Sortable-handle"
				aria-hidden="true">
			</span>);

		return (
			<div className='Column' style={{width: width}}>
				<SplitButton className='Sortable-handle' title={moveIcon} bsSize='xsmall'>
					{menu}
					{menu && <MenuItem divider />}
					<MenuItem title={kmTitle} onSelect={this.onKm} disabled={kmDisabled}>Kaplan Meier Plot</MenuItem>
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
