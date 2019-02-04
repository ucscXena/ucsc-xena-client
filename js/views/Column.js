'use strict';

import PureComponent from '../PureComponent';
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
var Crosshair = require('./Crosshair');
var {chromRangeFromScreen} = require('../exonLayout');
var parsePos = require('../parsePos');
var {categoryMore} = require('../colorScales');
var {publicServers} = require('../defaultServers');
import {IconMenu as RTIconMenu, MenuItem, MenuDivider} from 'react-toolbox/lib/menu';
import Tooltip from 'react-toolbox/lib/tooltip';
var ColCard = require('./ColCard');
var {ChromPosition} = require('../ChromPosition');
import RefGeneAnnotation from '../refGeneExons';
import { matches } from 'static-interval-tree';
var gaEvents = require('../gaEvents');
var crosshair = require('./cursor.png');

var ESCAPE = 27;

class IconMenu extends React.Component {
	onKeyDown = ev => {
		if (ev.keyCode === ESCAPE) {
			this.ref.handleMenuHide();
		}
	}
	cleanup() {
		// We get an onHide() call from setting state in Menu, *and*
		// from this.ref.handleMenuHide(), during this.onKeyDown. So,
		// check if 'curtain' still exists before tear down.
		if (this.curtain) {
			document.body.removeChild(this.curtain);
			document.removeEventListener('keydown', this.onKeyDown);
			delete this.curtain;
		}
	}
	componentWillUnmount() {
		this.cleanup();
	}
	onHide = () => {
		var {onHide} = this.props;
		this.cleanup();
		onHide && onHide();
	}
	onShow = () => {
		var {onShow} = this.props;
		this.curtain = document.createElement('div');
		this.curtain.style = "position:absolute;top:0;left:0;width:100%;height:100%";
		document.body.appendChild(this.curtain);
		document.addEventListener('keydown', this.onKeyDown, false);
		onShow && onShow();
	}
	onRef = ref => {
		this.ref = ref;
	}
	render() {
		var {onShow, onHide, ...others} = this.props;
		return <RTIconMenu innerRef={this.onRef} onShow={this.onShow} onHide={this.onHide} {...others}/>;
	}
}

const TooltipMenuItem = Tooltip(MenuItem);

const tooltipConfig = (message) => {
	return {
		tooltipDelay: 750,
		tooltip: message,
		tooltipPosition: "horizontal",
		style: { pointerEvents: 'all' }
	};
};

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

var annotationHeight = 47,
	positionHeight = 17,
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
	var list = arr.filter(el => el).map((el, id) => React.cloneElement(el, {key: id}));
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

function segmentedMenu(props, {onShowIntrons, onSortVisible, onSpecialDownload, onVizOptions}) {
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
		<MenuItem disabled={noData} onClick={onSpecialDownload} caption={specialDownloadItemName}/>
	]);
}

