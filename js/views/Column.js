'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var s = require('underscore.string');
var DefaultTextInput = require('./DefaultTextInput');
var DragSelect = require('./DragSelect');
var SpreadSheetHighlight = require('../SpreadSheetHighlight');
var ResizeOverlay = require('./ResizeOverlay');
var widgets = require('../columnWidgets');
var aboutDatasetMenu = require('./aboutDatasetMenu');
var spinner = require('../ajax-loader.gif');
var mutationVector = require('../models/mutationVector');
//var ValidatedInput = require('./ValidatedInput');
var konami = require('../konami');
var {deepPureRenderMixin} = require('../react-utils');
var Crosshair = require('./Crosshair');
var {chromRangeFromScreen} = require('../exonLayout');
var parsePos = require('../parsePos');
var {categoryMore} = require('../colorScales');
var {publicServers} = require('../defaultServers');
import {IconMenu, MenuItem, MenuDivider} from 'react-toolbox/lib/menu';
var ColCard = require('./ColCard');

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
	}
};

// Manually set focus to avoid triggering dropdown (close) or anchor
// (navigate) actions.
/*var setFocus = ev => {
	ev.preventDefault();
	ev.stopPropagation();
	ev.target.focus();
};

var stopPropagation = ev => ev.stopPropagation();
*/

var addIdsToArr = arr => {
	var list = arr.filter(el => el).map((el, id) => React.cloneElement(el, {id}));
	return _.isEmpty(list) ? null : list;
};
var isIntString = str => !!s.trim(str).replace(/,/g, '').match(/^[0-9]+$/);
var parseExtendedInt = str => parseInt(s.trim(str).replace(/,/g, ''), 10);

var boundIsValid = _.curry((maxXZoom, str) => {
	if (!maxXZoom) {
		return false; // no data
	}
	if (s.trim(str) === '') {
		return true;
	}
	if (!isIntString(str)) { // must be an int if it's not empty string
		return false;
	}
	var pos = parseExtendedInt(str);

	return maxXZoom.start <= pos && pos <= maxXZoom.end;
});

/*function zoomMenu(props) {
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
}*/

function sortVisibleLabel(column, pos) {
	var sortVisible = _.get(column, 'sortVisible', true);

	return sortVisible ?
			(pos ? 'Sort by full region avg' : 'Sort by gene average') :
			'Sort by zoom region avg';
}

function segmentedVizOptions(onVizOptions) {
	return onVizOptions ? [
		<MenuDivider/>,
		<MenuItem onSelect={onVizOptions} data-renderer='line' caption='Line'/>,
		<MenuItem onSelect={onVizOptions} data-renderer='pixel' caption='Pixel'/>,
		<MenuItem onSelect={onVizOptions} data-renderer='power' caption='Power'/>,
		<MenuDivider/>] : [];
}

function segmentedMenu(props, {onShowIntrons, onSortVisible, onSpecialDownload, specialDownloadMenu, onVizOptions}) {
	var {column, data} = props,
		pos = parsePos(column.fields[0]), // XXX Should compute a flag for this.
		{showIntrons = false} = column,
		noData = !_.get(data, 'req'),
		sortVisibleItemName = sortVisibleLabel(column, pos),
		intronsItemName =  showIntrons ? 'Hide introns' : "Show introns",
		specialDownloadItemName = 'Download segments';
	return addIdsToArr([
		...(pos ? [] : [<MenuItem disabled={noData} onClick={onShowIntrons} caption={intronsItemName}/>]),
		...(segmentedVizOptions(onVizOptions)),
		//...(xzoomable ? zoomMenu(props, {onSortVisible}) : []),
		<MenuItem disabled={noData} onClick={onSortVisible} caption={sortVisibleItemName}/>,
		specialDownloadMenu ?
			<MenuItem disabled={noData} onClick={onSpecialDownload} caption={specialDownloadItemName}/>
			: <span/>
	]);
}

