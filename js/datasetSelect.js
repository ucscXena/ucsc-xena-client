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
	function setState(samplesFrom, upd, state) {
		return upd.assoc(state,
					'samplesFrom', samplesFrom);
	}

	function setSamples(samples, upd, state) { // TODO dup of that in sheetWrap.js
		return upd.assoc(state,
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

		// TODO for demo, insert mutationVector dataset
		insertLocalMutations: function (sources_in) {
			var sources = sources_in,
				index,
				serverIndex,
				mutationDS,
				dsID,
				cohort = $('.select2-container.cohort').select2('val'); // TODO: get cohort from the state instead;

			this.cohort = cohort; // TODO hack for local mutations

			if (sources.length === 0 || (cohort !== 'TARGET_neuroblastoma' && cohort !== 'TCGA.LUAD.sampleMap')) {
				return sources;
			}

			_.each(sources, function (s, i) { // find server index
				if (s.title === 'genome-cancer.ucsc.edu') {
					serverIndex = i;
				}
			});
			_.each(sources[serverIndex].datasets, function (d, i) { // find mutation dataset insertion index
				if (d.title === 'Mutations, gene') {
					index = i;
				}
			});
			mutationDS = _.find(sources[serverIndex].datasets, function (d, i) {
				return (d.title === 'Mutation');
			});
			dsID = stub.getDEV_URL() + (cohort === 'TARGET_neuroblastoma'
				? '/TARGET/TARGET_neuroblastoma/TARGET_neuroblastoma_mutationVector'
				: '/public/TCGA/TCGA_LUAD_mutation_RADIA');
			if (!mutationDS || mutationDS.length === 0) {
				sources[serverIndex].datasets.splice(index, 0, { // insert mutation dataset
					dataSubType: 'mutationVector',
					dsID: dsID,
					title: 'Mutation'
				});
			}
			return sources;
		},

		render: function (sources_in, state) {
			var sources = this.insertLocalMutations(sources_in),
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
					if (self.cohort === 'TARGET_neuroblastoma') {
						sampleList = Rx.Observable.return(stub.getMutation(val, 'ALK').samples);
					} else if (self.cohort === 'TCGA.LUAD.sampleMap') {
						sampleList = Rx.Observable.return(stub.getMutation(val, 'TP53').samples);
					} else {
						sampleList = xenaQuery.dataset_samples(val);
					}
				}
				sampleList.subscribe(function (samples) {
					self.cursor.set(_.partial(setSamples, samples));
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
				self.cursor.set(_.partial(setState, val));
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
