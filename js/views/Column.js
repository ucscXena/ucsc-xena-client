/*eslint-env browser */
/*globals require: false, module: false */
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
var {RefGeneAnnotation} = require('../refGeneExons');
var SpreadSheetHighlight = require('../SpreadSheetHighlight');
var ResizeOverlay = require('./ResizeOverlay');
var widgets = require('../columnWidgets');
var aboutDatasetMenu = require('./aboutDatasetMenu');
var spinner = require('../ajax-loader.gif');
var mutationVector = require('../models/mutationVector');
var ValidatedInput = require('./ValidatedInput');
var konami = require('../konami');
var {deepPureRenderMixin} = require('../react-utils');

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

// Manually set focus to avoid triggering dropdown (close) or anchor
// (navigate) actions.
var setFocus = ev => {
	ev.preventDefault();
	ev.stopPropagation();
	ev.target.focus();
};

var stopPropagation = ev => ev.stopPropagation();

var addIdsToArr = arr => arr.map((el, id) => React.cloneElement(el, {id}));

var defaultXZoom = (refGene, type) => {
	if (_.isEmpty(refGene)) {
		return {start: 0, end: 0};
	}
	var refGeneObj = _.values(refGene)[0];
	return mutationVector.defaultXZoom(refGeneObj, type);
};

var isIntString = str => !!s.trim(str).replace(/,/g, '').match(/^[0-9]+$/);
var parseExtendedInt = str => parseInt(s.trim(str).replace(/,/g, ''), 10);

var boundIsValid = _.curry((type, refGene, str) => {
	if (_.isEmpty(refGene)) {
		return false;
	}
	if (s.trim(str) === '') {
		return true;
	}
	if (!isIntString(str)) { // must be an int if it's not empty string
		return false;
	}
	var pos = parseExtendedInt(str),
		def = defaultXZoom(refGene, type);

	return def.start <= pos && pos <= def.end;
});