function mutationMenu(props, {onMuPit, onShowIntrons, onSortVisible}) {
	var {column, data} = props,
		{valueType, sortVisible, assembly, showIntrons = false} = column,
		rightValueType = valueType === 'mutation',
		wrongDataSubType = column.fieldType !== 'mutation',
		rightAssembly = (assembly === "hg19" || assembly === "GRCh37") ? true : false,  //MuPIT currently only support hg19
		noMenu = !rightValueType || !rightAssembly,
		noMuPit = noMenu || wrongDataSubType,
		noData = !_.get(data, 'req'),
		mupitItemName = noData ? 'MuPIT View (hg19 coding) Loading' : 'MuPIT View (hg19 coding)',
		sortVisibleItemName = sortVisible ? 'Sort using full region' : 'Sort using zoom region',
		intronsItemName =  showIntrons ? 'Hide introns' : "Show introns";
	return addIdsToArr([
		(data && _.isEmpty(data.refGene)) ? null : <MenuItem disabled={noMuPit} onClick={onMuPit} caption={mupitItemName}/>,
		(data && _.isEmpty(data.refGene)) ? null : <MenuItem disabled={noData} onClick={onShowIntrons} caption={intronsItemName}/>,
		//...(xzoomable ? zoomMenu(props, {onSortVisible}) : []),
		<MenuItem disabled={noData} onClick={onSortVisible} caption={sortVisibleItemName}/>
	]);
}

function supportsTumorMap({fieldType, fields, cohort, fieldSpecs}) {
	// link to tumorMap from any public xena hub columns
	// data be queried directly from xena
	var foundHub = _.any(fieldSpecs, obj => {
		if (obj.dsID) {
			return publicServers.indexOf(JSON.parse(obj.dsID).host) !== -1;
		} else {
			return false;
		}
	});
	var foundCohort = _.any(cohort, c => (c.name.search(/^TCGA/) !== -1));

	return foundCohort && foundHub &&
		(['geneProbes', 'genes', 'probes', 'clinical'].indexOf(fieldType) !== -1 && fields.length === 1);
}

