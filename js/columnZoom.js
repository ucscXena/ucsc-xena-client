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
	geneZoomed: multi(fieldTypeSelector),
	geneZoomLength: multi(fieldTypeSelector),
	maxGeneZoomLength: multi(fieldTypeSelector),
	overlay: multi(fieldTypeSelector),
	startEndPx: multi(directionSelector),
	supportsGeneZoom: multi(fieldTypeSelector),
	zoomTo: multi(fieldTypeSelector),
	zoomToLength: multi(fieldTypeSelector)
};

//
// Direction - either h for gene/horizontal zoom or v for samples/vertical zoom
//

var direction = (start, end) => Math.abs(start.x - end.x) > Math.abs(start.y - end.y) ? 'h' : 'v';

var directionWithGeneModel = ({start, end, zone}) => zone === 'a' ? 'h' : direction(start, end);

var directionSamplesOnly = () => 'v';

// @param {fieldType, start, end, zone}
zoom.direction.dflt = directionWithGeneModel;
zoom.direction.add('clinical', directionSamplesOnly);

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
var subcolumnWidth = (columnWidth, subcolumns) => {
	return columnWidth / subcolumns.length;
};

// Return pixel x coordinates for the specified subcolumn index
var subcolumnToPx = ({layout, position}, i) => {
	var {pxLen} = layout,
		width = subcolumnWidth(pxLen, position),
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
var annotationPxToSamplesPx = (column, startPx, endPx) => {
	var {layout} = column,
		chromRange = chromRangeFromScreen(layout, startPx, endPx),
		overlaps = overlapSubcolumnIndices(column, chromRange),
		start = null, end = null;
		if ( overlaps.length ) {
			var minIndex = _.min(overlaps),
				maxIndex = _.max(overlaps);
			start = subcolumnToPx(column, minIndex).start;
			end = subcolumnToPx(column, maxIndex).end;
		}
	return {start, end};
};

// Calculate index of subcolumn from the specified pixel point within samples area.
var samplesPxToSubcolumn = (columnWidth, subcolumns, px) => {
	return Math.floor(px / subcolumnWidth(columnWidth, subcolumns));
};

// Calculate the indicator start and end points in annotation, from the samples start and end points.
var samplesPxToAnnotationPx = (column, direction, start, end) => {
	var {layout, position} = column,
		istart = null, iend = null;
	if ( direction === 'h' ) {
		// Find start and end subcolumns from pixel points
		var {baseLen, pxLen, reversed, zoom} = layout,
			startIndex = samplesPxToSubcolumn(pxLen, position, start),
			endIndex = samplesPxToSubcolumn(pxLen, position, end),
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
		istart = _.max([Math.floor(reversed ? pxLen - endPx : startPx), 0]);
		iend = _.min([Math.floor(reversed ? pxLen - startPx : endPx), pxLen - 1]);
	}
	return {istart, iend};
};

var overlayFromAnnotation = ({column, start, end}) => {
	var sStartEnd = annotationPxToSamplesPx(column, start, end);
	return {sstart: sStartEnd.start, send: sStartEnd.end, istart: start, iend: end};
};

// Calculate start and end points for zoom in samples area in column with subcolumns
var overlayFromSamples = ({annotated, column, direction, start, end}) =>
	annotated ?
		({sstart: start, send: end, ...samplesPxToAnnotationPx(column, direction, start, end)}) :
		({sstart: start, send: end, istart: start, iend: end});

var overlayWithSubcolumns = (params) =>
	params.zone === 'a' ? overlayFromAnnotation(params) : overlayFromSamples(params);

var overlayWithoutSubcolumns = ({start, end}) => ({sstart: start, send: end, istart: start, iend: end});

// @param {annotated, column, direction, fieldType, start, end, zone}
// -- start and end are pixel points in the target zone where the drag zoom event occurred (either samples or annotation)
zoom.overlay.dflt = overlayWithoutSubcolumns;
zoom.overlay.add('geneProbes', overlayWithSubcolumns);

//
// Zoom - gene/horizontal zoom requires chromstart/chromend values for columns with corresponding gene model or subcolumn
// indices columns without a gene model. Samples/vertical zoom requires index and count.
//

var geneZoomWithGeneModel = ({column: {layout}, istart, iend}) => {
	var [start, end] = chromRangeFromScreen(layout, istart, iend);
	return {start, end};
};

var geneZoomWithoutGeneModel = (params) => {
	var {column, sstart, send} = params,
		{width, fieldList, fields, fieldType, xzoom, maxXZoom} = column,
		zStart = xzoom ? xzoom.start : maxXZoom.start,
		zEnd = xzoom ? xzoom.end : maxXZoom.end,
		// Use fieldList here for genes/probes as zoom indices are always relative to the complete (max zoom) set of fields
		fieldsInZoomRange = fieldType === 'geneProbes' ? fields : fieldList.slice(zStart, zEnd + 1),
		start = zStart + samplesPxToSubcolumn(width, fieldsInZoomRange, sstart),
		end = zStart + samplesPxToSubcolumn(width, fieldsInZoomRange, send);
	return {start, end};
};

var samplesZoom = ({yZoom, sstart, send}) => {

    // project user mouse down and mouse up pixel positions on to the samples array.
	// sstart and send are the start and end pixels selected on the canvas
    // and will range from 0 to canvas height -1.

    // we want to find the first (lowest) sample index covered by sstart and last (highest) sample index
    // sample covered by send.

    var sampleCount = yZoom.count;					// number of samples in the canvas
    var pixelCount = yZoom.height;					// number of pixels in the canvas
    var samplesPerPx = sampleCount / pixelCount;	// number of samples in a pixel
    var sampleIndexOffset = yZoom.index;			// starting sample index in the canvas

    // to find the new starting index
    // sstart is the distance in pixels from the start of the canvas to the to start of the starting pixel
    // for example, the start of px 0 is 0 pixels from the start of the canvas, px 1 is 1 px from the start of the canvas.

    // sstart (pixels)  * samples/Pixel is samples.
    // take the floor of the samples to remove any fractional sample.
    // add the current starting index to get the new start index.
    var startIndex = Math.floor( sstart * samplesPerPx) + sampleIndexOffset;


    // to find the new ending index
	// add one to the send pixel index as we want the distance in pixels to the top of the pixel (the start of the next one)
    var endDistance = send + 1;


    //var endIndex = Math.ceil(endDistance * samplesPerPx) + sampleIndexOffset - 1 ;

    var endIndex = Math.floor(endDistance * samplesPerPx) + sampleIndexOffset;

    // accuracy of the math can make endIndex greater than the end of the samples.
	// trim back if its over.
	var maxIndex = sampleCount + sampleIndexOffset - 1;
    endIndex = (endIndex > (maxIndex)) ? maxIndex : endIndex;

   // console.log(sampleIndexOffset, sampleCount, pixelCount, samplesPerPx, startIndex, endIndex);

    var index = startIndex;
    var count = endIndex - startIndex + 1;
    return { index, count };
};

var zoomByDirection = (params) =>
	params.direction === 'v' ? samplesZoom(params) :
		(params.annotated ? geneZoomWithGeneModel(params) : geneZoomWithoutGeneModel(params));


// @param {annotated, column, direction, fieldType, sstart, ssend, istart, iend, yZoom}
// -- sstart and ssend are pixel points in the samples zone
// -- istart and iend are pixel points in the annotation (indicator) zone
// -- yZoom is the current samples/vertical zoom state
zoom.zoomTo.dflt = zoomByDirection;
zoom.zoomTo.add('clinical', samplesZoom);

//
// Calculate the maximum possible gene zoom length
//

var maxGeneZoomRange = (column) => _.get(column.maxXZoom, ['end']) - _.get(column.maxXZoom, ['start']);

// x zoom is indices for columns without corresponding gene model, add 1 to get length
var maxGeneZoomRangeByIndices = (column) => maxGeneZoomRange(column) + 1;

zoom.maxGeneZoomLength.dflt = maxGeneZoomRange;
['probes', 'genes'].forEach(fieldType => {
	zoom.maxGeneZoomLength.add(fieldType, maxGeneZoomRangeByIndices);
});

//
// Calculate current gene zoom length
//

var geneZoomRange = (column) => _.get(column.xzoom, ['end']) - _.get(column.xzoom, ['start']);

// x zoom is indices for columns without corresponding gene model, add 1 to get length
var geneZoomRangeByIndices = (column) => geneZoomRange(column) + 1;

zoom.geneZoomLength.dflt = geneZoomRange;
['probes', 'genes'].forEach(fieldType => {
	zoom.geneZoomLength.add(fieldType, geneZoomRangeByIndices);
});

//
// Calculate length of zoom to
//

var zoomToLength = ({zoomTo}) => _.get(zoomTo, ['end']) - _.get(zoomTo, ['start']);

// x zoom is indices for columns without corresponding gene model, add 1 to get length
var zoomToLengthByIndices = (params) => zoomToLength(params) + 1;

zoom.zoomToLength.dflt = zoomToLength;
['probes', 'genes'].forEach(fieldType => {
	zoom.zoomToLength.add(fieldType, zoomToLengthByIndices);
});

//
// True if gene/horizontal zoom is possible for column type
//

var geneZoomSupported = () => true;
var geneZoomUnsupported = () => false;

zoom.supportsGeneZoom.dflt = geneZoomSupported;
zoom.supportsGeneZoom.add('clinical', geneZoomUnsupported);

//
// True if there is currently a gene zoom for the column
//

var geneZoomed = (column) =>
	column.xzoom !== undefined &&
	!((_.get(column.xzoom, ['start']) === _.get(column.maxXZoom, ['start']))
	&& ((_.get(column.xzoom, ['end'])) === (_.get(column.maxXZoom, ['end']))));

['geneProbes', 'segmented', 'mutation', 'probes', 'genes', 'SV', 'clinical'].forEach(fieldType => {
	zoom.geneZoomed.add(fieldType, geneZoomed);
});

module.exports = zoom;
