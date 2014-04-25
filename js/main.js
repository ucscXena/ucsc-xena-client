/*jslint browser: true, regexp: true */
/*global define: false, require: false */

define(['haml!haml/spreadsheet',
		'jquery',
		'underscore_ext',
		'rx',
		'columnModels',
		'spreadsheet',
		'multi',
		'probe_column',
		'uuid',
		'cursor',
		'lib/jquery-ui',
		'rx.async'], function (
			template,
			$,
			_,
			Rx,
			columnModels,
			spreadsheet,
			multi,
			probe_column,
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
			}
	};

	var model = columnModels(); // XXX global for testing

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

	$('#main').append(template());
	var topdiv = $('.spreadsheet');

	topdiv.css({height: 100}).resizable();

	// XXX handler might leak
	var resizes = topdiv.onAsObservable("resizestop")
		.select(function (ev) {
				return function (s) { return _.assoc(s, 'height', ev.additionalArguments[0].size.height) };
		});

	model.addStream(resizes);

	model.state.select(function (s) {
		if (topdiv.height() !== s.height) {
			topdiv.height(s.height);
		}
	}).subscribe(); // XXX leaking disposable

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
	var colsub = spreadsheet(spreadsheetState, spreadsheetCursor, topdiv); // XXX returns disposable

	var debugstream = new Rx.Subject();
	model.addStream(debugstream);
	var debugtext = $('<textarea></textarea>');
	topdiv.parent().append(debugtext);
	debugtext.on('keydown', function (ev) {
		var newcol;
		if (ev.keyCode === 13 && ev.shiftKey === true) {
			try {
				newcol = JSON.parse(ev.target.value);
				debugstream.onNext(function (s) {
					var id = uuid();
					return _.assoc(_.assoc_in(s, ['column_rendering', id], newcol),
					   	'column_order', s.column_order.concat([id]));
				});
			} catch (e) {
				console.log('error', e);
			}
		}
	});
	var debugstate = $('<textarea></textarea>');
	topdiv.parent().append(debugstate);
	debugstate.on('keydown', function (ev) {
		var newcol;
		if (ev.keyCode === 13 && ev.shiftKey === true) {
			try {
				var newprops = JSON.parse(ev.target.value);
				debugstream.onNext(function (s) {
					return _.extend({}, s, newprops);
				});
			} catch (e) {
				console.log('error', e);
			}
		}
	});



	$(document).ready(function () {
		if (sessionStorage && sessionStorage['state']) {
			// XXX error handling?
			model.addStream(Rx.Observable.returnValue(function () { return JSON.parse(sessionStorage['state']) }));
		}
	});


//	var cols = $('<div></div>');
//	topdiv.append(cols);
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
