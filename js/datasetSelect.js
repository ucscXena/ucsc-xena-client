/*jslint browser: true, nomen: true */
/*global define: false */

define(['haml!haml/datasetSelect', 'stub', 'xenaQuery', 'lib/underscore', 'jquery'
	], function (template, stub, xenaQuery, _, $) {
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
				mutationDS;

			if (sources.length === 0) {
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
			if (!mutationDS || mutationDS.length === 0) {
				sources[serverIndex].datasets.splice(index, 0, { // insert mutation dataset
					dataSubType: 'mutationVector',
					dsID: stub.getDEV_URL() + '/TARGET/TARGET_neuroblastoma/TARGET_neuroblastoma_mutationVector',
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

/*
$el.select2({
createSearchChoice:function(term, data) { if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {return {id:term, text:term};} },
multiple: true,
data: [{id: 0, text: 'story'},{id: 1, text: 'bug'},{id: 2, text: 'task'}]
});

			$el.select2({
				createSearchChoice:function(term, data) { if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {return {id:term, text:term};} },
				multiple: true,
				data: [
					{id: 1, text: 'bug'},
					{id: 2, text: 'task'},
					{id: 3, text: 'task'},
					{id: 4, text: 'task'},
					{id: 5, text: 'task'},
					{id: 6, text: 'task'},
					{id: 7, text: 'task'},
					{id: 8, text: 'task'},
					{id: 9, text: '9'},
					{id: 10, text: '10'},
					{id: 11, text: '11'},
					{id: 12, text: '12'},
					{id: 13, text: 'task'},
					{id: 14, text: 'task'},
					{id: 15, text: '15'},
					{id: 16, text: 'task'},
					{id: 17, text: 'task'},
					{id: 18, text: 'task'},
					{id: 19, text: 'task'},
					{id: 20, text: '20'}
				]
			});
*/


			$el.select2({
				minimumResultsForSearch: 12,
				dropdownAutoWidth: true,
				//placeholder: this.placeholder,
				//placeholderOption: 'first'
			});

			this.$el = this.$anchor.find('.select2-container.dataset');
			if (state) {
				this.$el.select2('val', state);
			}
		},

		initialize: function (options) {
			var self = this,
				cursor = options.cursor,
				sources = options.sources,
				sampleList,
				state = options.state;
			_.bindAll.apply(_, [this].concat(_.functions(this)));
			//_(this).bindAll();
			this.sheetWrap = options.sheetWrap;
			this.$anchor = options.$anchor;
			this.placeholder = options.placeholder;
			this.subs = [];

			// render immediately, and re-render whenever sources or state changes
			sources.startWith([]).combineLatest(state, function (sources, state) {
				return [sources, state];
			}).subscribe(_.apply(function (sources, state) {
				self.render(sources, state);
			}));

			// when state changes, retrieve the sample IDs in this dataset,
			// when sampleList is received, update samples state
			state.subscribe(function (val) {
				sampleList = xenaQuery.dataset_samples(val);
				sampleList.subscribe(function (samples) {
					if (samples.length > 0) { // TODO we shouldn't need this
						cursor.set(_.partial(setSamples, samples));
					}
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
			if (widgets[id]) {
				widgets[id].destroy();
			}
			widgets[id] = create(id, options);
			return widgets[id];
		}
	};
});
