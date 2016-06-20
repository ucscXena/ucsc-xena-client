/*eslint-env browser */
/*globals require: false, module: false */
'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('./underscore_ext');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var SplitButton = require('react-bootstrap/lib/SplitButton');
var Badge = require('react-bootstrap/lib/Badge');
var DefaultTextInput = require('./DefaultTextInput');
var {RefGeneAnnotation} = require('./refGeneExons');
var SpreadSheetHighlight = require('./SpreadSheetHighlight');
var ResizeOverlay = require('./views/ResizeOverlay');
var widgets = require('./columnWidgets');
var aboutDatasetMenu = require('./views/aboutDatasetMenu');

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

var styles = {
	badge: {
		fontSize: '100%',
		// Fix the width so it doesn't change if the label changes. This is important
		// when resizing, because we (unfortunately) inspect the DOM to discover
		// the minimum width we need to draw the column controls. If the label changes
		// to a different character, the width will be different, and our minimum width
		// becomes invalid.
		width: 24
	}
};

function mutationMenu(props, {onMuPit}) {
	var {column, data} = props,
		assembly = _.getIn(column, ['assembly']),
		rightAssembly = (assembly === "hg19" || assembly === "GRCh37") ? true : false,  //MuPIT currently only support hg19
		noMenu = !rightAssembly || (data && _.isEmpty(data.refGene)),
		noData = ( !data ) ? true : false,
		menuItemName = noData ? 'MuPIT View (hg19) Loading' : 'MuPIT View (hg19)';
	return noMenu ? null : <MenuItem disabled={noData} onSelect={onMuPit}>{menuItemName}</MenuItem>;
}

function matrixMenu(props, {supportsGeneAverage, onMode}) {
	var {id, column: {fieldType, noGeneDetail}} = props;
	return supportsGeneAverage(id) ?
		(fieldType === 'genes' ?
			<MenuItem eventKey="geneProbes" title={noGeneDetail ? 'no common probemap' : ''}
				disabled={noGeneDetail} onSelect={onMode}>Detailed view</MenuItem> :
			<MenuItem eventKey="genes" onSelect={onMode}>Gene average</MenuItem>) :
		null;
}

// We could try to drive this from the column widgets, but it gets rather complex making
// the widgets care about a menu in their container.
function optionMenu(props, opts) {
	var {column: {valueType}} = props;
	return (valueType === 'mutation' ?  mutationMenu : matrixMenu)(props, opts);
}

var Column = React.createClass({
	onResizeStop: function (size) {
		this.props.onResize(this.props.id, size);
	},
	onRemove: function () {
		this.props.onRemove(this.props.id);
	},
	onDownload: function () {
		download(this.refs.plot.download());
	},
	onViz: function () {
		this.props.onViz(this.props.id);
	},
	onKm: function () {
		this.props.onKm(this.props.id);
	},
	onMode: function (ev, newMode) {
		this.props.onMode(this.props.id, newMode);
	},
	onColumnLabel: function (value) {
		this.props.onColumnLabel(this.props.id, value);
	},
	onFieldLabel: function (value) {
		this.props.onFieldLabel(this.props.id, value);
	},
	onMuPit: function () {
		// Construct the url, which will be opened in new window
		let rows = _.getIn(this.props, ['data', 'req', 'rows']),
			uriList = _.uniq(_.map(rows, n => `${n.chr}:${n.start.toString()}`)).join(','),
			url = `http://mupit.icm.jhu.edu/?gm=${uriList}`;

		window.open(url);
	},
	getControlWidth: function () {
		var controlWidth = ReactDOM.findDOMNode(this.refs.controls).getBoundingClientRect().width,
			labelWidth = ReactDOM.findDOMNode(this.refs.label).getBoundingClientRect().width;
		return controlWidth + labelWidth;
	},
	render: function () {
		var {id, label, samples, samplesMatched, column,
				zoom, data, datasetMeta, fieldFormat, sampleFormat, disableKM, searching, supportsGeneAverage, onClick, tooltip} = this.props,
			{width, columnLabel, fieldLabel, user} = column,
			menu = optionMenu(this.props, {onMode: this.onMode, onMuPit: this.onMuPit, supportsGeneAverage}),
			[kmDisabled, kmTitle] = disableKM(id),
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

		return (
			<div className='Column' style={{width: width, position: 'relative'}}>
				<br/>
				<SplitButton ref='controls' className='Sortable-handle' title={moveIcon} bsSize='xsmall'>
					{menu}
					{menu && <MenuItem divider />}
					<MenuItem title={kmTitle} onSelect={this.onKm} disabled={kmDisabled}>Kaplan Meier Plot</MenuItem>
					<MenuItem onSelect={this.onDownload}>Download</MenuItem>
					{aboutDatasetMenu(datasetMeta(id))}
					<MenuItem onSelect={this.onViz}>Viz Settings</MenuItem>
					<MenuItem onSelect={this.onRemove}>Remove</MenuItem>
				</SplitButton>
				<Badge ref='label' style={styles.badge} className='pull-right'>{label}</Badge>
				<br/>
				<DefaultTextInput
					onChange={this.onColumnLabel}
					value={{default: columnLabel, user: user.columnLabel}} />
				<DefaultTextInput
					onChange={this.onFieldLabel}
					value={{default: fieldLabel, user: user.fieldLabel}} />
				<div style={{height: 20}}>
					{doRefGene ?
						<RefGeneAnnotation
							width={width}
							refGene={_.values(data.refGene)[0]}
							layout={column.layout}
							position={{gene: column.fields[0]}}/> : null}
				</div>

				<ResizeOverlay
					onResizeStop={this.onResizeStop}
					width={width}
					minWidth={this.getControlWidth}
					height={zoom.height}>

					<SpreadSheetHighlight
						animate={searching}
						width={width}
						height={zoom.height}
						samples={samples.slice(zoom.index, zoom.index + zoom.count)}
						samplesMatched={samplesMatched}/>
					{widgets.column({ref: 'plot', id, column, data, zoom, samples, onClick, fieldFormat, sampleFormat, tooltip})}
				</ResizeOverlay>
				{widgets.legend({column, data})}
			</div>
		);
	}
});

module.exports = Column;
