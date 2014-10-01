/*jslint nomen:true, regexp: true */
/*globals define: false, $: false, _: false */
define(['haml!haml/sheetWrap',
		'cursor',
		'stub',
		'spreadsheet',
		'cohortSelect',
		'columnEdit',
		'columnUi',
		'datasetSelect',
		'defaultTextInput',
		'uuid',
		'underscore_ext',
		'jquery',
		'xenaQuery',
		'rx',
		'rx.jquery',
		'rx.binding'
		], function (template,
					new_cursor,
					stub,
					spreadsheet,
					cohortSelect,
					columnEdit,
					columnUi,
					datasetSelect,
					defaultTextInput,
					uuid,
					_,
					$,
					xenaQuery,
					Rx) {

	"use strict";

		// constants for all columns:
	var horizontalMargin = 3,
		sparseRadius = horizontalMargin * 2,
		sparsePad = sparseRadius + 1,
		headerPlotHeight = 12,
		map = _.map,
		widget,
		aWidget,
		defaultPort;

	function deleteColumn(uuid, state) {
		var cols = _.dissoc(state.column_rendering, uuid),
			order = _.without(state.column_order, uuid);
		return _.assoc(state,
					   'column_order', order,
					   'column_rendering', cols);
	}

	function columnShow(deleteColumn, id, ws) {
		return columnUi.show(id, {
			cursor: widget.cursor,
			state: widget.state,
			ws: ws,
			sheetWrap: widget,
			deleteColumn: deleteColumn,
			horizontalMargin: horizontalMargin,
			sparsePad: sparsePad,
			headerPlotHeight: headerPlotHeight
		});
	}

	function serversFromString(s) {
		return map(_.filter(s.split(/[, ]+/), _.identity), xenaQuery.server_url);
	}

	function serversToString(servers) {
		return map(servers, xenaQuery.server_title).join(', ');
	}

	aWidget = {
		initCohortsAndSources: function (state, cursor, defaultServers) {
			this.serversInput = defaultTextInput.create({
				$el: this.$servers,
				state: state.pluck('servers')
					.map(function (servers) { return _.fmap(servers, serversToString); }),
				// fn (from defaultTextInput) is
				// {user: <string>, default: <string>}
				//                     -> {user: <string>, default: <string>}
				// We wrap that in a function that does
				// {user: <array>, default: <array>} -> {user: <array>, default: <array>}
				cursor: new_cursor(function (fn) {
					cursor.update(function (s) {
						return _.assoc(s,
							'servers',
							_.fmap(fn(_.fmap(s.servers, serversToString)), serversFromString));
					});
				}, ['default', 'user'])
			});

			this.cohortSelect = cohortSelect.create({
				$anchor: this.$cohortAnchor,
				state: state,
				cursor: cursor
			});

			// retrieve all datasets in this cohort, from all servers
			this.sources = state.refine(['servers', 'cohort'])
				.map(function (state) {
					if (state.cohort) {
						return xenaQuery.dataset_list(state.servers.user, state.cohort);
					} else {
						return Rx.Observable.return([]);
					}
				}).switchLatest().replay(null, 1); // replay for late subscribers
			this.subs.add(this.sources.connect());

		},

		initSamplesFrom: function (state, cursor) {
			var paths = ['samplesFrom', 'samples', 'cohort', 'servers', 'zoomCount', 'zoomIndex'],
				dsstate = state.refine(paths),
				dscursor = cursor.refine(paths);

			this.samplesFrom = datasetSelect.create('samplesFrom', {
				$anchor: this.$samplesFromAnchor,
				state: dsstate,
				cursor: dscursor,
				sources: this.sources,
				placeholder: 'All datasets'
			});
		},

		initialize: function (options) {
			var self = this,
				columnEditOpen = false,
				cohort,
				state,
				deleteColumnCb;
			this.subs = new Rx.CompositeDisposable();

			_.bindAll.apply(_, [this].concat(_.functions(this)));

			state = options.state.share();
			this.state = state;
			this.cursor = options.cursor;

			this.$el = $(template());
			options.$anchor.append(this.$el);

			// cache jquery objects for active DOM elements
			this.cache = ['cohortAnchor', 'samplesFromAnchor', 'servers', 'addColumn',
				'spreadsheet'];
			_(self).extend(_(self.cache).reduce(function (a, e) {
				a['$' + e] = self.$el.find('.' + e);
				return a;
			}, {}));

			this.initCohortsAndSources(state, options.cursor, options.servers);
			this.initSamplesFrom(state, options.cursor);

			deleteColumnCb = function (id) {
				options.cursor.update(_.partial(deleteColumn, id));
			};

			this.subs.add(spreadsheet(state, options.cursor, this.$spreadsheet, _.partial(columnShow, deleteColumnCb)));
			this.$el
				.on('click', '.addColumn', function () {
					options.cursor.update(function (state) {
						return _.assoc(state, 'columnEditOpen', 'true');
					});
				});

			this.subs.add(
				state.refine(['columnEditOpen', 'cohort'])
					.subscribe(function (state) {
						var id;
						if (columnEditOpen && !state.columnEditOpen) {
							columnEdit.destroyAll();
						}
						if (!columnEditOpen && state.columnEditOpen) {
							id = uuid();
							columnEdit.show(id, {
								sheetWrap: self,
								columnUi: undefined,
								cursor: options.cursor
							});
						}
						columnEditOpen = state.columnEditOpen;
						if (!state.columnEditOpen && state.cohort) {
							self.$addColumn.show();
						} else {
							self.$addColumn.hide();
						}
					})
			);
		}
	};

	function create(options) {
		var w = Object.create(aWidget);
		w.initialize(options);
		return w;
	}

	return {

		get: function () {
			return widget;
		},

		columnDims: function () {
			return {
				horizontalMargin: horizontalMargin,
				sparseRadius: sparseRadius,
				sparsePad: sparsePad,
				headerPlotHeight: headerPlotHeight
			};
		},

		create: function (options) {
			widget = create(options);
			return widget;
		}
	};
});
