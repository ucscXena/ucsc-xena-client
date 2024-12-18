var _ = require('../underscore_ext').default;
var Rx = require('../rx').default;
var {find} = _;
var xenaQuery = require('../xenaQuery');
import * as heatmapColors from '../heatmapColors';
var widgets = require('../columnWidgets');
var {categoryMore} = require('../colorScales');
var parsePos = require('../parsePos');
var exonLayout = require('../exonLayout');
var {datasetChromProbeValues, datasetProbeValues, datasetGeneProbeAvg,
	datasetGeneProbesValues, fieldCodes, refGeneRange} = xenaQuery;
var {fastats} = require('../xenaWasm');

// sorted by start of probe in transcript direction (strand), for negative strand, the start of the probe is chromend
// known issue: tie break
var flopIfNegStrand = (strand, req) => {
	var sortedReq = _.sortBy(_.zip(req.position, req.probes, req.values),
		strand === '-' ? item => -(item[0].chromend) : item => item[0].chromstart),
		[sortedPosition, sortedProbes, sortedValues] = _.unzip(sortedReq);
	return _.assoc(req,
		'position', sortedPosition,
		'probes', sortedProbes,
		'values', sortedValues);
};

var colorCodeMap = (codes, colors) =>
	colors ? _.map(codes, (c, i) => colors[c] || categoryMore[i % categoryMore.length]) : null;

var getCustomColor = (fields, dataset) =>
	fields.length === 1 ?
		_.getIn(dataset, ['customcolor', fields[0]], null) : null;

var defaultXZoom = (pos, refGene, position, showPos, values) =>
	!showPos ? {start: 0, end: values.length} :
		pos ? {
				start: pos.baseStart,
				end: pos.baseEnd} :
			!refGene ? undefined :
				_.Let(({txStart, txEnd} = refGene) => ({
					start: Math.min(txStart, ..._.pluck(position, 'chromstart')),
					end: Math.max(txEnd, ..._.pluck(position, 'chromend'))}));

var supportsClustering = ({fieldType, fields}) =>
	_.contains(['genes', 'probes'], fieldType) && fields.length > 2 ||
	fieldType === 'geneProbes';

function reOrderFields(column, data) {
	var probeOrder = _.getIn(data, ['clustering', 'probes']);
	if (supportsClustering(column) && column.clustering === 'probes' &&
		data.status !== 'loading' && probeOrder && data.req) {
		return {
			data: _.updateIn(data,
							['req', 'position'], position => position && probeOrder.map(i => position[i]),
							['req', 'values'], values => values && probeOrder.map(i => values[i]),
							['req', 'probes'], probes => probes && probeOrder.map(i => probes[i]),
							['avg'], avg => avg && _.mapObject(avg, v => probeOrder.map(i => v[i]))),
			column: column.fieldType === 'geneProbes' ? column :
				_.assoc(column, 'fields', probeOrder.map(i => column.fields[i]))
		};
	}
	return {column, data};
}

var reorderFieldsTransform = fn =>
	(column0, vizSettings, data0, samples) =>
		_.Let(({column, data} = reOrderFields(column0, data0)) =>
			fn(column, vizSettings, data, samples));

var showPosition = column =>
	_.getIn(column, ['dataset', 'probemapMeta', 'dataSubType']) !== 'regulon';

function getUserCodes(column) {
	var user = _.getIn(column, ['vizSettings', 'codes']);
	return user && JSON.parse(user);
}

// overlay category codes with user settings
function setUserCodes(column, data) {
	var user = getUserCodes(column);
	return user ? _.updateIn(data, ['codes'],
				codes => _.times(codes.length, i => user[i])) :
		data;
}

function dataToHeatmap(column, vizSettings, dataIn) {
	var data = setUserCodes(column, dataIn);
	if (!_.get(data, 'req')) {
		return null;
	}

	var {req, avg, codes} = data,
		{dataset} = column,
		fields = _.get(req, 'probes', column.fields),
		heatmap = req.values,
		customColors = colorCodeMap(codes, getCustomColor(column.fields, dataset)),
		assembly = _.getIn(dataset, ['probemapMeta', 'assembly']),
		colors = fields.map((p, i) =>
			heatmapColors.colorSpec(column, vizSettings, codes,
				{avg: _.mapObject(avg, v => v[i])},
				customColors)),
		units = [_.get(dataset, 'unit')];

	// column.fields is overwritten by this, which is problematic. It was
	// supposed to simplify the rendering layer by resolving whether the
	// field id maps to multiple probes, but we need the original field list
	// in the rendering layer, to determine if we support KM and gene average.
	// We could compute this in a selector, perhaps.
	return {fields, fieldList: column.fields, heatmap, avg, assembly, colors, units, codes};
}

