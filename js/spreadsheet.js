/*jslint vars:true */
/*globals define: false, $: false */
define(['underscore_ext',
		'jquery',
		'rx',
		'columnWidgets',
		'rx.binding',
		'rx.async', // needed?
		'rx.jquery',
		'rx.dom',
		'rx.ext'], function (_, $, Rx, widgets) {

	"use strict";

	function snoop(x) {
		console.log(x);
		return x;
	}

	// XXX If we created utility functions for updating the column list/table,
	// we could have them maintain an index. That would resolve the problem
	// of wanting relational data model, but also needing indexes. The add and
	// remove methods would simply add or remove from the index. The sort method
	// would rebuild the index. How would loading from history/session work?
	function reorderColumns(order, upd, state) {
		return upd.assoc_in(state, ["column_order"], order);
	}

	function setWidth(uuid, width, upd, state) {
		return upd.assoc_in(state, ['column_rendering', uuid, 'width'], width);
	}

	// could use a _.curry call to make this simpler
	function deleteColumn(uuid, upd, state) {
		var cols = _.dissoc(upd.get_in(state, ['column_rendering']), uuid),
			order = _.without(upd.get_in(state, ['column_order']), uuid);
		return upd.assoc_in(
			upd.assoc_in(state, ['column_order'], order),
			['column_rendering'],
			cols
		);
	}

	function cmpString(s1, s2) {
		if (s1 > s2) {
			return 1;
		} else if (s2 > s1) {
			return -1;
		}
		return 0;
	}

	function findTargetColumn(ev) {
		var $target = $(ev.target);
		if (!$target.hasClass('spreadsheet-column')) {
			$target = $target.parents('.spreadsheet-column');
		}
		return $target;
	}

	function deleteHandler(id, cursor) {
		return cursor.set(_.partial(deleteColumn, id));
	}

	function spreadsheetWidget(state, cursor, parent) {
		// XXX why is replay necessary? Seems to be so we get the sessionStorage, but is this
		// really the right way to get it??
		var curr = [],    // current uuids in order
			cels = {},    // current divs by uuid
			children = {}, // child disposables
			el = $('<div></div>'),
			subs = new Rx.CompositeDisposable();

		state = state.replayWhileObserved(1); // XXX move this to columnModels? So widgets can get latest state?
		el.sortable({
			axis: 'x',
			placeholder: "ui-state-highlight",
			forcePlaceholderSize: true
		});

		// jquery-ui horizontal sortable bug
		// https://github.com/angular-ui/ui-sortable/issues/19
		el.data('ui-sortable').floating = true;

		parent.append(el);

		// XXX It's unclear to me whether we leak this handler when
		// the DOM element is destroyed. onAsObservable doesn't appear
		// to have any special handling. Is any needed?
		subs.add(el.onAsObservable("sortstop")
			.subscribe(function () {
				var allcols = el.children();
				curr = _.map(allcols, function (e) { return e.id; });
				cels = _.object(curr, allcols);
				return cursor.set(_.partial(reorderColumns, curr));
			})
		);

		subs.add(el.onAsObservable("resizestop")
			.subscribe(function (ev) {
				ev.stopPropagation();
				cursor.set(
					_.partial(setWidth,
						ev.additionalArguments[0].element.prop('id'),
						ev.additionalArguments[0].size.width)
				);
			})
		);

		subs.add(el.onAsObservable('click')
			.filter(function (ev) {
				return findTargetColumn(ev).length
					&& ev.shiftKey === true;
			})

			.subscribe(function (ev) {
				var $target = findTargetColumn(ev),
					id = $target.attr('id');
				return deleteHandler(id, cursor);
			})
		);

		var widgetStates = state.select(function (s) {
			return _.fmap(s.column_rendering, function (col, uuid) {
				return _.pluckPaths({
					cohort: ['cohort'],
					height: ['height'], // XXX refactor vertical position info into an object
					zoomIndex: ['zoomIndex'],
					zoomCount: ['zoomCount'],
					samples: ['samples'],
					column: ['column_rendering', uuid]
				}, s);
			});
		}).share();

		// requests
		// renderers need this to draw. data needs this to update queries.
		// per-widget, mapping of ids->queries
		// {
		//	'123-234': {'CUL1': {'grotto://(CUL1)': {post_data}}, 'avg': {'grotto://(avg CUL2)': {post_data}}' }
		// }

		// XXX We only need this to look up the data. Can we combine
		// this with widgetStates, above? The scanPrevious gives us a
		// cache. Also, we need reqs to do the data fetchs, just below.

		var reqs = widgetStates.scanPrevious({}, {}, function (acc, prevState, state) {
			return _.fmap(state, function (c, uuid) {
				return widgets.fetch(c, prevState[uuid], acc[uuid]);
			});
		}).share();

		// mapping of queries to data
		// are samples represented here somewhere? We index them by sample?
		// {
		//  'grotto://(CUL1)': [1,2,3], 'grotto://(avg CUL2)': [4,5,6]
		// }

		// This recomputes a lot. Can we use a scan or something?
		// Does fmap leak streams if the uuid stays the same but
		// the query changes?
		subs.add(reqs.select(function (r) {
			return _.reduce(r, function (acc, col_reqs, uuid) { 
				_.each(col_reqs, function (req) {
					acc[req.id] = req.query;
				});
				return acc;
			}, {});
		}).fmap().subscribe(function (d) {
			// inject the async results into app state
			cursor.set(function (upd, state) {
				return upd.assoc_in(state, ['data'], d);
			});
		}));

		// data, per-widget
		var data = state.pluck('data').zip(reqs, function (data, reqs) {
			return _.fmap(reqs, function (col_reqs, uuid) {
				return _.fmap(col_reqs, function (req) {
					return (data && data[req.id]) || {};
				});
			});
		});

		var wsData = widgetStates.zip(data, function (ws, data) {
			return _.fmap(ws, function (ws, uuid) {
				return _.assoc(ws, 'data', data[uuid]);
			});
		}).share();

		// cmp functions
		// {
		//   '123-234': fn, ...
		// }
		var cmpfns = wsData.scanPrevious({}, {}, function (acc, prevState, state) {
			return _.fmap(state, function (c, uuid) {
				return widgets.cmp(c, prevState[uuid], acc[uuid]);
			});
		});

		// sort
		// sorted samples
		// [ {cohort: 'a', sample: '1'}, {cohort: 'b', sample: '1'} ]

		var sort = Rx.Observable.zipArray(
			state.pluck('samples'),
			state.pluck('column_order'),
			cmpfns
		).selectMemoize1(_.apply(function (samples, order, cmpfns) {
			console.log('sorting');
			function cmp(s1, s2) {
				var r = 0;
				_.find(order, function (uuid) {
					r = cmpfns[uuid](s1, s2);
					return r !== 0;
				});

				return (r === 0) ? cmpString(s1, s2) : r; // XXX add cohort as well
			}
			return _.clone(samples).sort(cmp);
		}));

		// XXX refactor the DOM update pattern into a utility function
		var domUpdater = Rx.Observable.zipArray(state.pluck('column_order'), widgetStates)
			.doAction(_.apply(function (order, ws) {
				var colupdate = !_.isEqual(curr, order),
					delcols = _.difference(curr, order),
					addcols = _.difference(order, curr);

				_.each(delcols, function (uuid) {
					subs.remove(children[uuid]);
					delete children[uuid];
					$(cels[uuid]).remove();
					delete cels[uuid];
				});

				_.each(addcols, function (uuid) {
					cels[uuid] = $('<div></div>')
						.addClass('spreadsheet-column')
						.css({height: 'auto', width: 'auto'})
						//.css({height: ws[uuid].height, width: 100})
						.prop('id', uuid)
						.resizable({handles: 'e'})[0];

					children[uuid] = new Rx.SerialDisposable();

					subs.add(children[uuid]);
				});

				// XXX should cache the DOM size info so we don't have to
				// query it.
				_.each(ws, function (c, uuid) {
					var cel = $(cels[uuid]);
					if (cel.width() !== c.column.width) {
						cel.width(c.column.width);
					}
					if (cel.height() !== c.height) {
						cel.height(c.height);
					}
				});

				if (colupdate) { // correct the display order
					_.each(order, function (uuid) {
						$(cels[uuid]).detach();
					});
					_.each(order, function (uuid) {
						el.append(cels[uuid]);
					});
					curr = order;

					el.sortable('refresh');
				}
		}));

		// assoc in the sort for each column,
		// and create a sequence of [old, new] state.
		var wsSort = wsData.zip(sort,
			function (widgetStates, sort) {
				return _.fmap(widgetStates, function (ws, uuid) {
					return _.assoc(ws, "sort", sort);
				});
			}
		).startWith({}).bufferWithCount(2, 1);


		// Draw columns.
		// Using _.identity to drop 2nd arg, which is just for side-effects.
		subs.add(wsSort.zip(domUpdater, _.identity).subscribe(
			_.apply(function (prevState, state) {
				_.each(state, function (ws, uuid) {
					var wsdom = _.assoc(ws, "disp", children[uuid], "el", cels[uuid]);
					widgets.render(wsdom, prevState[uuid], null);
				});
				return state;
			}),
			function (err) { console.log(err.message, err.stack); console.log(arguments); },
			function () {
				subs.dispose();
				el.remove();
			}
		));

		return subs;
	}

	return spreadsheetWidget;
});
