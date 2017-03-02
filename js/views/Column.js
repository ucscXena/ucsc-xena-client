'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('../underscore_ext');
var s = require('underscore.string');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var Dropdown = require('react-bootstrap/lib/Dropdown');
var Button = require('react-bootstrap/lib/Button');
var Badge = require('react-bootstrap/lib/Badge');
var Tooltip = require('react-bootstrap/lib/Tooltip');
var OverlayTrigger = require('react-bootstrap/lib/OverlayTrigger');
var DefaultTextInput = require('./DefaultTextInput');
var DragSelect = require('./DragSelect');
var SpreadSheetHighlight = require('../SpreadSheetHighlight');
var ResizeOverlay = require('./ResizeOverlay');
var widgets = require('../columnWidgets');
var aboutDatasetMenu = require('./aboutDatasetMenu');
var spinner = require('../ajax-loader.gif');
var mutationVector = require('../models/mutationVector');
var ValidatedInput = require('./ValidatedInput');
var konami = require('../konami');
var {deepPureRenderMixin} = require('../react-utils');
var Crosshair = require('./Crosshair');
var {chromRangeFromScreen} = require('../exonLayout');
var parsePos = require('../parsePos');
var Rx = require("rx");

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
function downloadJSON(downloadData) {
	// use blob for bug in chrome: https://code.google.com/p/chromium/issues/detail?id=373182
	var url = URL.createObjectURL(new Blob([JSON.stringify(downloadData/*, undefined, 4*/)], { type: 'text/json' }));
	var a = document.createElement('a');
	var filename = 'xenaDownload.json';
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
	},
	status: {
		pointerEvents: 'none',
		textAlign: 'center',
		zIndex: 1,
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
		backgroundColor: 'rgba(255, 255, 255, 0.6)'
	},
	error: {
		textAlign: 'center',
		pointerEvents: 'all',
		cursor: 'pointer'
	},
	columnMenuToggle: {
		position: 'absolute',
		left: 0,
		top: 0,
		width: '100%',
		height: '100%'
	}
};

var uiHelp = {
	'refGene': ['top', 'Drag zoom. Shift-click zoom out.']
};

function addHelp(id, target) {
	var [placement, text] = uiHelp[id],
		tooltip = <Tooltip>{text}</Tooltip>;
	return (
		<OverlayTrigger trigger={['hover']} key={id} placement={placement} overlay={tooltip}>
			{target}
		</OverlayTrigger>);
}

// Manually set focus to avoid triggering dropdown (close) or anchor
// (navigate) actions.
var setFocus = ev => {
	ev.preventDefault();
	ev.stopPropagation();
	ev.target.focus();
};

var stopPropagation = ev => ev.stopPropagation();

var addIdsToArr = arr => {
	var list = arr.filter(el => el).map((el, id) => React.cloneElement(el, {id}));
	return _.isEmpty(list) ? null : list;
};
var isIntString = str => !!s.trim(str).replace(/,/g, '').match(/^[0-9]+$/);
var parseExtendedInt = str => parseInt(s.trim(str).replace(/,/g, ''), 10);

var boundIsValid = _.curry((maxXZoom, str) => {
	if (s.trim(str) === '') {
		return true;
	}
	if (!isIntString(str)) { // must be an int if it's not empty string
		return false;
	}
	var pos = parseExtendedInt(str);

	return maxXZoom.start <= pos && pos <= maxXZoom.end;
});

function zoomMenu(props) {
	var {column} = props,
		{xzoom, maxXZoom, assembly} = column,
		{start, end} = xzoom || maxXZoom || {start: 0, end: 0},
		bIV = boundIsValid(maxXZoom);
	return [
		<MenuItem header style={{fontSize: '80%'}}>Start position ( {assembly} )</MenuItem>,
		<MenuItem>
			<ValidatedInput defaultValue={start} isValid={bIV} ref='start' onSelect={stopPropagation} onClick={setFocus} type='text' bsSize='small' />
		</MenuItem>,
		<MenuItem header style={{fontSize: '80%'}}>End position ( {assembly} )</MenuItem>,
		<MenuItem>
			<ValidatedInput defaultValue={end} isValid={bIV} ref='end' onSelect={stopPropagation} onClick={setFocus} type='text' bsSize='small' />
		</MenuItem>];
}

function sortVisibleLabel(column, pos) {
	var sortVisible = _.get(column, 'sortVisible', true);

	return sortVisible ?
			(pos ? 'Sort by full region avg' : 'Sort by gene average') :
			'Sort by zoom region avg';
}

function segmentedVizOptions(onVizOptions) {
	return onVizOptions ? [
		<MenuItem divider />,
		<MenuItem onSelect={onVizOptions} data-renderer='line'>Line</MenuItem>,
		<MenuItem onSelect={onVizOptions} data-renderer='pixel'>Pixel</MenuItem>,
		<MenuItem onSelect={onVizOptions} data-renderer='power'>Power</MenuItem>,
		<MenuItem divider />] : [];
}