function geneProbesToHeatmap(column, vizSettings, data) {
	var pos = parsePos(column.fields[0]);
	if (_.isEmpty(data) || _.isEmpty(data.req) || !data.refGene) {
		return null;
	}
	if (!pos && _.isEmpty(data.refGene)) {
		// got refGene, but it's empty.
		return dataToHeatmap(column, vizSettings, data);
	}
	var showPos = showPosition(column),
		{req} = data,
		{values} = req,
		refGeneObj = _.first(_.values(data.refGene)),
		maxChromXZoom = defaultXZoom(pos, refGeneObj, req.position, showPos, values),
		{width, showIntrons = false, xzoom} = column,
		// Use maxXZoom when there is no gene model (as xzoom is subcolumn indices)
		chromXZoom = showPos ? (xzoom || maxChromXZoom) : maxChromXZoom,
		createLayout = pos ? exonLayout.chromLayout : (showIntrons ? exonLayout.intronLayout : exonLayout.layout),
		// XXX Build layout that includes pxs for introns
		layout = createLayout(refGeneObj, width, chromXZoom, pos),
		{start = 0, end = req.position.length} = xzoom || {},
		endIndex = end + 1,
		probesInView = showPos ?
			_.filterIndices(req.position,
				({chromstart, chromend}) => chromXZoom.start <= chromend && chromstart <= chromXZoom.end) :
			_.range(start, endIndex),
		dataInView = _.updateIn(data,
								['req', 'position'], position => position ? probesInView.map(i => position[i]) : position,
								['req', 'values'], values => probesInView.map(i => values[i]),
								['req', 'probes'], probes => probesInView.map(i => probes[i]),
								['avg'], avg => _.mapObject(avg, v => probesInView.map(i => v[i]))),
		heatmapData = dataToHeatmap(column, vizSettings, dataInView);

	return {
		...(probesInView.length ? heatmapData : {}),
		layout,
		position: dataInView.req.position,
		maxXZoom: maxChromXZoom
	};
}

function zoomableDataToHeatmap(column, vizSettings, data) {
	if (!_.get(data, 'req')) {
		return null;
	}
	var {req} = data,
		{values} = req,
		{xzoom = {}, fields} = column,
		maxXZoomStart = 0, // use 0 index here as we are dealing with an array of subcolumns
		maxXZoomEnd = values.length - 1,
		{start = maxXZoomStart, end = maxXZoomEnd} = xzoom,
		endIndex = end + 1,
		dataInView = _.updateIn(data,
								['req', 'position'], position => position ? position.slice(start, endIndex) : position,
								['req', 'values'], values => values.slice(start, endIndex),
								['avg'], avg => _.mapObject(avg, v => v.slice(start, endIndex))),

		// Update set of fields to just the fields in the current x zoom range
		zoomedColumn = Object.assign({}, column, {
			fields: fields.slice(start, endIndex)
		}),
		heatmap = {
			...dataToHeatmap(zoomedColumn, vizSettings, dataInView),
			maxXZoom: {start: maxXZoomStart, end: maxXZoomEnd},
			fieldList: fields // Set field list to complete (max zoom) set of fields
		};

	return heatmap;
}

//
// sort
//

var {cmpNumber} = _;

function cmpSamples(probes, data, s1, s2) {
	var diff = data && find(data, function (f) {
		return cmpNumber(f[s1], f[s2]);
	});
	if (diff) {
		return cmpNumber(diff[s1], diff[s2]);
	} else {
		return 0;
	}
}

var cmp = ({fields}, {req: {values, probes} = {}}) =>
	(s1, s2) => cmpSamples(probes || fields, values, s1, s2); // XXX having probes here is unfortunate.

//
// data fetches
//

// XXX Put the polymorphism someplace else, e.g. in binpack, based
// on a data type identifier, or something.
var toArray = x =>
	x instanceof Uint8Array ? new Float32Array(x.buffer) : new Float32Array(x);

function toArrays(data) {
	var values = _.map(data, field => toArray(field));

	return {values};
}

function indexProbeGeneResponse(data) {
	var [{name, position}, vals] = data;
	return _.extend({probes: name, position}, toArrays(vals));
}

function fillNulls(samples, data) {
	return _.map(data, geneData =>
		geneData.length === 0 ?
			(new Float32Array(samples.length)).fill(NaN) : geneData);
}

function orderByQuery(genes, data) {
	var indx = _.invert(_.pluck(data, 'gene'));
	return _.map(genes, function (g) {
		var i = indx[g];
		return i && data[i].scores[0]; // XXX extra level of array in g.SCORES??
	});
}

function probeSpan({position}) {
	return position.length > 0 ? {
		chromend: _.max(_.pluck(position, 'chromend')),
		chromstart: _.min(_.pluck(position, 'chromstart')),
		strand: position[0].strand,
		chrom: position[0].chrom
	} : null;
}

function indexGeneResponse(samples, genes, data) {
	return {
		position: data.map(probeSpan),
		...toArrays(fillNulls(samples, orderByQuery(genes, data)))
	};
}

function indexFieldResponse(fields, resp) {
	var [namePos, data] = resp;
	return {
		position: namePos &&
			_.Let(({name, position} = namePos, posMap = _.object(name, position)) =>
				fields.map(f => posMap[f])),
		...toArrays(data)
	};
}

