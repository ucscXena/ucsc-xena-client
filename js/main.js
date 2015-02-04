/*jslint browser: true, regexp: true, vars: true */
/*global define: false, require: false */

define(['jquery',
		'underscore_ext',
		'rx',
		'columnModels',
		'spreadsheet',
		'sheetWrap',
		'multi',
		'columnUi',
		'uuid',
		'cursor',
		'plotDenseMatrix',
		'plotMutationVector',
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
			uuid,
			cursor) {

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
			};
	}

	var model = columnModels(); // XXX global for testing
	var HEIGHT = 717;

	var unload = Rx.Observable.fromEvent(window, 'beforeunload');
	// XXX does this work if no state events occur?? Looks like not.

	function keysNot_(obj) {
		return _.filter(_.keys(obj), function (x) { return x.indexOf('_') !== 0; });
	}

	function keys_(obj) {
		return _.filter(_.keys(obj), function (x) { return x.indexOf('_') === 0; });
	}

	unload.combineLatest(model.state, function (_e, state) {
		return _.pick(state, keysNot_(state));
	}).subscribe(function (state) {
		sessionStorage.xena = JSON.stringify(state);
	});

	var defaultServers = ['https://genome-cancer.ucsc.edu:443/proj/public/xena', 'http://localhost:7222'];

	var childrenStream = new Rx.Subject();
	model.addStream(childrenStream);
	var writeState = function (fn) { childrenStream.onNext(fn); };
	var spreadsheetPaths = {
		cohort: ['cohort'],
		height: ['height'],
		zoomIndex: ['zoomIndex'],
		zoomCount: ['zoomCount'],
		samplesFrom: ['samplesFrom'],
		samples: ['samples'],
		servers: ['servers'],
		_sources: ['_sources'],
		column_rendering: ['column_rendering'],
		_column: ['_column'],
		column_order: ['column_order'],
		//columnEditOpen: ['columnEditOpen'],
		mode: ['mode'],
		chartState: ['chartState'],
		data: ['_column_data']
	};
	var spreadsheetState = model.state.pluckPathsDistinctUntilChanged(spreadsheetPaths).share();
	var spreadsheetCursor = cursor(writeState, spreadsheetPaths);

	var thisSheetWrap = sheetWrap.create({
		$anchor: $('#main'),
		state: spreadsheetState,
		cursor: spreadsheetCursor,
		servers: defaultServers
	});
	var $spreadsheet = $('.spreadsheet');
	var $debug = $('.debug');

	$spreadsheet.resizable({ handles: 's' });

	// XXX handler might leak
	// changing either the canvas or the .samplePlot
	var resizes = $spreadsheet.onAsObservable("resizestop")
		.select(function (ev) {
				return function (s) {
					var diff = ev.additionalArguments[0].size.height
							- ev.additionalArguments[0].originalSize.height,
						// TODO it would be best to retrieve the state.height here
						// and replace it with: diff + state.height
						// The below does not work if a sparse mutation plot is first.
						// If we do the above, we won't have a DOM lookup, so the below
						// concern about DOM lookup is not an issue. The use of the jquery-ui
						// resize has been greatly simplified by allowing the elements to 
						// shrink-wrap around their content, rather than trying to calc their sizes.
						// Only the canvas size is set, nothing else.
						$column = $('.spreadsheet-column:first'),
					// The state-mutating functions should really be pure functions, for the sake
					// of our sanity. So, DOM lookups should be done elsewhere.
					// headHeight is really a constant & could be looked up once. This handler should
					// see it as a constant.
					// The reason we have to do this at all is that the resize handles are on a different
					// element than the one we resize. The real fix is to resolve that discrepancy such
					// that we're getting the correct height values. Dunno if jquery-ui will let us
					// resize with a proxy element, but if not we should write our own resize. We should
					// really do that anyway, and ditch jquery-ui. :-p
						headHeight = $column.height() - $column.find('.samplePlot canvas').height();
					return _.assoc(s, 'height', ev.additionalArguments[0].size.height - headHeight);
				};
		});

	model.addStream(resizes);


	// COLUMN STUB

	function createColumn() {
		try {
			var newcol = JSON.parse($('#columnStub').val());
			debugstream.onNext(function (s) {
				var id = uuid();
				return _.assoc(_.assoc_in(s, ['column_rendering', id], newcol),
					'column_order', s.column_order.concat([id]));
			});
		} catch (e) {
			console.log('error', e);
		}
	}

	var debugstream = new Rx.Subject();
	model.addStream(debugstream);
	var debugtext = $('<textarea  id="columnStub" rows=20 cols=130></textarea>');
	debugtext.hide();
	$debug.append(debugtext);

	debugtext.on('keydown', function (ev) {
		if (ev.keyCode === 13 && ev.shiftKey === true) {
			createColumn(ev);
		}
	});

	// SAMPLES STUB

	function applySamples(ev) {
		try {
			var json = JSON.parse($('#samplesStub').val());
			debugstream.onNext(function (s) {
				return _.extend(_.pick(s, keys_(s)),
								_.pick(json, keysNot_(json)));
			});
		} catch (e) {
			console.log('error', e);
		}
	}

	var debugstate = $('<textarea id="samplesStub" rows=20 cols=50></textarea>');
	$debug.append(debugstate);

	debugstate.on('keydown', function (ev) {
		if (ev.keyCode === 13 && ev.ctrlKey === true) {
			applySamples(ev);
		}
	});

	$(document).ready(function () {
		var debug_stream = model.state.replay(null, 1),
			start,
			sub;

		debug_stream.connect();

		if (sessionStorage && sessionStorage.xena) {
			// XXX error handling?
			start = JSON.parse(sessionStorage.xena);
			start["_column"] = {};
			start["_sources"] = [];
		} else {
			start = {
				"chartState": null,
				"mode": "heatmap",
				"samples": [],
				"samplesFrom": "",
				"servers": {'default': defaultServers, user: defaultServers},
				 "_sources": [],
				"height": HEIGHT,
				"zoomIndex": 0,
				"zoomCount": 100,
				"column_rendering": {},
				"_column": {},
				"column_order": []
			};
		}
		model.addStream(Rx.Observable.returnValue(function (s) { return start; }));

		$('.samplesFromAnchor').onAsObservable('click')
			.subscribe(function (ev) {
				$('.debug').toggle();
				if (sub) {
					sub.dispose();
				} else {
					sub = debug_stream.subscribe(function (s) {
						$('#samplesStub').val(JSON.stringify(_.pick(s, keysNot_(s)), undefined, 4));
					});
				}
			});
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
