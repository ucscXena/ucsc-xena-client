'use strict';

var React = require('react');
var _ = require('../underscore_ext');
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
var {ChromPosition} = require('../ChromPosition');
var {RefGeneAnnotation} = require('../refGeneExons');

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
var annotationHeight = 30,
	scaleHeight = 12;

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
var isIntString = str => !!str.trim().replace(/,/g, '').match(/^[0-9]+$/);
var parseExtendedInt = str => parseInt(str.trim().replace(/,/g, ''), 10);

var boundIsValid = _.curry((maxXZoom, str) => {
	if (!maxXZoom) {
		return false; // no data
	}
	if (str.trim() === '') {
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
		pos = parsePos(column.fields[0]),
		{valueType, sortVisible, assembly, showIntrons = false} = column,
		rightValueType = valueType === 'mutation',
		wrongDataSubType = column.fieldType !== 'mutation',
		rightAssembly = (["hg19", "hg38", "GRCh37", "GRCh38"].indexOf(assembly) !== -1) ? true : false,  //MuPIT support hg19, hg38
		noMenu = !rightValueType || !rightAssembly,
		noMuPit = noMenu || wrongDataSubType,
		noData = !_.get(data, 'req'),
		mupitItemName = noData ? 'MuPIT 3D Loading' : 'MuPIT 3D (' + assembly + ' coding)',
		sortVisibleItemName = sortVisible ? 'Sort using full region' : 'Sort using zoom region',
		intronsItemName =  showIntrons ? 'Hide introns' : "Show introns";

	return addIdsToArr([
		(data && _.isEmpty(data.refGene)) ? null : <MenuItem disabled={noMuPit} onClick={(e) => onMuPit(assembly, e)} caption={mupitItemName}/>,
		pos ? null : <MenuItem disabled={noData} onClick={onShowIntrons} caption={intronsItemName}/>,
		//...(xzoomable ? zoomMenu(props, {onSortVisible}) : []),
		<MenuItem disabled={noData} onClick={onSortVisible} caption={sortVisibleItemName}/>
	]);
}

function supportsTumorMap({fieldType, fields, cohort, fieldSpecs}) {
	// link to tumorMap from any public xena hub columns
	// data be queried directly from xena
	var foundPublicHub = _.any(fieldSpecs, obj => {
		if (obj.dsID) {
			return publicServers.indexOf(JSON.parse(obj.dsID).host) !== -1;
		} else {
			return false;
		}
	});

	var foundCohort = cohort.name.search(/^TCGA/) !== -1 || cohort.name === "Treehouse public expression dataset (July 2017)" ? cohort : undefined;

	if (!foundCohort || !foundPublicHub || (['geneProbes', 'genes', 'probes', 'clinical'].indexOf(fieldType) === -1 ||
		_.any(fieldSpecs, obj => obj.fetchType === "signature")  || fields.length !== 1)) {
		return null;
	}

	if (foundCohort.name === "Treehouse public expression dataset (July 2017)" ) {
		return {
			label: "Treehouse",
			map: "Treehouse/THPED_July2017",
			layout: ""
		};
	} else if (foundCohort.name.search(/^TCGA/) !== -1) {
		return {
			label: "TCGA Pancan Atlas",
			map: "PancanAtlas/SampleMap",
			layout: "mRNA"
		};
	} else {
		return null;
	}
}

// Maybe put in a selector.
function supportsGeneAverage(column) {
	var {fieldType, fields, fieldList} = column;
	return ['geneProbes', 'genes'].indexOf(fieldType) >= 0 && (fieldList || fields).length === 1;
}

function matrixMenu(props, {onTumorMap, onMode, onSpecialDownload, specialDownloadMenu}) {
	var {cohort, column} = props,
		{fieldType, noGeneDetail, valueType, fields, fieldSpecs} = column,
		tumorMapCohort = supportsTumorMap({fieldType, fields, cohort, fieldSpecs}),
		wrongDataType = valueType !== 'coded',
		specialDownloadItemName = 'Download sample lists (json)';

	return addIdsToArr ([
		supportsGeneAverage(column) ?
			(fieldType === 'genes' ?
				<MenuItem title={noGeneDetail ? 'no common probemap' : ''}
					disabled={noGeneDetail} onClick={(e) => onMode(e, 'geneProbes')} caption='Detailed view'/> :
				<MenuItem onClick={(e) => onMode(e, 'genes')} caption='Gene average'/>)
				: null,
		tumorMapCohort ?
			<MenuItem onClick={(e) => onTumorMap(tumorMapCohort, e)} caption={`TumorMap (${tumorMapCohort.label})`}/>
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
			<div data-xena='loading' style={styles.status}>
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
					className='glyphicon glyphicon-warning-sign'
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

	start = start.trim() === '' ? maxXZoom.start : parseExtendedInt(start);
	end = end.trim() === '' ? maxXZoom.end : parseExtendedInt(end);

	return (maxXZoom.start <= start &&
			start <= end &&
			end <= maxXZoom.end) ? {start, end} : null;
}

var specialDownloadMenu = false;
//var annotationHelpText =  'Drag zoom. Shift-click zoom out.';

if (process.env.NODE_ENV !== 'production') {
	specialDownloadMenu = true;
}

// For geneProbes we will average across probes to compute KM. For
// other types, we can't support multiple fields.
function disableKM(column, hasSurvival) {
	if (!hasSurvival) {
		return [true, 'No survival data for cohort'];
	}
	// XXX need to refactor column.fields & column.fieldList
	if ((column.fieldList || column.fields).length > 1) {
		return [true, 'Unsupported for multiple genes/ids'];
	}
	return [false, ''];
}

var Column = React.createClass({
	mixins: [deepPureRenderMixin],

	getInitialState() {
		return {
			specialDownloadMenu: specialDownloadMenu
		};
	},

//	addAnnotationHelp(target) {
//		var tooltip = (
//			<Tooltip>
//				{annotationHelpText}
//			</Tooltip>
//		);
//		return (
//			<OverlayTrigger trigger={['hover']} placement='top' overlay={tooltip}>
//				{target}
//			</OverlayTrigger>);
//	},
	enableHiddenFeatures() {
		specialDownloadMenu = true;
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
	onMuPit: function (assembly) {
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
			mupitUrl = {
				"hg19": 'http://hg19.cravat.us/MuPIT_Interactive?gm=', // mupit hg19 server
				"GRCh37": 'http://hg19.cravat.us/MuPIT_Interactive?gm=', // mupit hg19 server
				"hg38": 'http://mupit.icm.jhu.edu/MuPIT_Interactive?gm=', //mupit hg38 server
				"GRCh38": 'http://mupit.icm.jhu.edu/MuPIT_Interactive?gm=' //mupit hg38 server
			},
			url = mupitUrl[assembly];

		window.open(url + `${uriList}`);
	},

	onTumorMap: function (tumorMap) {
		// TumorMap/Xena API https://tumormap.ucsc.edu/query/addAttributeXena.html
		// only use spec of the first cohort (in the context of composite cohort)
		var fieldSpecs = _.getIn(this.props, ['column', 'fieldSpecs', 0]),
			data = _.getIn(this.props, ['data']),
			valueType = _.getIn(this.props, ['column', 'valueType']),
			fieldType = _.getIn(this.props, ['column', 'fieldType']),
			url = "https://tumormap.ucsc.edu/?xena=addAttr&p=" + tumorMap.map + "&layout=" + tumorMap.layout,
			customColor = this.column.dataset.customcolor;

		var ds = JSON.parse(fieldSpecs.dsID),
			hub = ds.host,
			dataset = ds.name,
			feature = (fieldType !== "geneProbes") ? fieldSpecs.fields[0] : _.getIn(data, ['req', 'probes', 0]);

		customColor = _.extend(customColor, );

		url = url + "&hub=" + hub + "/data/";
		url = url + "&dataset=" + dataset;
		url = url + "&attr=" + feature;

		if (valueType === "coded") {
			var codes = _.getIn(data, ['codes']),
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
		return 90;
//		return 136;
	},
	onAbout(ev) {
		ev.preventDefault();
		var {host, dataset} = ev.target.parentElement.dataset;
		this.props.onAbout(host, dataset);
	},
	render: function () {
		var {first, id, label, samples, samplesMatched, column, index,
				zoom, data, fieldFormat, sampleFormat, hasSurvival, searching,
				onClick, tooltip, wizardMode, onReset,
				interactive, append} = this.props,
			{specialDownloadMenu} = this.state,
			{width, dataset, columnLabel, fieldLabel, user} = column,
			{onMode, onTumorMap, onMuPit, onShowIntrons, onSortVisible, onSpecialDownload} = this,
			menu = optionMenu(this.props, {onMode, onMuPit, onTumorMap, onShowIntrons, onSortVisible,
				onSpecialDownload, specialDownloadMenu}),
			[kmDisabled, kmTitle] = disableKM(column, hasSurvival),
			status = _.get(data, 'status'),
			refreshIcon = (<i className='material-icons' onClick={onReset}>close</i>),
			// move this to state to generalize to other annotations.
			annotation = (['segmented', 'mutation', 'SV'].indexOf(column.fieldType) !== -1) ?
				<RefGeneAnnotation
					column={column}
					position={_.getIn(column, ['layout', 'chrom', 0])}
					refGene={_.getIn(data, ['refGene'], {})}
					tooltip={tooltip}
					layout={column.layout}
					height={annotationHeight}
					width={width}
					mode={parsePos(_.getIn(column, ['fields', 0]), _.getIn(column, ['assembly'])) ?
						"coordinate" :
						((_.getIn(column, ['showIntrons']) === true) ?  "geneIntron" : "geneExon")}/>
				: null,
			scale = (['segmented', 'mutation', 'SV'].indexOf(column.fieldType) !== -1) ?
				<ChromPosition
					layout = {column.layout}
					width = {width}
					scaleHeight ={scaleHeight}
					mode = {parsePos(_.getIn(column, ['fields', 0]), _.getIn(column, ['assembly'])) ?
						"coordinate" :
						((_.getIn(column, ['showIntrons']) === true) ?  "geneIntron" : "geneExon")}/>
				: null;

		// FF 'button' tag will not emit 'mouseenter' events (needed for
		// tooltips) for children. We must use a different tag, e.g. 'label'.
		// Button and Dropdown.Toggle will allow overriding the tag.  However
		// Splitbutton will not pass props down to the underlying Button, so we
		// can't use Splitbutton.
		// XXX put position into a css module
		return (
			<div style={{width: width, position: 'relative'}}>
				<ColCard colId={label}
						sortable={!first}
						title={<DefaultTextInput
							disabled={!interactive}
							onChange={this.onColumnLabel}
							value={{default: columnLabel, user: user.columnLabel}} />}
						subtitle={<DefaultTextInput
							disabled={!interactive}
							onChange={this.onFieldLabel}
							value={{default: fieldLabel, user: user.fieldLabel}} />}
						controls={!interactive ? (first ? refreshIcon : null) :
							<div>
								{first ? null : (
									<IconMenu icon='more_vert' menuRipple iconRipple={false}>
										{menu}
										{menu && <MenuDivider />}
										<MenuItem title={kmTitle} onClick={this.onKm} disabled={kmDisabled}
										caption='Kaplan Meier Plot'/>
										<MenuItem onClick={this.onSortDirection} caption='Reverse sort'/>
										<MenuItem onClick={this.onDownload} caption='Download'/>
										{aboutDatasetMenu(this.onAbout, _.get(dataset, 'dsID'))}
										<MenuItem onClick={this.onViz} caption='Display'/>
										<MenuItem disabled={!this.props.onEdit} onClick={this.onEdit} caption='Edit'/>
										<MenuItem onClick={this.onRemove} caption='Remove'/>
										</IconMenu>)}
							</div>
						}
						 wizardMode={wizardMode}>
					<Crosshair frozen={!interactive || this.props.frozen}>
						<div style={{height: annotationHeight + scaleHeight + 4}}>
							{annotation ?
								<DragSelect enabled={!wizardMode} onClick={this.onXZoomOut} onSelect={this.onXDragZoom}>
									{scale}
									<div style={{height: 2}}/>
									{annotation}
								</DragSelect> : null}
						</div>
					</Crosshair>
					<ResizeOverlay
						enable={interactive}
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
							<Crosshair frozen={!interactive || this.props.frozen}>
								{widgets.column({ref: 'plot', id, column, data, index, zoom, samples, onClick, fieldFormat, sampleFormat, tooltip})}
								{getStatusView(status, this.onReload)}
							</Crosshair>
						</div>
					</ResizeOverlay>
				</ColCard>
				{append}
			</div>
		);
	}
});

module.exports = Column;
