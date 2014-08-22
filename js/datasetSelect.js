/*jslint browser: true, nomen: true */
/*global define: false */

define(['haml!haml/datasetSelect', 'stub', 'xenaQuery', 'lib/underscore', 'jquery', 'rx.jquery'
	], function (template, stub, xenaQuery, _, $, Rx) {
	'use strict';

	var widgets = [],
		aWidget;

	function toLower(s) {
		return s.toLowerCase();
	}

	// set samplesFrom state
	// TODO should this be in sheetWrap.js?
	function setState(samplesFrom, state) {
		return _.assoc(state,
					   'samplesFrom', samplesFrom);
	}

	function setSamples(samples, state) {
		return _.assoc(state,
					   'samples', samples,
					   'zoomCount', samples.length,
					   'zoomIndex', 0);
	}

	aWidget = {

		destroy: function () {
			this.$el.select2('destroy');
			this.$el.remove();
			this.$el = undefined;
			_.each(this.subs, function (s) {
				s.dispose();
			});
			delete widgets[this.id];
		},

		render: function (sources_in, state) {
			var sources = sources_in,
				$el = $(template({
					sources: sources,
					placeholder: this.placeholder
				}));

			if (this.$el) {
				this.$el.select2('destroy');
				this.$anchor.find('.dataset').remove();
			}
			this.$anchor.append($el);

			$el.select2({
				minimumResultsForSearch: 3,
				dropdownAutoWidth: true,
			});

			this.$el = this.$anchor.find('.select2-container.dataset');
			if (state) {
				this.$el.select2('val', state);
			}
		},

		initialize: function (options) {
			var self = this,
				sources = options.sources,
				state = options.state;
			_.bindAll.apply(_, [this].concat(_.functions(this)));
			//_(this).bindAll();
			this.sheetWrap = options.sheetWrap;
			this.$anchor = options.$anchor;
			this.placeholder = options.placeholder;
			this.cohort = options.cohort;
			this.servers = options.servers;
			this.cursor = options.cursor;
			this.subs = [];

			// render immediately, and re-render whenever sources or state changes
			sources.startWith([]).combineLatest(state, function (sources, state) {
				return [sources, state];
			}).subscribe(_.apply(function (sources, state) {
				self.render(sources, state);
			}));

			// when state changes, retrieve the sample IDs,
			// when sampleList is received, update samples state
			state.subscribe(function (val) {
				var sampleList,
					cohort;
				if (val === '') { // retrieve all sample IDs in this cohort
					// TODO: this duplicates sheetWrap.js
					cohort = $('.select2-container.cohort').select2('val'); // TODO: get cohort from the state instead
					sampleList = Rx.Observable.zipArray(_.map(self.servers, function (s) {
						return xenaQuery.all_samples(s.url, cohort);
					})).map(_.apply(_.union));

				} else { // retrieve the sample IDs in this dataset
					sampleList = xenaQuery.dataset_samples(val);
				}
				sampleList.subscribe(function (samples) {
					self.cursor.update(_.partial(setSamples, samples));
				});
			});

			// when state changes, update the DOM value
			this.subs.push(state.subscribe(function (val) {
				if (self.$el.select2('val') !== val) {
					self.$el.select2('val', val);
				}
			}));

			// create an observable on the DOM value
			this.val = this.$anchor.onAsObservable('change', '.dataset')
				.pluck('val').share();

			// when DOM value changes, update state tree
			this.subs.push(this.val.subscribe(function (val) {
				self.cursor.update(_.partial(setState, val));
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
			if (widgets[id]) {
				widgets[id].destroy();
			}
			widgets[id] = create(id, options);
			return widgets[id];
		}
	};
});
