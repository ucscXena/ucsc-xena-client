/*jslint browser: true, regexp: true */
/*global define: false, require: false */

define(['jquery',
		'underscore_ext',
		'rx',
		'columnModels',
		'spreadsheet',
		'sheetWrap',
		'multi',
		'columnUi',
		'probe_column',
		'spatialExonSparsePlot',
		'uuid',
		'cursor',
		'stub',
		'lib/jquery-ui',
		'rx.async'], function (
			$,
			_,
			Rx,
			columnModels,
			spreadsheet,
			sheetWrap,
			multi,
			columnUi,
			probe_column,
			spatialExonSparsePlot,
			uuid,
			cursor,
			stub) {

	'use strict';

	function identity(x) { return x; }

	// set default column_order and column_rendering somewhere?
	// pass column_order to spreadsheet.js

	// Returns a caching observable factory. If multiple callers request the same
	// observable, a single observable will be shared between them. When all
	// subscriptions are disposed, the observable will be unreferrenced.
	function cacheFactory(observableFactory) { 
			var cache = {};
			return function (key) {
					return cache[key] || (cache[key] = observableFactory(key).finally(function (key) { delete cache[key]; }).share());
			}
	};

	var model = columnModels(); // XXX global for testing
	var HEIGHT = 300;

	var unload = Rx.Observable.fromEvent(window, 'beforeunload');
	// XXX does this work if no state events occur?? Looks like not.

	function keysNot_(obj) {
		return _.filter(_.keys(obj), function (x) { return x.indexOf('_') !== 0; });
	}

	unload.combineLatest(model.state, function (_e, state) {
		return _.pick(state, keysNot_(state));
	}).subscribe(function (state) {
		sessionStorage['state'] = JSON.stringify(state);
	});

	var childrenStream = new Rx.Subject();
	model.addStream(childrenStream);
	var writeState = function (fn) { childrenStream.onNext(fn); };
	var spreadsheetPaths = {
		height: ['height'],
		zoomIndex: ['zoomIndex'],
		zoomCount: ['zoomCount'],
		samples: ['samples'],
		column_rendering: ['column_rendering'],
		column_order: ['column_order'],
		data: ['_column_data']
	};
	var spreadsheetState = model.state.pluckPathsDistinctUntilChanged(spreadsheetPaths);
	var spreadsheetCursor = cursor(writeState, spreadsheetPaths);

/*
	var childrenStream = new Rx.Subject();
	model.addStream(childrenStream);
	var writeState = function (fn) { childrenStream.onNext(fn); };
*/
	var thisSheetWrap = sheetWrap.create({
		$anchor: $('#main'),
		updateColumn: updateColumn,
		state: spreadsheetState,
		cursor: spreadsheetCursor
	});
	var $spreadsheet = $('.spreadsheet');
	var $debug = $('.debug');

	$spreadsheet.css({height: HEIGHT}).resizable();

	// XXX handler might leak
	var resizes = $spreadsheet.onAsObservable("resizestop")
		.select(function (ev) {
				return function (s) { return _.assoc(s, 'height', ev.additionalArguments[0].size.height) };
		});

	model.addStream(resizes);

	model.state.select(function (s) {
		if ($spreadsheet.height() !== s.height) {
			$spreadsheet.height(s.height);
		}
	}).subscribe(); // XXX leaking disposable
/*
	var childrenStream = new Rx.Subject();
	model.addStream(childrenStream);
	var writeState = function (fn) { childrenStream.onNext(fn); };
	var spreadsheetPaths = {
		height: ['height'],
		zoomIndex: ['zoomIndex'],
		zoomCount: ['zoomCount'],
		samples: ['samples'],
		column_rendering: ['column_rendering'],
		column_order: ['column_order'],
		data: ['_column_data']
	};
	var spreadsheetState = model.state.pluckPathsDistinctUntilChanged(spreadsheetPaths);
	var spreadsheetCursor = cursor(writeState, spreadsheetPaths);
*/
	var colsub = spreadsheet(spreadsheetState, spreadsheetCursor, $spreadsheet); // XXX returns disposable

	// COLUMN STUB

	function updateColumn(id) {
		try {
			var newcol = JSON.parse($('#columnStub').val());
			console.log('updateColumn val length: ' + $('#columnStub').val().length);
			debugstream.onNext(function (s) {
				var assoc_in = _.assoc_in(s, ['column_rendering', id], newcol);
				var newOrder = s.column_order.concat([id]);
				var assoc = _.assoc(assoc_in, 'column_order', newOrder);
				return assoc;
				//return _.assoc(_.assoc_in(s, ['column_rendering', id], newcol),
				//	'column_order', s.column_order.concat([id]));
			});
		} catch (e) {
			console.log('error', e);
			console.trace();
		}
	}

	function createColumn() {
		try {
			var newcol = JSON.parse($('#columnStub').val());
			console.log('createColumn val length: ' + $('#columnStub').val().length);
			debugstream.onNext(function (s) {
				var id = uuid();
				columnUi.create(id, {
					sheetWrap: thisSheetWrap,
					updateColumn: updateColumn
				});
				return _.assoc(_.assoc_in(s, ['column_rendering', id], newcol),
					'column_order', s.column_order.concat([id]));
			});
		} catch (e) {
			console.log('error', e);
		}
	}

	var debugstream = new Rx.Subject();
	model.addStream(debugstream);
	var debugtext = $('<textarea  id="columnStub" rows=20 cols=25></textarea>');
	$debug.append(debugtext);
/*
	var columnButton = $('<button id="columnStubApply">apply column</button>');
	$debug.append(columnButton);
	columnButton.on('click', createColumn);
*/
	debugtext.on('keydown', function (ev) {
		if (ev.keyCode === 13 && ev.shiftKey === true) {
			createColumn(ev);
		}
	});

	// SAMPLES STUB

	function applySamples(ev) {
		try {
			var newprops = JSON.parse($('#samplesStub').val());
			debugstream.onNext(function (s) {
				return _.extend({}, s, newprops);
			});
		} catch (e) {
			console.log('error', e);
		}
	}

	var debugstate = $('<textarea id="samplesStub" rows=20 cols=25></textarea>');
	$debug.append(debugstate);
	/*
	var samplesButton = $('<button>apply samples</button>');
	$debug.append(samplesButton);
	samplesButton.on('click', applySamples);
	*/
	debugstate.on('keydown', function (ev) {
		if (ev.keyCode === 13 && ev.shiftKey === true) {
			applySamples(ev);
		}
	});

	var example_samples = $('<button id="pickBrcaSamples">BRCA samples</button>');
	$debug.append(example_samples);
	example_samples.on('click',function (ev) {
		var json = {
			"samples": stub.getSamples('brca'),
			/*
			"samples": [
				"TCGA-E9-A1RD-11", "TCGA-E9-A1RC-01", "TCGA-AC-A3TN-01", "TCGA-BH-A0B1-01", "TCGA-B6-A0RG-01", "TCGA-A8-A07P-01",
				"TCGA-D8-A1JH-01", "TCGA-A2-A0CR-01", "TCGA-BH-A0DS-01", "TCGA-E2-A14S-01", "TCGA-BH-A0HK-11", "TCGA-A2-A0D1-01",
				"TCGA-BH-A18R-01", "TCGA-BH-A0HW-01", "TCGA-E9-A1N8-01", "TCGA-E2-A152-01", "TCGA-BH-A0DQ-01", "TCGA-AO-A0JC-01",
				"TCGA-BH-A18U-11", "TCGA-BH-A0GY-01", "TCGA-B6-A0RO-01", "TCGA-OL-A5RU-01", "TCGA-LL-A50Y-01", "TCGA-LL-A5YM-01",
				"TCGA-AC-A23G-01", "TCGA-AC-A62Y-01", "TCGA-A8-A08B-01", "TCGA-D8-A1XO-01", "TCGA-A8-A07W-01", "TCGA-BH-A18S-01",
				"TCGA-A8-A085-01", "TCGA-B6-A0X1-01", "TCGA-A8-A08X-01", "TCGA-PE-A5DE-01", "TCGA-A2-A3XX-01", "TCGA-A7-A0CD-01",
				"TCGA-AR-A2LK-01", "TCGA-OL-A66K-01", "TCGA-E2-A14Z-01", "TCGA-A2-A0CO-01", "TCGA-B6-A0WT-01", "TCGA-AR-A0TZ-01",
				"TCGA-AC-A23C-01", "TCGA-E2-A1L9-01", "TCGA-AO-A12F-01", "TCGA-A8-A08G-01", "TCGA-E2-A10F-01", "TCGA-D8-A1XY-01",
				"TCGA-D8-A3Z6-01", "TCGA-BH-A0B0-01", "TCGA-BH-A1FU-01", "TCGA-PE-A5DC-01", "TCGA-A2-A0SU-01", "TCGA-AN-A0AK-01",
				"TCGA-E9-A1N6-01", "TCGA-A2-A0T5-01", "TCGA-D8-A1JA-01", "TCGA-A7-A0CH-01", "TCGA-D8-A1JI-01", "TCGA-D8-A1XU-01",
				"TCGA-A8-A086-01", "TCGA-AR-A251-01", "TCGA-E9-A1NA-01", "TCGA-A2-A0D3-01", "TCGA-B6-A0IE-01", "TCGA-AR-A24M-01",
				"TCGA-A1-A0SD-01", "TCGA-A8-A09W-01", "TCGA-AC-A3W6-01", "TCGA-E9-A1NI-01", "TCGA-BH-A1F5-01", "TCGA-A2-A0T0-01",
				"TCGA-A2-A0YK-01", "TCGA-E9-A1R5-01", "TCGA-AR-A1AP-01", "TCGA-BH-A18P-11", "TCGA-BH-A0C7-01", "TCGA-BH-A1FL-01",
				"TCGA-GM-A2DN-01", "TCGA-AC-A2BK-01", "TCGA-C8-A12T-01", "TCGA-A2-A04X-01", "TCGA-AN-A04A-01", "TCGA-AR-A0TX-01",
				"TCGA-BH-A0B7-01", "TCGA-E2-A1IN-01", "TCGA-D8-A27T-01", "TCGA-D8-A1JJ-01", "TCGA-E9-A248-01", "TCGA-C8-A1HG-01",
				"TCGA-EW-A1OW-01", "TCGA-A2-A0T4-01", "TCGA-AO-A12H-01", "TCGA-E9-A1RE-01", "TCGA-B6-A0I6-01", "TCGA-A8-A099-01",
				"TCGA-BH-A0DV-11", "TCGA-E2-A15D-01", "TCGA-A8-A06N-01"
			],
			*/
			"height": HEIGHT,
			"zoomIndex": 0,
			"zoomCount": 100,
			"column_rendering": {},
			"column_order": []
		};
		debugstream.onNext(function(s) {
			return _.extend({}, s, json);
		});
		$('#samplesStub').val(JSON.stringify(json, undefined, 4));
	});

	var nbl_samples = $('<button id="pickSamples">NBL samples</button>');
	$debug.append(nbl_samples);
	nbl_samples.on('click',function (ev) {
		var samples = stub.getSamples('nbl'),
			json = {
			"samples": samples,
			"height": HEIGHT,
			"zoomIndex": 0,
			"zoomCount": samples.length,
			"column_rendering": {},
			"column_order": []
		};
		debugstream.onNext(function(s) {
			return _.extend({}, s, json);
		});
		$('#samplesStub').val(JSON.stringify(json, undefined, 4));
	});

	var example_column1 = $('<button>Sample column 1</button>');

	$debug.append(example_column1);

	$debug.offset({
		top: $debug.offset().top + 50,
		left: $debug.offset().left
	});

	example_column1.on('click',function (ev) {
		var newcol =  {
			"width":200,
			"dsID": "http://cancerdb:7222/public/TCGA/TCGA.BRCA.sampleMap/Gistic2_CopyNumber_Gistic2_all_data_by_genes",
			"dataType": "nonspatial",
			"fields": [
				"ACAP3", "ACTRT2", "AGRN", "ANKRD65", "ATAD3A", "ATAD3B", "ATAD3C", "AURKAIP1",
				"B3GALT6", "C1orf159", "C1orf170", "C1orf233", "C1orf86", "CALML6", "CCNL2",
				"CDK11A", "CDK11B", "CPSF3L", "DDX11L1", "DVL1", "FAM132A", "FAM138A", "FAM138F",
				"FAM213B", "FAM41C", "FLJ42875", "GABRD", "GLTPD1", "GNB1", "HES4", "HES5",
				"ISG15", "KIAA1751", "KLHL17", "LINC00115", "LOC100129534", "LOC100130417", "LOC100132062",
				"LOC100132287"
			]
		};

		debugstream.onNext(function (s) {
			var id = uuid();
			return _.assoc(_.assoc_in(s, ['column_rendering', id], newcol),
				'column_order', s.column_order.concat([id]));
		});
		$('#columnStub').val(JSON.stringify(newcol, undefined, 4));
	});

	$(document).ready(function () {
		if (sessionStorage && sessionStorage['state']) {
			// XXX error handling?
			model.addStream(Rx.Observable.returnValue(function () { return JSON.parse(sessionStorage['state']) }));
		}
		//$('.debug').hide();
		$('#pickSamples').click();
		$('.addColumn').click();
	});


//	var cols = $('<div></div>');
//	$spreadsheet.append(cols);
//	cols.append($('<div style="display:inline-block">one</div><div style="display:inline-block">two</div><div style="display:inline-block">three</div>'));
//	$(cols).children().resizable({handles: "e"});
});

