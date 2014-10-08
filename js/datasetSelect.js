/*jslint browser: true, nomen: true */
/*global define: false */

define(['haml!haml/datasetSelect', 'xenaQuery', 'lib/underscore', 'jquery', 'rx.jquery'
	], function (template, xenaQuery, _, $, Rx) {
	'use strict';

	var widgets = [],
		aWidget;

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
			var sources = _.map(sources_in, function (s) {
					return _.assoc(s, 'title', xenaQuery.server_title(s.server));
				}),
				$el = $(template({
					sources: sources,
					placeholder: this.placeholder
				}));

			if (this.$el) {
				this.$el.select2('destroy');
				this.$anchor.find('.dataset').replaceWith($el);
			} else {
				this.$anchor.append($el);
			}

			$el.select2({
				minimumResultsForSearch: 3,
				dropdownAutoWidth: true,
			});

			this.$el = this.$anchor.find('.select2-container.dataset');

			if (state) {
				this.$el.select2('val', encodeURIComponent(state));
			}
		},

		initialize: function (options) {
			var self = this,
				samples,
				sources = options.sources,
				state = options.state.share();
			_.bindAll.apply(_, [this].concat(_.functions(this)));

			this.$anchor = options.$anchor;
			this.placeholder = options.placeholder;
			this.subs = new Rx.CompositeDisposable();

			// render immediately, and re-render whenever sources or state changes
			sources.startWith([]).combineLatest(state.refine('samplesFrom'),
				function (sources, state) {
					return [sources, state.samplesFrom];
				}).subscribe(_.apply(self.render));

			// retrieve all samples in this cohort, from all servers
			samples = state.map(function (state) {
				if (state.samplesFrom) {
					return xenaQuery.dataset_samples(state.samplesFrom);
				} else {
					return Rx.Observable.zipArray(_.map(state.servers.user, function (s) {
						return xenaQuery.all_samples(s, state.cohort);
					})).map(_.apply(_.union));
				}
			}).switchLatest();

			this.subs.add(samples.subscribe(function (samples) {
				options.cursor.update(_.partial(setSamples, samples));
			}));

			// when DOM value changes, update state tree
			this.subs.add(this.$anchor.onAsObservable('change', '.dataset')
				.pluck('val').map(decodeURIComponent).subscribe(function (val) {
					options.cursor.update(_.partial(setState, val));
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
