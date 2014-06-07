/*jslint browser: true, nomen: true */
/*globals define: false, $: false, _: false */
define(['haml!haml/sheetWrap',
		'haml!haml/cohorts',
		'columnEdit',
		'columnUi',
		'uuid',
		'underscore_ext',
		'jquery',
		'xenaQuery',
		'rx.jquery',
		'rx.binding'
		], function (template,
					cohortsTemplate,
					columnEdit,
					columnUi,
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
		widget,
		aWidget;

	function toLower(s) {
		return s.toLowerCase();
	}

	// TODO copied from main.js 
	function deleteColumn(uuid, upd, state) {
		var cols = _.dissoc(upd.get_in(state, ['column_rendering']), uuid),
			order = _.without(upd.get_in(state, ['column_order']), uuid);
		return upd.assoc_in(
			upd.assoc_in(state, ['column_order'], order),
			['column_rendering'],
			cols
		);
	}

	// set cohort and clear columns
	function setCohort(cohort, upd, state) {
		return upd.assoc(state,
					'cohort', cohort,
					'column_rendering', {},
					'column_order', []);
	}

	function setSamples(samples, upd, state) {
		return upd.assoc(state,
						 'samples', samples,
						 'zoomCount', samples.length,
						 'zoomIndex', 0);
	}

	aWidget = {

		deleteColumn: function (id) {
			return this.cursor.set(_.partial(deleteColumn, id));
		},

		duplicateColumn: function (id) {
			console.log('sheetWrap:duplicateColumn()');
		},

		addColumnClick: function (ev) {
			var id = uuid();
			columnEdit.show(id, {
				sheetWrap: this,
				columnUi: undefined,
				updateColumn: this.updateColumn // XXX ugh
			});
		},

		cohortChange: function (cohort) {
			columnEdit.destroyAll();
			this.$addColumn.show().click();
		},

		servers: [
			{
				title: 'localhost',
				url: 'http://localhost:7222'
			},
			{
				title: 'cancerdb',
				url: 'http://cancerdb:7223'
			}
		],

		initialize: function (options) {
			var self = this,
				cohortState,
				serverCohorts;
			_.bindAll.apply(_, [this].concat(_.functions(this)));
			//_(this).bindAll();
			this.updateColumn = options.updateColumn; // XXX
			this.state = options.state;
			this.cursor = options.cursor;
			//this.cohort = this.state.pluck('cohort');

			this.$el = $(template());
			options.$anchor.append(this.$el);

			// cache jquery objects for active DOM elements
			this.cache = ['addColumn'];
			_(self).extend(_(self.cache).reduce(function (a, e) {
				a['$' + e] = self.$el.find('.' + e);
				return a;
			}, {}));

			cohortState = this.state.pluck('cohort').distinctUntilChanged().share();

			serverCohorts = Rx.Observable.zipArray(_.map(self.servers, function (s) {
				return xenaQuery.all_cohorts(s.url);
			})).map(_.apply(_.union)); // probably want distinctUntilChanged once servers is dynamic

			serverCohorts.startWith([]).combineLatest(cohortState, function (server, state) {
				return [server, state];
			}).subscribe(_.apply(function (server, state) {
				var cohorts = state ? _.union([state], server) : server,
					opts = $(cohortsTemplate({cohorts: _.sortBy(cohorts, toLower)})),
					current;

				if (self.$cohort) {
					current = self.$cohort.select2('val');
					self.$cohort.select2('destroy');
				}

				self.$el.find('.cohort').replaceWith(opts);
				opts.select2({
					minimumResultsForSearch: 12,
					dropdownAutoWidth: true,
					placeholder: 'Select...',
					placeholderOption: 'first'
				});

				self.$cohort = self.$el.find('.select2-container.cohort'); // XXX
				if (current) {
					self.$cohort.select2('val', current);
				}
			}));

			cohortState.subscribe(function (c) {
				if (self.$cohort.select2('val') !== c) {
					self.$cohort.select2('val', c);
				}
			});

			this.$el // TODO replace with rx event handlers
				.on('click', '.addColumn', this.addColumnClick);

			this.cohort = this.$el.onAsObservable('change', '.cohort')
				.pluck('val').share();

			// XXX On first load, no add button if there are no
			// columns?
			this.cohort.subscribe(self.cohortChange);

			this.cohort.subscribe(function (cohort) {
				self.cursor.set(_.partial(setCohort, cohort));
			});

			this.sources = cohortState.map(function (cohort) { // state driven?
				return xenaQuery.dataset_list(self.servers, cohort);
			}).switch().map(function (dataset_lists) {
				return _.map(dataset_lists, function (l, i) {
					return _.assoc(self.servers[i], 'datasets', l);
				});
			}).replay(null, 1);
			this.sources.connect(); // XXX leaking subscription

			this.cohort.map(function (cohort) {
				return Rx.Observable.zipArray(_.map(self.servers, function (s) {
					return xenaQuery.all_samples(s.url, cohort);
				})).map(_.apply(_.union));
			}).switch().subscribe(function (samples) {
				self.cursor.set(_.partial(setSamples, samples));
			});
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

		columnShow: function (id, ws) {
			return columnUi.show(id, {
				ws: ws,
				sheetWrap: widget,
				horizontalMargin: horizontalMargin,
				sparsePad: sparsePad,
				headerPlotHeight: headerPlotHeight
			});
		},

		create: function (options) {
			widget = create(options);
			return widget;
		}
	};
});