function mutationMenu(props, {onMuPit, onShowIntrons, onSortVisible, xzoomable}) {
	var {column, data} = props,
		mutationClass = _.getIn(column, ['mutationClass']),
		sortVisible = column.sortVisible,
		{start, end} = _.get(column, 'xzoom',
				defaultXZoom(data.refGene, mutationClass)),
		bIV = boundIsValid(mutationClass, data.refGene),
		assembly = _.getIn(column, ['assembly']),
		valueType = _.getIn(column, ['valueType']),
		rightValueType = valueType === 'mutation',
		wrongDataSubType = mutationClass !== 'SNV',
		rightAssembly = (assembly === "hg19" || assembly === "GRCh37") ? true : false,  //MuPIT currently only support hg19
		noMenu = !rightValueType || !rightAssembly || (data && _.isEmpty(data.refGene)),
		noMuPit = noMenu || wrongDataSubType,
		noData = !_.get(data, 'req'),
		mupitItemName = noData ? 'MuPIT View (hg19) Loading' : 'MuPIT View (hg19)',
		{showIntrons = false} = column,
		sortVisibleItemName = sortVisible ? 'Sort all' : 'Sort visible',
		intronsItemName =  showIntrons ? 'Hide introns' : "Show introns";
	return noMenu ? null : addIdsToArr([
		<MenuItem disabled={noMuPit} onSelect={onMuPit}>{mupitItemName}</MenuItem>,
		<MenuItem disabled={noData} onSelect={onShowIntrons}>{intronsItemName}</MenuItem>,
		...(xzoomable ? [
			<MenuItem header style={{fontSize: '80%'}}>Start position</MenuItem>,
			<MenuItem>
				<ValidatedInput defaultValue={start} isValid={bIV} ref='start' onSelect={stopPropagation} onClick={setFocus} type='text' bsSize='small' />
			</MenuItem>,
			<MenuItem header style={{fontSize: '80%'}}>End position</MenuItem>,
			<MenuItem>
				<ValidatedInput defaultValue={end} isValid={bIV} ref='end' onSelect={stopPropagation} onClick={setFocus} type='text' bsSize='small' />
			</MenuItem>,
			<MenuItem disabled={noData} onSelect={onSortVisible}>{sortVisibleItemName}</MenuItem>] : [])
	]);
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

function getPosition(type, refGene, start, end) {
	if (_.isEmpty(refGene) || !boundIsValid(start) || !boundIsValid(end)) {
		return false;
	}
	var def = defaultXZoom(refGene, type);

	start = s.trim(start) === '' ? def.start : parseExtendedInt(start);
	end = s.trim(end) === '' ? def.end : parseExtendedInt(end);

	return (def.start <= start &&
			start <= end &&
			end <= def.end) ? {start, end} : null;
}

var Column = React.createClass({
	mixins: [deepPureRenderMixin],
	getInitialState() {
		return {xzoomable: false};
	},
	enablexzoomable() {
		this.setState({xzoomable: true});
	},
	componentWillMount() {
		var asciiA = 65;
		this.ksub = konami(asciiA).subscribe(this.enablexzoomable);
	},
	componentWillUnmount() {
		this.ksub.dispose();
	},
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
	onShowIntrons: function () {
		this.props.onShowIntrons(this.props.id);
	},
	onSortVisible: function () {
		this.props.onSortVisible(this.props.id);
	},
	onMenuToggle: function (open) {
		var {xzoomable} = this.state,
			{column: {xzoom, valueType, mutationClass}, data, onXZoom, id} = this.props;
		if (xzoomable && !open && valueType === 'mutation') {
			let start = this.refs.start.getValue(),
				end = this.refs.end.getValue(),
				refGene = _.get(data, 'refGene'),
				position = getPosition(mutationClass, refGene, start, end);

			if (position && !_.isEqual(position, xzoom)) {
				onXZoom(id, position);
			}
		}
	},
	onMuPit: function () {
		// Construct the url, which will be opened in new window
		let rows = _.getIn(this.props, ['data', 'req', 'rows']),
			// mupit server with alpha value
			SNVPs = mutationVector.SNVPvalue (rows),
			uriList = _.map(_.values(SNVPs), n => `${n.chr}:${n.start}:${1 - n.pValue}`).join(','),
			url = 'http://mupit.icm.jhu.edu/MuPIT_Interactive?gm=';
			//url = 'http://karchin-web04.icm.jhu.edu:8888/MuPIT_Interactive/?gm=';  // mupit dev server

		window.open(url + `${uriList}`);
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
			{xzoomable} = this.state,
			{width, columnLabel, fieldLabel, user} = column,
			{onMode, onMuPit, onShowIntrons, onSortVisible} = this,
			menu = optionMenu(this.props, {onMode, onMuPit, onShowIntrons, onSortVisible, supportsGeneAverage, xzoomable}),
			[kmDisabled, kmTitle] = disableKM(id),
			status = _.get(data, 'status'),
			// move this to state to generalize to other annotations.
			doRefGene = _.get(data, 'refGene'),
			sortHelp = <Tooltip>Drag to change column order</Tooltip>,
			menuHelp = <Tooltip>Column menu</Tooltip>,
			moveIcon = (
				<OverlayTrigger placement='top' overlay={sortHelp}>
					<span
						className="glyphicon glyphicon-resize-horizontal Sortable-handle"
						aria-hidden="true">
					</span>
				</OverlayTrigger>);

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
				<div style={{height: 32}}>
					{doRefGene ?
						<RefGeneAnnotation
							alternateColors={!_.getIn(column, ['showIntrons'], false)}
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
					<div style={{position: 'relative'}}>
						{widgets.column({ref: 'plot', id, column, data, index, zoom, samples, onClick, fieldFormat, sampleFormat, tooltip})}
						{getStatusView(status, this.onReload)}
					</div>
				</ResizeOverlay>
				<h5 style={{visibility: first ? 'visible' : 'hidden'}}>Legends</h5>
				{widgets.legend({column, data})}
			</div>
		);
	}
});

module.exports = Column;