function segmentedMenu(props, {onShowIntrons, onSortVisible, onSpecialDownload, xzoomable, specialDownloadMenu, onVizOptions}) {
	var {column, data} = props,
		pos = parsePos(column.fields[0]), // XXX Should compute a flag for this.
		{showIntrons = false} = column,
		noData = !_.get(data, 'req'),
		sortVisibleItemName = sortVisibleLabel(column, pos),
		intronsItemName =  showIntrons ? 'Hide introns' : "Show introns",
		specialDownloadItemName = 'Download segments';
	return addIdsToArr([
		...(pos ? [] : [<MenuItem disabled={noData} onSelect={onShowIntrons}>{intronsItemName}</MenuItem>]),
		...(segmentedVizOptions(onVizOptions)),
		...(xzoomable ? zoomMenu(props, {onSortVisible}) : []),
		<MenuItem disabled={noData} onSelect={onSortVisible}>{sortVisibleItemName}</MenuItem>,
		specialDownloadMenu ?
			<MenuItem disabled={noData} onSelect={onSpecialDownload}>{specialDownloadItemName}</MenuItem>
			: <span/>
	]);
}

function mutationMenu(props, {onMuPit, onShowIntrons, onSortVisible, xzoomable}) {
	var {column, data} = props,
		{valueType, sortVisible, assembly, showIntrons = false} = column,
		rightValueType = valueType === 'mutation',
		wrongDataSubType = column.fieldType !== 'mutation',
		rightAssembly = (assembly === "hg19" || assembly === "GRCh37") ? true : false,  //MuPIT currently only support hg19
		noMenu = !rightValueType || !rightAssembly || (data && _.isEmpty(data.refGene)),
		noMuPit = noMenu || wrongDataSubType,
		noData = !_.get(data, 'req'),
		mupitItemName = noData ? 'MuPIT View (hg19) Loading' : 'MuPIT View (hg19 coding)',
		sortVisibleItemName = sortVisible ? 'Sort gene' : 'Sort region',
		intronsItemName =  showIntrons ? 'Hide introns' : "Show introns";

	return addIdsToArr([
		<MenuItem disabled={noMuPit} onSelect={onMuPit}>{mupitItemName}</MenuItem>,
		<MenuItem disabled={noData} onSelect={onShowIntrons}>{intronsItemName}</MenuItem>,
		...(xzoomable ? zoomMenu(props, {onSortVisible}) : []),
		<MenuItem disabled={noData} onSelect={onSortVisible}>{sortVisibleItemName}</MenuItem>
	]);
}

function matrixMenu(props, {supportsGeneAverage, onMode, onSpecialDownload, specialDownloadMenu}) {
	var {id, column: {fieldType, noGeneDetail, valueType}} = props,
		wrongDataType = valueType !== 'coded',
		specialDownloadItemName = 'Download sample lists (json)';

	return addIdsToArr ([
		supportsGeneAverage(id) ?
			(fieldType === 'genes' ?
				<MenuItem eventKey="geneProbes" title={noGeneDetail ? 'no common probemap' : ''}
					disabled={noGeneDetail} onSelect={onMode}>Detailed view</MenuItem> :
				<MenuItem eventKey="genes" onSelect={onMode}>Gene average</MenuItem>) :
		null,
		(specialDownloadMenu && !wrongDataType) ?
			<MenuItem onSelect={onSpecialDownload}>{specialDownloadItemName}</MenuItem>
			: null
	]);
}

// We could try to drive this from the column widgets, but it gets rather complex making
// the widgets care about a menu in their container.
function optionMenu(props, opts) {
	var {column: {valueType}} = props;
	return (valueType === 'mutation' ?  mutationMenu :
			(valueType === 'segmented' ? segmentedMenu : matrixMenu))(props, opts);
}

function getStatusView(status, onReload) {
	if (status === 'loading') {
		return (
			<div style={styles.status}>
				<img style={{textAlign: 'center'}} src={spinner}/>
			</div>);
	}
	if (status === 'error') {
		return (
			<div style={styles.status}>
				<span
					onClick={onReload}
					title='Error loading data. Click to reload.'
					style={styles.error}
					className='glyphicon glyphicon-warning-sign Sortable-handle'
					aria-hidden='true'/>
			</div>);
	}
	return null;
}

function getPosition(maxXZoom, pStart, pEnd) {
	if (!boundIsValid(maxXZoom, pStart) || !boundIsValid(maxXZoom, pEnd)) {
		return false;
	}
	var [start, end] = pStart < pEnd ? [pStart, pEnd] : [pEnd, pStart];

	start = s.trim(start) === '' ? maxXZoom.start : parseExtendedInt(start);
	end = s.trim(end) === '' ? maxXZoom.end : parseExtendedInt(end);

	return (maxXZoom.start <= start &&
			start <= end &&
			end <= maxXZoom.end) ? {start, end} : null;
}

