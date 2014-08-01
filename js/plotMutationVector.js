/*jslint nomen:true, browser: true */
/*global define: false */
define(['underscore_ext', 'jquery', 'rx', 'exonRefGene', 'columnWidgets', 'crosshairs', 'heatmapColors', 'mutationVector', 'sheetWrap', 'stub', 'vgcanvas', 'xenaQuery', 'rx.jquery'
	], function (_, $, Rx, exonRefGene, widgets, crosshairs, heatmapColors, mutationVector, sheetWrap, stub, vgcanvas, xenaQuery) {

	"use strict";

	var each = _.each,
		map = _.map,
		filter = _.filter,
		isUndefined = _.isUndefined,
		zip = _.zip,
		range = _.range,
		bind = _.bind,
		find = _.find,
		keys = _.keys,
		pluckPathsArray = _.pluckPathsArray,
		uniq = _.uniq,
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

	function cmpNumberOrNull(v1, v2) {
		if (isUndefined(v1) && isUndefined(v2)) {
			return 0;
		} else if (isUndefined(v1)) {
			return 1;
		} else if (isUndefined(v2)) {
			return -1;
		}
		return mutationVector.cmpValue(v1) - mutationVector.cmpValue(v2);
	}

	function cmpSamples(probes, data, s1, s2) {
		var diff = data && find(probes, function (f) {
				return data[f] && cmpNumberOrNull(data[f][s1], data[f][s2]);
			});
		if (diff) {
			return cmpNumberOrNull(data[diff][s1], data[diff][s2]);
		} else {
			return 0;
		}
	}

	cmp = ifChanged(
		[
			['column', 'fields'],
			['data', 'req', 'values']
		],
		function (fields, data) {
			return _.partial(cmpSamples, fields, data);
		}
	);

	fetch = ifChanged(
		[
			['column', 'dsID'],
			['column', 'fields'],
			['samples']
		],
		function (dsID, probes, samples) {
			var hostds = xenaQuery.parse_host(dsID),
				host = hostds[1],
				ds = hostds[2],
				sparse = stub.getMutation(dsID, probes[0]),

				// transform sparse data to one row per sample
				// TODO this maybe should go in the render routine.
				//      not sure of the format from the server.
				data = _.object(probes, _.map(probes, function (v, i) {
					return _.object(samples, _.map(samples, function (s) {
						if (sparse.samples.indexOf(s) > -1) {
							return _.filter(sparse.vals, function (v) {
								return v.sample === s;
							});
						} else {
							return undefined;
						}
					}));
				}));
			return {
				req: xenaQuery.reqObj(xenaQuery.xena_post(host, xenaQuery.sparse_data_string(ds, samples, probes)), function (r) {
					return Rx.Observable.return({ values: data });
				}),
			};
		}
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

	render = ifChanged(
		[
			['disp'],
			['el'],
			[],
			['sort'],
			['data']
		],
		// samples are in sorted order
		function (disp, el, ws, sort, data) {
			var local = disp.getDisposable(),
				column = ws.column,
				vg,
				plotData,
				colors,
				columnUi,
				dims = sheetWrap.columnDims(),
				refGeneData,
				refGene,
				canvasHeight = ws.height + (dims.sparsePad * 2);

			if (!local || local.render !== render) { // Test if we own this state
				local = new Rx.Disposable(function () {
					$(vg.element).remove();
				});
				local.render = render;
				disp.setDisposable(local);
				local.vg = vgcanvas(column.width, canvasHeight);
				local.columnUi = sheetWrap.columnShow(el.id, ws);
				local.columnUi.$samplePlot.append(local.vg.element());
			}

			vg = local.vg;
			columnUi = local.columnUi;

			if (vg.width() !== column.width) {
				vg.width(column.width);
			}

			if (vg.height() !== canvasHeight) {
				vg.height(canvasHeight);
			}

			refGeneData = stub.getRefGene(ws.column.fields[0]); // TODO yikes, forcing proper refGene for demo
			if (refGeneData) {
				exonRefGene.show(el.id, {
					data: { gene: refGeneData }, // data.refGene,
					plotAnchor: '#' + el.id + ' .headerPlot',
					$sidebarAnchor: columnUi.$headerSidebar,
					width: column.width,
					radius: sheetWrap.columnDims().sparseRadius,
					refHeight: sheetWrap.columnDims().headerPlotHeight
				});
				if (data.req.values) { // TODO sometimes data.req is empty
					refGene = exonRefGene.get(el.id);
					if (refGene) {
						plotData = dataToPlot(sort, data.req.values, ws.column.fields);
						columnUi.plotData = {
							values: plotData[0].values,
							// TODO derivedVars should come in server response
							derivedVars: ['gene', 'effect', 'DNA_AF', 'RNA_AF', 'Amino_Acid_Change']
						};
						mutationVector.show(el.id, {
							vg: vg,
							width: column.width,
							height: canvasHeight,
							zoomIndex: ws.zoomIndex,
							zoomCount: ws.zoomCount,
							data: plotData[0].values,
							color: 'category_25', // TODO make dynamic
							dataset: column.dsID,
							feature: column.ui.sFeature,
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
		}
	);

	widgets.cmp.add("mutationVector", cmp);
	widgets.fetch.add("mutationVector", fetch);
	widgets.render.add("mutationVector", render);
});
