/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Zoom-related functions - transforms of drag and drag select events.
 */

'use strict';

// Dependencies
var {chromRangeFromScreen} = require('./exonLayout');
var multi = require('./multi');
var _ = require('./underscore_ext');

// Selectors
var directionSelector = ({direction}) => direction;
var fieldTypeSelector = ({fieldType}) => fieldType;

// Zoom interface
var zoom = {
	direction: multi(fieldTypeSelector),
	overlay: multi(fieldTypeSelector),
	startEndPx: multi(directionSelector),
	zoomTo: multi(fieldTypeSelector)
};

//
// Direction - either h for gene/horizontal zoom or v for samples/vertical zoom
//

var directionFromStartEnd = (start, end) => Math.abs(start.x - end.x) > Math.abs(start.y - end.y) ? 'h' : 'v';

var directionInAnnotatedColumn = ({start, end, zone}) => zone === 'a' ? 'h' : directionFromStartEnd(start, end);

var directionInNonAnnotatedColumn = ({start, end}) => directionFromStartEnd(start, end);

var directionSampleZoomOnlyColumn = () => 'v';

// @param {fieldType, start, end, zone}
zoom.direction.add('geneProbes', directionInAnnotatedColumn);
zoom.direction.add('segmented', directionInAnnotatedColumn);
zoom.direction.add('mutation', directionInAnnotatedColumn);
zoom.direction.add('probes', directionInAnnotatedColumn);
zoom.direction.add('genes', directionInNonAnnotatedColumn);
zoom.direction.add('clinical', directionSampleZoomOnlyColumn);

//
// Start and end pixel values - use x start and end values for gene/horizontal zoom, use y start and end values for
// sample/vertical zoom
//

var flop = ({start, end}) => start < end ? {start, end} : {start: end, end: start};

// @param {direction, start, end}
// -- start and end are pixel points in the target zone where the drag zoom event occurred (either samples or annotation)
zoom.startEndPx.add('h', ({start, end}) => flop({ start: start.x, end: end.x }));
zoom.startEndPx.add('v', ({start, end}) => flop({ start: start.y, end: end.y }));

//
// Overlay - return four points for drawing drag overlay: samples start, samples end, indicator start and indicator
// end (where indicator is either gene probe positioning for gene/horizontal zoom or "second sample zoom" positioning
// for samples/vertical zoom).
//

// Flip start and end chrom if layout is reversed
var flopChrom = (chromstart, chromend, reversed) =>
	reversed ? {start: chromstart, end: chromend} : {start: chromend, end: chromstart};

// True if start/end range falls within range of position, or spans position
var chromRangeInBin = ([chromstart, chromend], {start, end}) =>
	(chromstart >= start && chromstart <= end) || // start is in position
	(chromend >= start && chromend <= end) || // end is in position
	(chromstart <= start && chromend >= end); // start/end spans position

// Returns width of each subcolumn
var subcolumnWidth = (layout, position) => {
	var {pxLen} = layout;
	return pxLen / position.length;
};

// Return pixel x coordinates for the specified subcolumn index
var subcolumnIndexToStartEndPx = ({layout, position}, i) => {
	var width = subcolumnWidth(layout, position),
		start = width * i,
		end = start + width - 1;
	return {start, end};
};

// Return the set of subcolumn indices where the chromrange either falls into, or spans.
var overlapSubcolumnIndices = (column, chromRange) => {
	var {layout, position} = column,
		{reversed} = layout;
	return position
		.map(({chromstart, chromend}, i) => ({i, ...flopChrom(chromstart, chromend, reversed)}))
		.filter(pos => chromRangeInBin(chromRange, pos))
		.map(({i}) => i);
};

// Calculate subcolumn start and end pixel points from the specified annotation start and end pixel points.
var annotationStartEndPxToSamplesStartEndPx = (column, startPx, endPx) => {
	var {layout} = column,
		chromRange = chromRangeFromScreen(layout, startPx, endPx),
		overlaps = overlapSubcolumnIndices(column, chromRange),
		start = null, end = null;
		if ( overlaps.length ) {
			var minIndex = _.min(overlaps),
				maxIndex = _.max(overlaps);
			start = subcolumnIndexToStartEndPx(column, minIndex).start;
			end = subcolumnIndexToStartEndPx(column, maxIndex).end;
		}
	return {start, end};
};

// Calculate index of subcolumn from the specified pixel point within samples area.
var samplesPxToSubcolumnIndex = ({layout, position}, px) => {
	return Math.floor(px / subcolumnWidth(layout, position));
};