//define(['jquery', 'config', 'compat', 'assembly', 'genomicPosition', 'browser', 'error',
//		'lib/backbone',
//		// non-object dependencies
//		'lib/preloadCssImages.jQuery',
//		'lib/wrapJquery'
//	], function ($, config, compat, assembly, genomicPosition, browser, error, Backbone) {
//	'use strict';
//
//	var ajaxErrorRetry = function (xhr, textStatus, errorThrown) {
//		var err;
//		if (xhr.status === 400) {
//			try {
//				err = JSON.parse(xhr.responseText);
//			} catch (e) {
//				if (!e instanceof SyntaxError) {
//					throw e;
//				}
//			}
//			if (err && err.reload) {
//				error.warning.call(this, err.error, true);
//				return;
//			}
//		}
//		if ((textStatus === 'timeout' || xhr.status === 500) && this.retryLimit > 0) {
//			this.retryLimit -= 1;
//			$.ajax(this);
//			return;
//		}
//		if (this.fail) {
//			this.fail(xhr, textStatus, errorThrown);
//		} else {
//			error.ajax.apply(this, arguments);
//		}
//	};
//
//	// replaces Backbone's wrapError
//	function wrapError(onError, model, options) {
//		options.fail = function (xhr, textStatus, errorThrown) {
//			if (onError) {
//				onError(xhr, textStatus, errorThrown);
//			} else {
//				model.trigger('error', model, xhr, options);
//				error.ajax.apply(this, arguments);
//			}
//		};
//		return ajaxErrorRetry;
//	}
//
//	$(document).ready(function () {
//		var gp;
//		compat.check();
//		if (config.DEBUG) {
//			require(['debug']);
//		}
//
//		Backbone.wrapError = wrapError;
//
//		$.ajaxSetup({
//			beforeSend: function (xhr, settings) {
//				function getCookie(name) {
//					var cookieValue = null,
//						cookies = document.cookie.split(';'),
//						cookie,
//						i;
//					if (document.cookie && document.cookie !== '') {
//						for (i = 0; i < cookies.length; i += 1) {
//							cookie = $.trim(cookies[i]);
//							// Does this cookie string begin with the name we want?
//							if (cookie.substring(0, name.length + 1) === (name + '=')) {
//								cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
//								break;
//							}
//						}
//					}
//					return cookieValue;
//				}
//				if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
//					// Only send the token to relative URLs i.e. locally.
//					xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
//				}
//			},
//			headers: {
//				'Cancer-Browser-Api': config.API_VERSION
//			},
//			retryLimit: 3,
//			error: ajaxErrorRetry
//		});
//
//		$.preloadCssImages();
//		gp = genomicPosition.factory({storageId: 'genomicPosition'});
//		$.when(assembly('hg18')).done(function (assembly) {
//			gp.assembly(assembly); // set default position XXX move this?
//			gp.set('mode', 'chrom');
//			gp.set('chromPos', null);
//			browser.init(gp);
//		});
//	});
//});
