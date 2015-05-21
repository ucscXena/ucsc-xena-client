/*jslint nomen:true, browser: true */
/*global define: false */
define(['underscore_ext',
		'jquery',
		'rx',
		'refGeneExons',
		'columnWidgets',
		'crosshairs',
		'heatmapColors',
		'mutationVector',
		'sheetWrap',
		'vgcanvas',
		'xenaQuery',
		'annotation',
		'ga4ghQuery',
		'rx-jquery'
	], function (
		_,
		$,
		Rx,
		refGeneExons,
		widgets,
		crosshairs,
		heatmapColors,
		mutationVector,
		sheetWrap,
		vgcanvas,
		xenaQuery,
		annotation,
		ga4ghQuery) {

	"use strict";

	var map = _.map,
		isUndefined = _.isUndefined,
		pluckPathsArray = _.pluckPathsArray,
		cmp,
		fetch,
		render;

	function ifChanged(paths, fn) { // TODO duplicated in each plot*.js
		return function (state, previousState, lastResult) {
			var pluckedState = pluckPathsArray(paths, state),
				pluckedPreviousState;
			if (previousState) {
				pluckedPreviousState = pluckPathsArray(paths, previousState);
				if (_.isEqual(pluckedState, pluckedPreviousState)) {
					return lastResult;
				}
			}
			return fn.apply(this, pluckedState);
		};
	}

	function cmpRowOrNull(v1, v2, refGene) {
		if (isUndefined(v1) && isUndefined(v2)) {
			return 0;
		} else if (isUndefined(v1)) {
			return 1;
		} else if (isUndefined(v2)) {
			return -1;
		}
		return mutationVector.rowOrder(v1, v2, refGene);
	}

	function cmpSamples(probes, data, refGene, s1, s2) {
		return _.findValue(probes, function (f) {
			return (data && data[f] && refGene) ? cmpRowOrNull(data[f][s1], data[f][s2], refGene) : 0;
		});
	}

	function mutation_attrs(list) {
		return _.map(list, function (row) {
			return {
				"sample": row.sampleid,
				"chr": row.chrom,
				"start": row.chromstart,
				"end": row.chromend,
				"gene": row.gene,
				"reference": row.ref,
				"alt": row.alt,
				"effect": row.effect,
				"amino_acid": row.amino_acid,
				"rna_vaf": xenaQuery.nanstr(row.rna_vaf),
				"dna_vaf": xenaQuery.nanstr(row.dna_vaf)
			};
		});
	}

	// Build index of genes -> samples -> matching rows.
	// If the sample appears in the dataset but has no matching rows, matching rows should be set to [].
	// If the sample does not appear in the dataset, matching rows should be undefined.
	// Requested samples that appear in the dataset are in resp.sample.
	function index_mutations(gene, samples, resp) {
		var rows_by_sample = _.groupBy(mutation_attrs(resp.rows), 'sample'),
			no_rows = _.difference(resp.samples, _.keys(rows_by_sample)),
			vals = _.extend(rows_by_sample, _.object_fn(no_rows, _.constant([]))), // merge in empty arrays for samples w/o matching rows.
			obj = {};

		obj[gene] = vals;
		return {values: obj};
	}

	function splitExon(s) {
		return _.map(s.replace(/,$/, '').split(','), _.partial(parseInt, _, 10));
	}

	function refGene_attrs(row) {
		return {
			name2: row.name2,
			strand: row.strand,
			txStart: row.txstart,
			txEnd: row.txend,
			cdsStart: row.cdsstart,
			cdsEnd: row.cdsend,
			exonCount: row.exoncount,
			exonStarts: splitExon(row.exonstarts),
			exonEnds: splitExon(row.exonends)
		};
	}

	function index_refGene(resp) {
		return _.object(_.pluck(resp, 'name2'), _.map(resp, refGene_attrs));
	}

	cmp = ifChanged(
		[
			['column', 'fields'],
			['data', 'req', 'values'],
			['data', 'refGene']
		],
		function (fields, data, refGene) {
			return _.partial(cmpSamples, fields, data, refGene);
		}
	);

	var refgene_host = "https://genome-cancer.ucsc.edu/proj/public/xena"; // XXX hard-coded for now
	function ga4ghAnnotations({url, dsID}, [probe]) {
		return xenaQuery.reqObj(xenaQuery.xena_post(refgene_host, xenaQuery.refGene_gene_pos(probe)), function (r) {
			return Rx.DOM.ajax(r).map(xenaQuery.json_resp).selectMany(([gene]) =>
				gene ? ga4ghQuery.variants({
					url: url,
					 dataset: dsID,
					 start: gene.txstart,
					 end: gene.txend,
					 chrom: gene.chrom
				}) :
				Rx.Observable.return([]));
		});
    }

	fetch = ifChanged(
		[
			['column', 'dsID'],
			['column', 'fields'],
			['samples'],
            ['annotations']
		],
		xenaQuery.dsID_fn(function (host, ds, probes, samples, annotations) {
			var annQueries = _.object(_.map(annotations,
				([, a], i) => [`annotation${i}`, ga4ghAnnotations(a, probes)]));
			return _.merge({
				req: xenaQuery.reqObj(xenaQuery.xena_post(host, xenaQuery.sparse_data_string(ds, samples, probes)), function (r) {
					return Rx.DOM.ajax(r).select(_.compose(_.partial(index_mutations, probes[0], samples), xenaQuery.json_resp));
				}),
				refGene: xenaQuery.reqObj(xenaQuery.xena_post(refgene_host, xenaQuery.refGene_exon_string(probes)), function (r) {
					return Rx.DOM.ajax(r).select(_.compose(index_refGene, xenaQuery.json_resp));
				})
			}, annQueries);
		})
	);

	function dataToPlot(sorted_samples, dataIn, probes) {
		var data = dataIn;
		return map(probes, function (p) {
			var probeVals = map(sorted_samples, function (s) {
				return {
					sample: s,
					vals: data[p][s]
				};
			});
			return {
				probe: p,
				values: probeVals
			};
		});
	}

	function syncAnnotations(cache, ants, id, width, data) {
		var keys = _.map(ants, ([type, {url, field}]) => [type, url, field].join('::')),
			current = _.keys(cache),
			headerPlot = $('#' + id + ' .headerPlot');
		_.each(_.difference(keys, current), (key, i) => {
			var vg = cache[key] = vgcanvas(width, ants[i][1].height);
			$(vg.element()).addClass('annotation');
			headerPlot.prepend(vg.element());
		});
		_.each(_.difference(current, keys), key => {
			$(cache[key].element()).remove();
			delete cache[key];
		});
		_.each(keys, (key, i) => {
			if (cache[key].height() !== ants[i][1].height) {
				cache[key].height(ants[i][1].height);
			}
			if (cache[key].width() !== width) {
				cache[key].width(width);
			}
			if (data.refGene && _.get_in(data, ['annotation' + i, 'length'])) {
				annotation.draw(ants[i], cache[key], data['annotation' + i],
						refGeneExons.get(id).mapChromPosToX);
			}
		});
	}

	render = ifChanged(
		[
			['disp'],
			['el'],
			['wrapper'],
			[],
			['sort'],
			['sFeature'], // TODO ref sFeature rather than column.sFeature
			['data'],
			['annotations']
		],
		// samples are in sorted order
		function (disp, el, wrapper, ws, sort, sFeature, data, annotations) {
			var local = disp.getDisposable(),
				column = ws.column,
				vg,
				plotData,
				columnUi,
				dims = sheetWrap.columnDims(),
				refGeneData,
				refGene,
				canvasHeight = ws.height + (dims.sparsePad * 2),
				color = heatmapColors.range(column, {valueType: 'codedWhite'}, ['No Mutation', 'Has Mutation'], [0, 1]);

			if (!local || local.render !== render) { // Test if we own this state
				local = new Rx.Disposable(function () {
					$(vg.element).remove();
				});
				local.render = render;
				disp.setDisposable(local);
				local.vg = vgcanvas(column.width, canvasHeight);
				local.columnUi = wrapper(el.id, _.assoc(ws, 'colors', [color]));
				local.columnUi.$samplePlot.append(local.vg.element());
				local.annotations = {};
			}

			vg = local.vg;
			columnUi = local.columnUi;

 			if (vg.width() !== column.width) {
 				vg.width(column.width);
 			}
 			if (vg.height() !== canvasHeight) {
 				vg.height(canvasHeight);
 			}

			columnUi.setHeight(annotations);

			refGeneData = data.refGene[column.fields[0]];
			//refGeneData = stub.getRefGene(column.fields[0]); // for testing
			//data.req.values = stub.getMutation(column.fields[0]); // for testing
			if (refGeneData) {
				refGeneExons.show(el.id, {
					data: { gene: refGeneData }, // data.refGene,
					plotAnchor: '#' + el.id + ' .headerPlot',
					$sidebarAnchor: columnUi.$headerSidebar,
					width: column.width,
					radius: sheetWrap.columnDims().sparseRadius,
					refHeight: sheetWrap.columnDims().refHeight
				});
				if (data.req.values) { // TODO sometimes data.req is empty
					refGene = refGeneExons.get(el.id);
					if (refGene) {
						plotData = dataToPlot(sort, data.req.values, ws.column.fields);
						columnUi.plotData = {
							values: plotData[0].values,
							samples: sort,
							ws: ws,
							derivedVars: ['gene', 'effect', 'dna_vaf', 'rna_vaf', 'amino_acid']
						};
						columnUi = wrapper(el.id, _.assoc(ws, 'colors', [color]));
						columnUi.setPlotted();
						mutationVector.show(el.id, {
							vg: vg,
							width: column.width,
							height: canvasHeight,
							zoomIndex: ws.zoomIndex,
							zoomCount: ws.zoomCount,
							data: plotData[0].values,
							color: 'category_25', // TODO make dynamic
							dataset: column.dsID,
							feature: column.sFeature,
							radius: dims.sparseRadius,
							sparsePad: dims.sparsePad,
							horizontalMargin: dims.horizontalMargin,
							point: 0.5, // TODO make dynamic
							columnUi: columnUi,
							refGene: refGene
						});
					}
				}
			}
			else if (refGene){
				vg.box(0, 0, column.width, ws.height, "white");
			}
			else {
				vg.box(0, 0, column.width, ws.height, "gray");
			}

			// Have to draw this after refGene, because it depends on
			// scaling that is mixed up with refGene state.
			syncAnnotations(local.annotations, annotations, el.id, column.width,
					data);
		}
	);

	widgets.cmp.add("mutationVector", cmp);
	widgets.fetch.add("mutationVector", fetch);
	widgets.render.add("mutationVector", render);
});