// Calculate the indicator start and end points in annotation, from the samples start and end points.
var samplesStartEndPxToAnnotationStartEndPx = (column, direction, start, end) => {
	var {layout, position} = column,
		istart = null, iend = null;
	if ( direction === 'h' ) {
		// Find start and end subcolumns from pixel points
		var {baseLen, pxLen, reversed, zoom} = layout,
			startIndex = samplesPxToSubcolumnIndex(column, start),
			endIndex = samplesPxToSubcolumnIndex(column, end),
			// Grab set of selected subcolumns
			selectedPos = position.slice(startIndex, endIndex + 1),
			// Find the min and max chroms within the selected set of subcolumns
			minChrom = _.min(selectedPos.map(p => p.chromstart)),
			maxChrom = _.max(selectedPos.map(p => p.chromend)),
			// Create start and end range from min and max chroms
			chromRange = [minChrom, maxChrom],
			// Find all subcolumns that contain min and max chrom
			subcolumns = position.filter(({chromstart, chromend}) =>
				chromRangeInBin(chromRange, {start: chromstart, end: chromend})),
			// Find true min and max chroms
			trueMinChrom = _.min(subcolumns.map(p => p.chromstart)),
			trueMaxChrom = _.max(subcolumns.map(p => p.chromend)),
			// Calculate pixel points in annotation, based on min and max chroms
			columnSize = pxLen / baseLen,
			startPx = (trueMinChrom - zoom.start) * columnSize,
			endPx = (trueMaxChrom - zoom.start) * columnSize;
		istart = Math.floor(reversed ? pxLen - endPx : startPx);
		iend = Math.ceil(reversed ? pxLen - startPx : endPx);
	}
	return {istart, iend};
};

var overlayFromAnnotationZone = ({column, start, end}) => {
	var sStartEnd = annotationStartEndPxToSamplesStartEndPx(column, start, end);
	return {sstart: sStartEnd.start, send: sStartEnd.end, istart: start, iend: end};
};

// Calculate start and end points for zoom in samples area in column with subcolumns
var overlayFromSamplesZone = ({annotated, column, direction, start, end}) =>
	annotated ?
		({sstart: start, send: end, ...samplesStartEndPxToAnnotationStartEndPx(column, direction, start, end)}) :
		({sstart: start, send: end, istart: start, iend: end});

var overlayWithSubcolumns = (params) =>
	params.zone === 'a' ? overlayFromAnnotationZone(params) : overlayFromSamplesZone(params);

var overlayWithoutSubcolumns = ({start, end}) => ({sstart: start, send: end, istart: start, iend: end});

// @param {column, direction, fieldType, start, end, zone}
// -- start and end are pixel points in the target zone where the drag zoom event occurred (either samples or annotation)
zoom.overlay.add('geneProbes', overlayWithSubcolumns);
zoom.overlay.add('segmented', overlayWithoutSubcolumns);
zoom.overlay.add('mutation', overlayWithoutSubcolumns);
zoom.overlay.add('probes', overlayWithoutSubcolumns);
zoom.overlay.add('genes', overlayWithoutSubcolumns);
zoom.overlay.add('clinical', overlayWithoutSubcolumns);

//
// Zoom - gene/horizontal zoom requires chromstart/chromend values, samples/vertical zoom requires index and count.
//

var geneZoom = ({column: {layout}, istart, iend}) => {
	var [start, end] = chromRangeFromScreen(layout, istart, iend);
	return {start, end};
};

var samplesZoom = ({yZoom, sstart, send}) => {
	var {count, height, index} = yZoom,
		rowSize = (height - 1) / count,
		startIndex = Math.floor(sstart / rowSize) + index,
		endIndex = Math.floor(send / rowSize) + index;
	return {index: startIndex, count: (endIndex - startIndex)};
};

var zoomByDirection = (params) =>
	params.direction === 'v' ? samplesZoom(params) : geneZoom(params);


// @param {column, direction, fieldType, sstart, ssend, istart, iend, yZoom}
// -- sstart and ssend are pixel points in the samples zone
// -- istart and iend are pixel points in the annotation (indicator) zone
// -- yZoom is the current samples/vertical zoom state
zoom.zoomTo.add('geneProbes', zoomByDirection);
zoom.zoomTo.add('segmented', zoomByDirection);
zoom.zoomTo.add('mutation', zoomByDirection);
zoom.zoomTo.add('probes', zoomByDirection);
zoom.zoomTo.add('genes', zoomByDirection);
zoom.zoomTo.add('clinical', samplesZoom);

module.exports = zoom;