function mutationMenu(props, {onMuPit, onShowIntrons, onSortVisible}) {
	var {column, data} = props,
		pos = parsePos(column.fields[0]),
		{valueType, sortVisible, assembly, showIntrons = false} = column,
		rightValueType = valueType === 'mutation',
		wrongDataSubType = column.fieldType !== 'mutation',
		rightAssembly = (["hg19", "hg38", "GRCh37", "GRCh38"].indexOf(assembly) !== -1) ? true : false,  //MuPIT support hg19, hg38
		noMuPit = !rightValueType || !rightAssembly || !!wrongDataSubType || !!pos,
		noData = !_.get(data, 'req'),
		mupitItemName = noData ? 'MuPIT 3D Loading' : 'MuPIT 3D (' + assembly + ' coding)',
		sortVisibleItemName = sortVisible ? 'Sort using full region' : 'Sort using zoom region',
		intronsItemName =  showIntrons ? 'Hide introns' : "Show introns",
		mupitMenuItem = null;

	if (data && !(_.isEmpty(data.refGene))) {
		mupitMenuItem = pos ? <TooltipMenuItem disabled={noMuPit} {...tooltipConfig("Only available for gene view")} caption={mupitItemName}/>
		                    : ( noMuPit ? <TooltipMenuItem disabled={noMuPit} {...tooltipConfig("Only available for SNPs on hg19 and hg38")} caption={mupitItemName}/>
								: <MenuItem onClick={(e) => onMuPit(assembly, e)} caption={mupitItemName}/>);
	}

	return addIdsToArr([
		mupitMenuItem,
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

	if (!foundPublicHub || (['geneProbes', 'genes', 'probes', 'clinical'].indexOf(fieldType) === -1 ||
		_.any(fieldSpecs, obj => obj.fetchType === "signature")  || fields.length !== 1)) {
		return null;
	}

	var tumorMapLinkout = {
			'Treehouse public expression dataset (July 2017)': {
				map: "Treehouse/THPED_July2017",
				layout: "mRNA"
			},
			'Treehouse PED v8': {
				map: "Treehouse/TreehousePEDv8",
				layout: ""
			},
			'Treehouse PED v5 April 2018': {
				map: "Treehouse/TreehousePEDv8_April2008",
				layout: ""
			},
			'TCGA Pan-Cancer (PANCAN)': {
				map: "PancanAtlas/SampleMap",
				layout: "mRNA"
			},
			'GDC Pan-Cancer (PANCAN)': {
				map: "xena_test/remapped_pancan_mrna",
				layout: "layout"
			}
		};

	return _.getIn(tumorMapLinkout, [cohort.name]);
}

// Maybe put in a selector.
var supportsGeneAverage = ({fieldType, fields, fieldList}, isChrom) =>
	!isChrom && _.contains(['geneProbes', 'genes'], fieldType) &&
		(fieldList || fields).length === 1;

// Duplicated in denseMatrix.js, because of the weirdness with
// fields vs. probes.
var supportsClustering = ({fieldType, fields}) =>
	_.contains(['genes', 'probes', 'geneProbes'], fieldType) && fields.length > 2;

function matrixMenu(props, {onTumorMap, onMode, onCluster, isChrom}) {
	var {cohort, column} = props,
		{fieldType, noGeneDetail, fields, fieldSpecs, clustering} = column,
		tumorMapCohort = supportsTumorMap({fieldType, fields, cohort, fieldSpecs}),
		order = clustering == null ? 'clusters' :
			fieldType === 'geneProbes' ? 'position' : 'list';

	return addIdsToArr([
		supportsClustering(column) ?
			<MenuItem onClick={onCluster} caption={`Order by ${order}`} /> :
			null,
		supportsGeneAverage(column, isChrom) ?
			(fieldType === 'genes' ?
				<MenuItem title={noGeneDetail ? 'no common probemap' : ''}
					disabled={noGeneDetail} onClick={(e) => onMode(e, 'geneProbes')} caption='Detailed view'/> :
				<MenuItem onClick={(e) => onMode(e, 'genes')} caption='Gene average'/>) :
				null,
		tumorMapCohort ?
			<MenuItem onClick={(e) => onTumorMap(tumorMapCohort, e)} caption={`Tumor Map`}/> :
			null
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
				<i onClick={onReload}
				   style={styles.error}
				   title='Error loading data. Click to reload.'
				   aria-hidden='true'
				   className={'material-icons'}>warning</i>
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

function getCodingVariants(index, exons) {
	const resultSet = new Set();

	exons.forEach(([start, end]) => {
		matches(index, {start: start, end: end})
			.forEach(item => resultSet.add(item.variant));
	});

	return [...resultSet];
}

function filterExonsByCDS(exonStarts, exonEnds, cdsStart, cdsEnd) {
	return _.zip(exonStarts, exonEnds)
		.filter(([start, end]) => !(end < cdsStart || start > cdsEnd))
		.map(([start, end]) => [Math.max(start, cdsStart), Math.min(end, cdsEnd)]);
}

var showPosition = column =>
	_.contains(['segmented', 'mutation', 'SV', 'geneProbes'], column.fieldType) &&
	_.getIn(column, ['dataset', 'probemapMeta', 'dataSubType']) !== 'regulon';


class Column extends PureComponent {
	state = {
	    specialDownloadMenu: specialDownloadMenu
	};

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
	enableHiddenFeatures = () => {
		specialDownloadMenu = true;
		this.setState({specialDownloadMenu: true});
	};

	componentWillMount() {
		var asciiA = 65;
		this.ksub = konami(asciiA).subscribe(this.enableHiddenFeatures);
	}

	componentWillUnmount() {
		this.ksub.unsubscribe();
	}

	onResizeStop = (size) => {
		this.props.onResize(this.props.id, size);
	};

	onRemove = () => {
		this.props.onRemove(this.props.id);
	};

	onDownload = () => {
		var {column, data, samples, index, sampleFormat} = this.props;
		gaEvents('spreadsheet', 'download', 'column');
		download(widgets.download({column, data, samples, index: index, sampleFormat}));
	};

	onViz = () => {
		this.props.onViz(this.props.id);
	};

	onEdit = () => {
		this.props.onEdit(this.props.id);
	};

	onKm = () => {
		gaEvents('spreadsheet', 'km');
		this.props.onKm(this.props.id);
	};

	onSortDirection = () => {
		var newDir = _.get(this.props.column, 'sortDirection', 'forward') === 'forward' ?
			'reverse' : 'forward';
		this.props.onSortDirection(this.props.id, newDir);
	};

	onMode = (ev, newMode) => {
		this.props.onMode(this.props.id, newMode);
	};

	onColumnLabel = (value) => {
		this.props.onColumnLabel(this.props.id, value);
	};

	onFieldLabel = (value) => {
		this.props.onFieldLabel(this.props.id, value);
	};

	onShowIntrons = () => {
		this.props.onShowIntrons(this.props.id);
	};

	onCluster = () => {
		this.props.onCluster(this.props.id,
			this.props.column.clustering ? undefined : 'probes');
	};

	onSortVisible = () => {
		var {id, column} = this.props;
		var value = _.get(column, 'sortVisible',
				column.valueType === 'segmented' ? true : false);
		this.props.onSortVisible(id, !value);
	};

	onSpecialDownload = () => {
		var {column, data, samples, index, sampleFormat} = this.props,
			{type, downloadData} = widgets.specialDownload({column, data, samples, index: index, sampleFormat});
		if (type === "txt") {
			download(downloadData);
		} else if(type === "json") {
			downloadJSON(downloadData);
		}
	};

	onXZoomOut = (ev) => {
		if (ev.shiftKey) {
			let {id, column: {maxXZoom}, onXZoom} = this.props,
				position = getPosition(maxXZoom, '', '');
			onXZoom(id, position);
		}
	};

	onXDragZoom = (pos) => {
		var {column: {layout}, onXZoom, id} = this.props,
			[start, end] = chromRangeFromScreen(layout, pos.start, pos.end);
		onXZoom(id, {start, end});
	};

	onMenuToggle = (open) => {
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
	};

	onMuPit = (assembly) => {
		// Construct the url, which will be opened in new window
		// total = newRows.length,
		// k fixed at 1000
		// gene, protein, etc size is fixed at 1000
		// this could be actual size of protein or gene, but it is complicated due to mutations could be from exon region and display could be genomics region
		// for the same gene it is a constant, does it really matter to be different between genes?
		const k = 1000,
			indexByPos = this.props.index.byPosition,
			{ exonStarts, exonEnds, cdsStart, cdsEnd } = _.values(this.props.data.refGene)[0];

		const exons = filterExonsByCDS(exonStarts, exonEnds, cdsStart, cdsEnd),
			variants = getCodingVariants(indexByPos, exons); //coding variants

		let SNVPs = mutationVector.SNVPvalue(variants, variants.length, k);
		if (this.props.column.xzoom) {
			const { start: zoomStart, end: zoomEnd } = this.props.column.xzoom;
			SNVPs = _.filter(SNVPs, value => {
				const valueStart = parseInt(value.start);
				return valueStart >= zoomStart && valueStart <= zoomEnd;
			});
		}

		const uriList = _.map(SNVPs, n => `${n.chr}:${n.start}:${1 - n.pValue}`).join(','),
			mupitUrl = {
				"hg19": 'http://hg19.cravat.us/MuPIT_Interactive?gm=', // mupit hg19 server
				"GRCh37": 'http://hg19.cravat.us/MuPIT_Interactive?gm=', // mupit hg19 server
				"hg38": 'http://mupit.icm.jhu.edu/MuPIT_Interactive?gm=', //mupit hg38 server
				"GRCh38": 'http://mupit.icm.jhu.edu/MuPIT_Interactive?gm=' //mupit hg38 server
			},
			url = mupitUrl[assembly];

		window.open(url + `${uriList}`);
	};

	onTumorMap = (tumorMap) => {
		// TumorMap/Xena API https://tumormap.ucsc.edu/query/addAttributeXena.html
		// only use spec of the first cohort (in the context of composite cohort)
		var fieldSpecs = _.getIn(this.props, ['column', 'fieldSpecs', 0]),
			data = _.getIn(this.props, ['data']),
			valueType = _.getIn(this.props, ['column', 'valueType']),
			fieldType = _.getIn(this.props, ['column', 'fieldType']),
			url = "https://tumormap.ucsc.edu/?xena=addAttr&p=" + tumorMap.map + "&layout=" + tumorMap.layout;

		var ds = JSON.parse(fieldSpecs.dsID),
			hub = ds.host,
			dataset = ds.name,
			feature = (fieldType !== "geneProbes") ? fieldSpecs.fields[0] : _.getIn(data, ['req', 'probes', 0]),
			customColor = _.getIn(this.props, ['column', 'dataset', 'customcolor', feature]); // object, key value pair


		url = url + "&hub=" + hub + "/data/";
		url = url + "&dataset=" + dataset;
		url = url + "&attr=" + feature;

		if (valueType === "coded") {
			var codes = _.getIn(data, ['codes']),
				cat, colorhex;

			_.map(codes, (code, i) => {
				cat = code;
				colorhex = _.isEmpty(customColor) ? categoryMore[i % categoryMore.length] : customColor[code];
				colorhex = colorhex.slice(1, colorhex.length);
				url = url + "&cat=" + encodeURIComponent(cat);
				url = url + "&color=" + colorhex;
			});
		}

		window.open(url);
	};

	onReload = () => {
		this.props.onReload(this.props.id);
	};

	getControlWidth = () => {
		return 90;
//		return 136;
	};

	onAbout = (ev, host, dataset) => {
		ev.preventDefault();
		this.props.onAbout(host, dataset);
	};

	render() {
		var {first, id, label, samples, samplesMatched, column, index,
				zoom, data, fieldFormat, sampleFormat, hasSurvival, searching,
				onClick, tooltip, wizardMode, onReset,
				interactive, append} = this.props,
			isChrom = !!parsePos(_.get(column.fieldList || column.fields, 0),
					_.getIn(column, ['assembly'])),
			{specialDownloadMenu} = this.state,
			{width, dataset, columnLabel, fieldLabel, user} = column,
			{onMode, onTumorMap, onMuPit, onCluster, onShowIntrons, onSortVisible, onSpecialDownload} = this,
			menu = optionMenu(this.props, {onMode, onMuPit, onTumorMap, onShowIntrons, onSortVisible,
				onCluster, onSpecialDownload, specialDownloadMenu, isChrom}),
			[kmDisabled, kmTitle] = disableKM(column, hasSurvival),
			status = _.get(data, 'status'),
			refreshIcon = (<i className='material-icons' onClick={onReset}>close</i>),
			// move this to state to generalize to other annotations.
			annotation = showPosition(column) ?
				<RefGeneAnnotation
					id={id}
					column={column}
					position={_.getIn(column, ['layout', 'chrom', 0])}
					refGene={_.getIn(data, ['refGene'], {})}
					probePosition={column.position}
					tooltip={tooltip}
					layout={column.layout}
					height={annotationHeight}
					positionHeight={column.position ? positionHeight : 0}
					width={width}
					mode={isChrom ?
						"coordinate" :
						((_.getIn(column, ['showIntrons']) === true) ?  "geneIntron" : "geneExon")}/>
				: null,
			scale = showPosition(column) ?
				<ChromPosition
					layout = {column.layout}
					width = {width}
					scaleHeight ={scaleHeight}
					mode = {isChrom ?
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
					<div style={{cursor: annotation ? `url(${crosshair}) 12 12, crosshair` : 'default', height: annotationHeight + scaleHeight + 4}}>
						{annotation ?
							<DragSelect enabled={!wizardMode} onClick={this.onXZoomOut} onSelect={this.onXDragZoom}>
								{scale}
								<div style={{height: 2}}/>
								{annotation}
							</DragSelect> : null}
					</div>
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
							<Crosshair height={zoom.height} frozen={!interactive || this.props.frozen}>
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
}

module.exports = Column;