var fetch = ({dsID, fields}, samples) => datasetProbeValues(dsID, samples, fields)
	.map(resp => ({req: indexFieldResponse(fields, resp)}));

var fetchRefGene = (fields, assembly) => {
	var {name, host} = xenaQuery.refGene[assembly] || {};

	return name ?
		xenaQuery.refGeneExons(host, name, fields) :
		Rx.Observable.of(null, Rx.Scheduler.asap);
};

function fetchChromProbes({dsID, assembly, fields}, samples) {
	var {name, host} = xenaQuery.refGene[assembly] || {},
		pos = parsePos(fields[0]);
	return Rx.Observable.zip(
		refGeneRange(host, name, pos.chrom, pos.baseStart, pos.baseEnd),
		datasetChromProbeValues(dsID, samples, pos.chrom, pos.baseStart, pos.baseEnd),
		(refGene, resp) => ({
			req: indexProbeGeneResponse(resp),
			refGene}));
}

var fetchGeneProbes = ({dsID, fields, assembly}, samples) =>
	Rx.Observable.zip(
		fetchRefGene(fields, assembly),
		datasetGeneProbesValues(dsID, samples, fields),
		(refGene, resp) => ({
			req: flopIfNegStrand(_.getIn(refGene, [fields[0], 'strand']), indexProbeGeneResponse(resp)),
			refGene}));

var fetchGeneOrChromProbes = (field, samples) =>
	(parsePos(field.fields[0]) ? fetchChromProbes : fetchGeneProbes)(field, samples);

// This should really be fetchCoded. Further, it should only return a single
// code list, i.e. either a single clinical coded field, or a list of genomic
// fields all with the same code values.
var fetchFeature = ({dsID, fields}, samples) => Rx.Observable.zipArray(
	datasetProbeValues(dsID, samples, fields)
		.map(resp => indexFieldResponse(fields, resp)),
	fieldCodes(dsID, fields)
).map(([req, codes]) => ({req, codes: _.values(codes)[0]}));

var fetchGene = ({dsID, fields}, samples) => datasetGeneProbeAvg(dsID, samples, fields)
	.map(resp => ({req: indexGeneResponse(samples, fields, resp)}));

var fmtNum = n => n !== n ? '' : n.toPrecision(4);

////////////////////////////////
// download of on-screen data

function tsvProbeMatrix(heatmap, samples, fields, codes) {
	var fieldNames = ['sample'].concat(fields);
	var coded = _.map(fields, (f, i) =>
		_.map(heatmap[i], codes ? _.propertyOf(codes) : fmtNum));
	var transposed = _.zip.apply(null, coded);
	var tsvData = _.map(samples, (sample, i) => [sample].concat(transposed[i]));

	return [fieldNames, tsvData];
}

function download({column, samples, sampleFormat}) {
	var {fields, heatmap, codes} = column,
		tsvSamples = _.map(samples, sampleFormat),
		sampleFloatCast = Float32Array.from(samples); // needed for keep floating point number/null to be cast to integer
	heatmap = heatmap.map(oneColumn => sampleFloatCast.map(i => oneColumn[i]));
	return tsvProbeMatrix(heatmap, tsvSamples, fields, codes);
}

function downloadCodedSampleListsJSON({data, samples, sampleFormat}) {
	//download json sample lists for coded column
	var values = _.getIn(data, ['req', 'values', 0]),
		codes = _.get(data, 'codes'),
		downloadData;

	if (codes.length === values.length) {
		downloadData = {
			"samples": codes
		};
	}
	else {
		var groupedSamples = _.groupBy(samples, sample => codes[values[sample]]);
		downloadData = _.mapObject(groupedSamples, val => val.map(sample => sampleFormat(sample)));
	}

	return {
		type: "json",
		downloadData: downloadData
	};
}

function denseAverage(column, data) {
	var values = _.getIn(data, ['req', 'values'], []),
		avg = fastats(values);
	return {avg};
}

['probes', 'geneProbes', 'genes', 'clinical'].forEach(fieldType => {
	widgets.cmp.add(fieldType, cmp);
	widgets.download.add(fieldType, download);
});

// note we compute mean & median for categorical, which isn't
// useful. Might want to skip that.
['probes', 'geneProbes', 'genes', 'clinical'].forEach(fieldType =>
	widgets.avg.add(fieldType, denseAverage));

widgets.transform.add('probes', reorderFieldsTransform(zoomableDataToHeatmap));
widgets.transform.add('geneProbes', reorderFieldsTransform(geneProbesToHeatmap));
widgets.transform.add('genes', reorderFieldsTransform(zoomableDataToHeatmap));
widgets.transform.add('clinical', reorderFieldsTransform(dataToHeatmap));

widgets.specialDownload.add('clinical', downloadCodedSampleListsJSON);

module.exports = {
	fetch,
	fetchGeneOrChromProbes,
	fetchGene,
	fetchFeature,
	getCustomColor,
	toArrays,
	setUserCodes,
	reOrderFields
};
