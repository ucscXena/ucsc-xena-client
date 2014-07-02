/*jslint browser: true, nomen: true */
/*global define: false */

define(['haml!haml/cohortSelect', 'xenaQuery', 'lib/underscore', 'jquery', 'rx.jquery'
	], function (template, xenaQuery, _, $, Rx) {
	'use strict';

	var widgets = [],
		aWidget;

	// set cohort and clear columns
	// TODO should this be in sheetWrap.js?
	function setState(cohort, upd, state) {
		return upd.assoc(state,
					'cohort', cohort,
					'samplesFrom', '', // TODO reset to null or undefined instead?
					'column_rendering', {},
					'column_order', []);
	}

	function toLower(s) {
		return s.toLowerCase();
	}

	aWidget = {

		destroy: function () {
			// never called because sheetWrap nor this is ever destroyed,
			// but keeping it here as a pattern
			this.$el.select2('destroy');
			this.$el.remove();
			this.$el = undefined;
			_.each(this.subs, function (s) {
				s.dispose();
			});
			delete widgets[this.id];
		},

		render: function (server, state) {
			var cohorts = state ? _.union([state], server) : server, // ???
				$el = $(template({cohorts: _.sortBy(cohorts, toLower)}));
			if (this.$el) {
				this.$el.select2('destroy');
				this.$anchor.find('.cohort').remove();
			}
			this.$anchor.append($el);
			$el.select2({
				minimumResultsForSearch: 12,
				dropdownAutoWidth: true,
				placeholder: 'Select...',
				placeholderOption: 'first'
			});

			this.$el = this.$anchor.find('.select2-container.cohort'); // XXX Brian, what don't you like here?
			if (state) {
				this.$el.select2('val', state);
			}
		},

		initialize: function (options) {
			var self = this,
				state = options.state,
				cursor = options.cursor,
				servers = options.servers,
				cohortList;
			_.bindAll.apply(_, [this].concat(_.functions(this)));
			//_(this).bindAll();
			this.$anchor = options.$anchor;
			this.subs = [];

			// create an observable on a cohort list, which is the union of cohorts from all servers
			cohortList = Rx.Observable.zipArray(_.map(servers, function (s) {
				return xenaQuery.all_cohorts(s.url);
			})).map(_.apply(_.union)); // probably want distinctUntilChanged once servers is dynamic

			// render immediately, and re-render whenever cohortList or state changes
			cohortList.startWith([]).combineLatest(state, function (server, state) { // TODO why call it "server" ?
				return [server, state];
			}).subscribe(_.apply(function (server, state) {
				self.render(server, state);
			})); // XXX leaked subscription?

			// when state changes, update the DOM value
			this.subs.push(state.subscribe(function (val) {
				if (self.$el.select2('val') !== val) { // is self.$el always created by the time this is called ?
					self.$el.select2('val', val);
				}
			}));

			// create an observable on the DOM value
			this.val = this.$anchor.onAsObservable('change', '.cohort')
				.pluck('val').share();

			// when DOM value changes, update state tree
			this.subs.push(this.val.subscribe(function (val) {
				cursor.set(_.partial(setState, val));
			}));
		}
	};

	function create(id, options) {
		var w = Object.create(aWidget);
		w.id = options.id;
		w.initialize(options);
		return w;
	}

	return {
		create: function (id, options) {
			// this should only be called once per page load,
			// but keeping array and destroy here as a pattern
			if (widgets[id]) {
				widgets[id].destroy();
			}
			widgets[id] = create(id, options);
			return widgets[id];
		}
	};
});