function matrixMenu(props, {onTumorMap, supportsGeneAverage, onMode, onSpecialDownload, specialDownloadMenu}) {
	var {id, cohort, column: {fieldType, noGeneDetail, valueType, fields, fieldSpecs}} = props,
		wrongDataType = valueType !== 'coded',
		specialDownloadItemName = 'Download sample lists (json)';

	return addIdsToArr ([
		supportsGeneAverage(id) ?
			(fieldType === 'genes' ?
				<MenuItem title={noGeneDetail ? 'no common probemap' : ''}
					disabled={noGeneDetail} onClick={(e) => onMode(e, 'geneProbes')} caption='Detailed view'/> :
				<MenuItem onClick={(e) => onMode(e, 'genes')} caption='Gene average'/>)
				: null,
		supportsTumorMap({fieldType, fields, cohort, fieldSpecs}) ?
			<MenuItem onClick={onTumorMap} caption='TumorMap (TCGA Pancan)'/>
			: null,
		(specialDownloadMenu && !wrongDataType) ?
			<MenuItem onClick={onSpecialDownload} caption={specialDownloadItemName}/>
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
//var columnsXZoomable = false;
var specialDownloadMenu = false;
if (process.env.NODE_ENV !== 'production') {
//	columnsXZoomable = true;
	specialDownloadMenu = true;
}

var Column = React.createClass({
	mixins: [deepPureRenderMixin],
	getInitialState() {
		return {
//			xzoomable: columnsXZoomable,
			specialDownloadMenu: specialDownloadMenu
		};
	},
	enableHiddenFeatures() {
//		columnsXZoomable = true;
		specialDownloadMenu = true;
//		this.setState({xzoomable: true});
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
	onEdit: function () {
		this.props.onEdit(this.props.id);
	},
	onKm: function () {
		this.props.onKm(this.props.id);
	},
	onSortDirection: function () {
		var newDir = _.get(this.props.column, 'sortDirection', 'forward') === 'forward' ?
			'reverse' : 'forward';
		this.props.onSortDirection(this.props.id, newDir);
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
			url = 'http://mupit.icm.jhu.edu/MuPIT_Interactive?gm=';
			//url = 'http://karchin-web04.icm.jhu.edu:8888/MuPIT_Interactive/?gm=';  // mupit dev server
		window.open(url + `${uriList}`);
	},

	onTumorMap: function () {
		// TumorMap/Xena API https://tumormap.ucsc.edu/query/addAttributeXena.html
		// the only connection we have here is on the pancanAtlas data, and currently all categorical data there are using
		var fieldSpecs = _.getIn(this.props, ['column', 'fieldSpecs']),
			valueType = _.getIn(this.props, ['column', 'valueType']),
			datasetMeta = _.getIn(this.props, ['datasetMeta']),
			columnid = _.getIn(this.props, ['id']),
			map = "PancanAtlas/XenaPancanAtlas",
			layout = 'mRNA',
			url = "https://tumormap.ucsc.edu/?xena=addAttr&p=" + map + "&layout=" + layout,
			customColor = {};

		_.map(fieldSpecs, spec => {
			var ds = JSON.parse(spec.dsID),
				hub = ds.host,
				dataset = ds.name,
				feature = spec.fields[0];

			customColor = _.extend(customColor, datasetMeta(columnid).metadata(spec.dsID).customcolor);

			url = url + "&hub=" + hub + "/data/";
			url = url + "&dataset=" + dataset;
			url = url + "&attr=" + feature;
		});

		if (valueType === "coded") {
			var codes = _.getIn(this.props, ['data', 'codes']),
				cat, colorhex,
				colors = _.isEmpty(customColor) ? categoryMore : customColor;

			_.map(codes, (code, i) =>{
				cat = code;
				colorhex = colors[i % colors.length];
				colorhex = colorhex.slice(1, colorhex.length);
				url = url + "&cat=" + encodeURIComponent(cat);
				url = url + "&color=" + colorhex;
			});
		}

		window.open(url);
	},
	onReload: function () {
		this.props.onReload(this.props.id);
	},
	getControlWidth: function () {
		return 73; //236; // Matches min possible width of new (filter) column (see Application.js)
	},
	render: function () {
		var {first, id, label, samples, samplesMatched, column, index,
				zoom, data, datasetMeta, fieldFormat, sampleFormat, disableKM, searching,
				supportsGeneAverage, onClick, tooltip, wizardMode, onReset} = this.props,
			{specialDownloadMenu} = this.state,
			{width, columnLabel, fieldLabel, user} = column,
			{onMode, onTumorMap, onMuPit, onShowIntrons, onSortVisible, onSpecialDownload} = this,
			menu = optionMenu(this.props, {onMode, onMuPit, onTumorMap, onShowIntrons, onSortVisible,
				onSpecialDownload, supportsGeneAverage, specialDownloadMenu}),
			[kmDisabled, kmTitle] = disableKM(id),
			status = _.get(data, 'status'),
			moveIcon = (<i className='Sortable-handle material-icons'>drag_handle</i>),
			annotation = widgets.annotation({
				fields: column.fields,
				refGene: _.values(_.get(data, 'refGene', {}))[0],
				layout: column.layout,
				width,
				alternateColors: !_.getIn(column, ['showIntrons'], false)}),
			refreshIcon = (<i className='material-icons' onClick={onReset}>close</i>);

		// FF 'button' tag will not emit 'mouseenter' events (needed for
		// tooltips) for children. We must use a different tag, e.g. 'label'.
		// Button and Dropdown.Toggle will allow overriding the tag.  However
		// Splitbutton will not pass props down to the underlying Button, so we
		// can't use Splitbutton.
		return (
			<div style={{width: width}}>
				<ColCard colId={label}
						 title={<DefaultTextInput
							disabled={wizardMode}
							onChange={this.onColumnLabel}
							value={{default: columnLabel, user: user.columnLabel}} />}
						subtitle={<DefaultTextInput
							disabled={wizardMode}
							onChange={this.onFieldLabel}
							value={{default: fieldLabel, user: user.fieldLabel}} />}
						controls={wizardMode ? (first ? refreshIcon : null) :
							<div>
								{first ? null : moveIcon}
								<IconMenu icon='more_vert' menuRipple iconRipple={false}>
									{menu}
									{menu && <MenuDivider />}
									<MenuItem title={kmTitle} onClick={this.onKm} disabled={kmDisabled}
											  caption='Kaplan Meier Plot'/>
									<MenuItem onClick={this.onSortDirection} caption='Reverse sort'/>
									<MenuItem onClick={this.onDownload} caption='Download'/>
									{aboutDatasetMenu(datasetMeta(id))}
									<MenuItem onClick={this.onViz} caption='Display Setting'/>
									<MenuItem disabled={!this.props.onEdit} onClick={this.onEdit} caption='Edit'/>
									<MenuItem onClick={this.onRemove} caption='Remove'/>
								</IconMenu>
							</div>
						}>
					<Crosshair frozen={wizardMode}>
						<div style={{height: 32}}>
							{annotation ?
								<DragSelect enabled={!wizardMode} onClick={this.onXZoomOut} onSelect={this.onXDragZoom}>
									{annotation}
								</DragSelect> : null}
						</div>
					</Crosshair>
					<ResizeOverlay
						enable={!wizardMode}
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
							<Crosshair frozen={wizardMode || this.props.frozen}>
								{widgets.column({ref: 'plot', id, column, data, index, zoom, samples, onClick, fieldFormat, sampleFormat, tooltip})}
								{getStatusView(status, this.onReload)}
							</Crosshair>
						</div>
					</ResizeOverlay>
				</ColCard>
				{widgets.legend({column, data})}
			</div>
		);
	}
});

module.exports = Column;
