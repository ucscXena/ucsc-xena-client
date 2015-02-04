/*jslint nomen:true, regexp: true */
/*globals define: false, $: false, _: false */
define(['haml!haml/sheetWrap',
		'chart',
		'cursor',
		'spreadsheet',
		'cohortSelect',
		'columnEdit',
		//'columnEditRx',
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
					chart,
					new_cursor,
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
			xenaCursor: widget.cursor,
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

		columnAddClick: function () {
			var id = uuid();

			// initialize the root of this _column in the state tree
			this.cursor.update(function (state) {
				return _.assoc(state, '_column', _.assoc(state._column, id, {}));
			});

			columnEdit.show(id, {
				sheetWrap: this,
				state: this.state,
				columnUi: undefined, // TODO not needed for columnEditRx
				cursor: this.cursor
			});
		},

		initCohortsAndSources: function (state, cursor) {
			var selectState = state.map(function (s) {
				return {
					cohort: s.cohort,
					servers: s.servers,
					enabled: s.mode === 'heatmap'
				};
			});
			this.cohortSelect = cohortSelect.create({
				$anchor: this.$cohortAnchor,
				state: selectState,
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

			// store the sources in state, for easy access later
			this.subs.add(this.sources.subscribe(function (sources) {
				cursor.update(function (t) {
					return _.assoc(t, '_sources', sources);
					//return _.assoc(t, '_sources', Object.create(sources).__proto__);
				});
			}));
		},

		initSamplesFrom: function (state, cursor) {
			var paths = ['samplesFrom', 'samples', 'cohort', 'servers', 'zoomCount', 'zoomIndex', 'mode'],
				dsstate = state.refine(paths).map(function (s) {
					return _.extend(s, {enabled: s.mode === 'heatmap'});
				}),
				dscursor = cursor.refine(paths);

			this.samplesFrom = datasetSelect.create('samplesFrom', {
				$anchor: this.$samplesFromAnchor,
				state: dsstate,
				cursor: dscursor,
				sources: this.sources,
				placeholder: 'All Samples'
			});
		},

		initialize: function (options) {
			var self = this,
				//columnEditOpen = false,
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
			this.cache = ['cohortAnchor', 'samplesFromAnchor', 'yAxisLabel', 'addColumn',
				'spreadsheet', 'chartSelect', 'chartRoot', 'heatmapRoot'];
			_(self).extend(_(self.cache).reduce(function (a, e) {
				a['$' + e] = self.$el.find('.' + e);
				return a;
			}, {}));

			this.initCohortsAndSources(state, options.cursor);
			this.initSamplesFrom(state, options.cursor);

			deleteColumnCb = function (id) {
				options.cursor.update(_.partial(deleteColumn, id));
			};

			this.subs.add(spreadsheet(state, options.cursor, this.$spreadsheet, _.partial(columnShow, deleteColumnCb)));
			this.$el
				.on('click', '.addColumn', this.columnAddClick);
				/*
				.on('click', '.addColumn', function () {
					options.cursor.update(function (state) {
						return _.assoc(state, 'columnEditOpen', 'true');
					});
				});
				*/

			this.subs.add(
				state.refine(['cohort'])
					.subscribe(function (state) {
						//columnEdit.destroyAll();
						if (state.cohort) {
							self.$yAxisLabel.show();
							self.$addColumn.show();
							self.$samplesFromAnchor.show();
						}
					})
			);

			this.subs.add(
				state.refine(['samples', 'column_order', 'zoomCount', 'zoomIndex'])
					.subscribe(function (state) {
						var text = 'Samples (N=' + state.samples.length + ')' +
							((state.zoomCount === state.samples.length)
								? ''
								: (', showing ' + state.zoomIndex + '-' + (state.zoomIndex + state.zoomCount - 1))),
							marginT = '7em',
							marginB = '0';
						if (state.column_order.length) {
							marginT = '0';
							marginB = '7em';
						}
						self.$yAxisLabel.text(text)
							.css({ 'margin-top': marginT, 'margin-bottom': marginB });
					})
			);

			// chart node support
			this.$el.on('click', '.chartSelect', function () {
				self.cursor.update(function (state) {
					return _.assoc(state, 'mode', state.mode === 'chart' ? 'heatmap' : 'chart');
				});
			});

			this.subs.add(
				state.distinctUntilChanged(function (s) { return s.mode;})
					.subscribe(function (state) {
						if (state.mode === 'chart') {
							self.$chartRoot.empty();
							chart(self.$chartRoot[0], options.cursor,
								  {xena: JSON.stringify(state)});
							self.$chartRoot.show();
							self.$heatmapRoot.hide();
							self.$chartSelect.text('Spreadsheet');
						} else {

							self.$chartRoot.hide();
							self.$chartRoot.empty();
							self.$heatmapRoot.show();
							self.$chartSelect.text('Chart');
						}
					})
			);

			/*
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
			*/
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