// Persistent state for xzoomable setting.
var columnsXZoomable = false;
var specialDownloadMenu = false;
if (process.env.NODE_ENV !== 'production') {
	columnsXZoomable = true;
	specialDownloadMenu = true;
}

var Column = React.createClass({
	mixins: [deepPureRenderMixin],
	getInitialState() {
		return {
			xzoomable: columnsXZoomable,
			specialDownloadMenu: specialDownloadMenu
		};
	},
	enableHiddenFeatures() {
		columnsXZoomable = true;
		specialDownloadMenu = true;
		this.setState({xzoomable: true});
		this.setState({specialDownloadMenu: true});
	},
	componentWillMount() {
		var asciiA = 65;
		this.ksub = konami(asciiA).subscribe(this.enableHiddenFeatures);
	},
	componentWillUnmount() {
		this.ksub.unsubscribe();
	},
	onResizeStop: function (size) {
		this.props.onResize(this.props.id, size);
	},
	onRemove: function () {
		this.props.onRemove(this.props.id);
	},
	onDownload: function () {
		var {column, data, samples, index, sampleFormat} = this.props;
		download(widgets.download({column, data, samples, index: index, sampleFormat}));
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
	onShowIntrons: function () {
		this.props.onShowIntrons(this.props.id);
	},
	onSortVisible: function () {
		var {id, column} = this.props;
		var value = _.get(column, 'sortVisible',
				column.valueType === 'segmented' ? true : false);
		this.props.onSortVisible(id, !value);
	},
	onSpecialDownload: function () {
		var {column, data, samples, index, sampleFormat} = this.props,
			{type, downloadData} = widgets.specialDownload({column, data, samples, index: index, sampleFormat});
		if (type === "txt") {
			download(downloadData);
		} else if(type === "json") {
			downloadJSON(downloadData);
		}
	},
	onXZoomOut: function (ev) {
		if (ev.shiftKey) {
			let {id, column: {maxXZoom}, onXZoom} = this.props,
				position = getPosition(maxXZoom, '', '');
			onXZoom(id, position);
		}
	},
	onXDragZoom: function (pos) {
		var {column: {layout}, onXZoom, id} = this.props,
			[start, end] = chromRangeFromScreen(layout, pos.start, pos.end);

		onXZoom(id, {start, end});
	},
	onMenuToggle: function (open) {
		var {xzoomable} = this.state,
			{column: {xzoom, maxXZoom, valueType}, onXZoom, id} = this.props;
		if (xzoomable && !open && ['mutation', 'segmented'].indexOf(valueType) !== -1) {
			let start = this.refs.start.getValue(),
				end = this.refs.end.getValue(),
				position = getPosition(maxXZoom, start, end);

			if (position && !_.isEqual(position, xzoom)) {
				onXZoom(id, position);
			}
		}
	},
	onMuPit: function () {
		// Construct the url, which will be opened in new window
		// total = newRows.length,
		// k fixed at 1000
		// gene, protein, etc size is fixed at 1000
		// this could be actual size of protein or gene, but it is complicated due to mutations could be from exon region and display could be genomics region
		// for the same gene it is a constant, does it really matter to be different between genes?

		let total = _.getIn(this.props, ['data', 'req', 'rows']).length, //length of all variants
			k = 1000,
			nodes = _.getIn(this.props, ['column', 'nodes']),
			variants = [...(new Set(_.pluck(nodes, 'data')))], //only variants in view
			SNVPs = mutationVector.SNVPvalue(variants, total, k),
			uriList = _.map(_.values(SNVPs), n => `${n.chr}:${n.start}:${1 - n.pValue}`).join(','),
			url = 'http://mupit.icm.jhu.edu/MuPIT_Interactive?gm=',
			label = _.getIn(this.props, ['column', 'user', 'fieldLabel']),
			/*
			http://karchin-web02.icm.jhu.edu/MuPIT_Interactive/rest/showstructure/check?pos=chr1:69094
			"chr1:69094" should be changed to a coordinate that you want to know the presence of any MuPIT mapping on. The result will be a JSON-format string, in the form of
			{"hit":true,"status":"normal"}
			*/
			checkStrUrl = 'http://karchin-web02.icm.jhu.edu/MuPIT_Interactive/rest/showstructure/check?pos=', // mupit dev server to check structure
			newRows = _.uniq(_.map(variants, n => `${n.chr}:${n.start}`));

		Rx.Observable.zipArray(_.map(newRows, key => Rx.DOM.get(checkStrUrl + key))).subscribe( x => {
			if (_.some(x, xhr => JSON.parse(xhr.response).hit)) {
				window.open(url + `${uriList}`);
			} else {
				alert(label + ": No 3D structure found for any of the genomic locations shown in the horizontal view.\n");
			}
		});
	},
	onReload: function () {
		this.props.onReload(this.props.id);
	},
	getControlWidth: function () {
		var controlWidth = ReactDOM.findDOMNode(this.refs.controls).getBoundingClientRect().width,
			labelWidth = ReactDOM.findDOMNode(this.refs.label).getBoundingClientRect().width;
		return controlWidth + labelWidth;
	},
	render: function () {
		var {first, id, label, samples, samplesMatched, column, index,
				zoom, data, datasetMeta, fieldFormat, sampleFormat, disableKM, searching, supportsGeneAverage, onClick, tooltip} = this.props,
			{xzoomable, specialDownloadMenu} = this.state,
			{width, columnLabel, fieldLabel, user} = column,
			{onMode, onMuPit, onShowIntrons, onSortVisible, onSpecialDownload} = this,
			menu = optionMenu(this.props, {onMode, onMuPit, onShowIntrons, onSortVisible, onSpecialDownload, supportsGeneAverage, xzoomable, specialDownloadMenu}),
			[kmDisabled, kmTitle] = disableKM(id),
			status = _.get(data, 'status'),
			// move this to state to generalize to other annotations.
			sortHelp = <Tooltip>Drag to change column order</Tooltip>,
			menuHelp = <Tooltip>Column menu</Tooltip>,
			moveIcon = (
				<OverlayTrigger placement='top' overlay={sortHelp}>
					<span
						className="glyphicon glyphicon-resize-horizontal Sortable-handle"
						aria-hidden="true">
					</span>
				</OverlayTrigger>),
			annotation = widgets.annotation({
				fields: column.fields,
				refGene: _.values(data.refGene)[0],
				layout: column.layout,
				width,
				alternateColors: !_.getIn(column, ['showIntrons'], false)});

		// FF 'button' tag will not emit 'mouseenter' events (needed for
		// tooltips) for children. We must use a different tag, e.g. 'label'.
		// Button and Dropdown.Toggle will allow overriding the tag.  However
		// Splitbutton will not pass props down to the underlying Button, so we
		// can't use Splitbutton.
		return (
			<div className='Column' style={{width: width, position: 'relative'}}>
				<br/>
				{/* Using Dropdown instead of SplitButton so we can put a Tooltip on the caret. :-p */}
				<Dropdown onToggle={this.onMenuToggle} ref='controls' bsSize='xsmall'>
					<Button componentClass='label'>
						{moveIcon}
					</Button>
					{/* If OverlayTrigger contains Dropdown.Toggle, the toggle doesn't work. So we invert the nesting and use a span to cover the trigger area. */}
					<Dropdown.Toggle componentClass='label'>
						<OverlayTrigger placement='top' overlay={menuHelp}>
							<span style={styles.columnMenuToggle}></span>
						</OverlayTrigger>
					</Dropdown.Toggle>
					<Dropdown.Menu>
						{menu}
						{menu && <MenuItem divider />}
						<MenuItem title={kmTitle} onSelect={this.onKm} disabled={kmDisabled}>Kaplan Meier Plot</MenuItem>
						<MenuItem onSelect={this.onDownload}>Download</MenuItem>
						{aboutDatasetMenu(datasetMeta(id))}
						<MenuItem onSelect={this.onViz}>Viz Settings</MenuItem>
						<MenuItem onSelect={this.onRemove}>Remove</MenuItem>
					</Dropdown.Menu>
				</Dropdown>
				<Badge ref='label' style={styles.badge} className='pull-right'>{label}</Badge>
				<br/>
				<DefaultTextInput
					onChange={this.onColumnLabel}
					value={{default: columnLabel, user: user.columnLabel}} />
				<DefaultTextInput
					onChange={this.onFieldLabel}
					value={{default: fieldLabel, user: user.fieldLabel}} />
				<Crosshair>
					<div style={{height: 32}}>
						{annotation ? addHelp('refGene',
							<DragSelect enabled={true} onClick={this.onXZoomOut} onSelect={this.onXDragZoom}>
									{annotation}
							</DragSelect>) : null}
					</div>
				</Crosshair>

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
					<div style={{position: 'relative'}}>
						<Crosshair frozen={this.props.frozen}>
							{widgets.column({ref: 'plot', id, column, data, index, zoom, samples, onClick, fieldFormat, sampleFormat, tooltip})}
							{getStatusView(status, this.onReload)}
						</Crosshair>
					</div>
				</ResizeOverlay>
				<h5 style={{visibility: first ? 'visible' : 'hidden'}}>Legends</h5>
				{widgets.legend({column, data})}
			</div>
		);
	}
});

module.exports = Column;
