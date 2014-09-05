/*jslint nomen:true, browser: true */
/*global define: false */

define(['haml!haml/columnEdit',
	   'haml!haml/columnEditBasic',
	   'haml!haml/columnEditDatasets',
	   'haml!haml/select',
	   'haml!haml/columnEditAdvanced',
	   'defer',
	   'stub',
	   'lib/select2',
	   'jquery',
	   'underscore_ext',
	   'xenaQuery',
	   // non-object dependencies
	   'lib/jquery-ui'
	], function (template,
				 basicTemplate,
				 datasetsTemplate,
				 selectTemplate,
				 advancedTemplate,
				 defer,
				 stub,
				 select2,
				 $,
				 _,
				 xenaQuery) {
	'use strict';

	var dataTypeByMetadata = {
			mutationVector: ['mutationVector'],
			clinicalMatrix: ['clinicalMatrix'],
			genomicMatrix: ['probeMatrix'],
			genomicMatrixProbemap: ['geneMatrix', 'probeMatrix', 'geneProbesMatrix'],
		},
		dataTypeByInput = {
			iGene: ['mutationVector'],
			iFeature: ['clinicalMatrix'],
			iGenes: ['geneMatrix', 'geneProbesMatrix'],
			iProbes: ['probeMatrix']
		},
		map = _.map,
		widgets = {},
		aWidget;

	function getMetadata(sources, hdsID) {
		var info = xenaQuery.find_dataset(sources, hdsID),
			metadata = info.type;
		if (metadata === 'genomicMatrix' && info.probemap) {
			metadata += 'Probemap';
		}
		return metadata;
	}

	function getInputModesByMetadata(metadata) {
		var inputs = [];
		_.each(dataTypeByInput, function (dataType, input) {
			var intersect = _.intersection(dataType, dataTypeByMetadata[metadata]);
			if (intersect.length) {
				inputs.push(input);
			}
		});
		return inputs;
	}

	aWidget = {

		destroy: function () {
			this.$el.dialog('destroy').remove();
			this.subs.dispose();
			delete widgets[this.id];
		},

		moveToTop: function () {
			if (this.$el) {
				this.$el.dialog('moveToTop');
			}
		},

		renderInputModes: function () {
			var self = this,
				modes = getInputModesByMetadata(this.metadata);
			if (modes.length === 1) {
				this.stateTmp.inputMode = modes[0];
			} else { // must be [iGenes, iProbes]
				this.inputModesDisplayed = modes;
				if (this.stateTmp.inputMode === modes[1]) {
					this.$el.find('.inputMode1').prop('checked', true);
				} else {
					this.$el.find('.inputMode0').prop('checked', true);
					this.stateTmp.inputMode = modes[0];
				}
				this.$inputModeRow.show();
			}
		},

		renderProbeEg: function (probes) {
			this.$listEg.text(
				'e.g. ' + probes[0].name + ' or ' + probes[0].name + ', ' + probes[1].name
			);
		},

		renderList: function () {
			var self = this;
			if (this.stateTmp.inputMode === 'iGenes') {
				this.$listLabel.text('Genes:');
				this.$list.val(this.stateTmp.genes);
				this.$listEg.text('e.g. TP53 or TP53, PTEN');
				this.$listRow.show();
			} else if (this.stateTmp.inputMode === 'iProbes') {
				this.$listLabel.text('Identifiers:');
				this.$list.val(this.stateTmp.probes);
				xenaQuery.dataset_field_examples(this.state.dsID)
					.subscribe(function (probes) {
						self.renderProbeEg(probes);
					});
				this.$listRow.show();
			}
		},

		renderSingle: function () {
			if (this.stateTmp.inputMode === 'iGene') {
				this.$singleLabel.text('Gene:');
				this.$singleEg.text('e.g. TP53');
				this.$single.val(this.stateTmp.gene);
				this.$singleRow.show();
			}
		},

		renderFeatures: function (features) {
			var self = this;
			self.$selectAnchor.append(
				selectTemplate({
					klass: 'feature',
					options: features,
					labels: undefined
				})
			);
			self.$selectLabel.text('View:');
			self.$selectRow.show();
			self.$el.find('.feature').select2({
				minimumResultsForSearch: 3,
				dropdownAutoWidth: true,
				placeholder: 'Select...',
				placeholderOption: 'first'
			});
			self.$feature = self.$el.find('.select2-container.feature');
			if (self.stateTmp.feature) {
				self.$feature.select2('val', self.stateTmp.feature);
			} else {
				self.stateTmp.feature = self.$feature.select2('val');
			}
		},

		renderSelect: function () {
			var self = this;
			if (this.metadata === 'clinicalMatrix') {
				xenaQuery.feature_list(this.state.dsID).subscribe(function (features) {
					self.renderFeatures(features);
				});
			}
		},

		getFields: function () {
			var fields;
			switch (this.stateTmp.inputMode) {
			case 'iGene':
				fields = [this.stateTmp.gene]; // TODO use named text?
				break;
			case 'iGenes':
				fields = this.stateTmp.genes.split(', '); // TODO use named text?
				break;
			case 'iProbes':
				fields = this.stateTmp.probes.split(', '); // TODO use named text?
				break;
			case 'iFeature':
				fields = [this.stateTmp.feature];
				break;
			}
			return fields;
		},

		findDataType: function (fields) {
			var types = dataTypeByInput[this.stateTmp.inputMode];
			if (types.length === 1) {
				return types[0];
			} else { // for now, only inputMode of iGenes has multiple possible dataTypes
				if (fields.length > 1) {
					return 'geneMatrix';
				} else {
					return 'geneProbesMatrix';
				}
			}
		},

		renderColumn: function () {
			var json,
				fields = this.getFields(),
				sFeature,
				id = this.id;
			if (this.metadata === 'mutationVector') {
				sFeature = 'impact';
			}
			json = {
				"width": 200,
				"dsID": this.state.dsID,
				"dataType": this.findDataType(fields),
				"fields": fields
			};
			if (sFeature) {
				json.sFeature = sFeature;
			}
			this.cursor.update(function (state) {
				var column_rendering = _.assoc(state.column_rendering, id, json),
					column_order = _.conj(state.column_order, id);
				return _.assoc(state,
							  //'columnEditOpen', false,
							  'column_rendering', column_rendering,
							  'column_order', column_order);
			});
		},

		reRender: function () {
			this.metadata = getMetadata(this.sources, this.state.dsID);

			// reset the dynamic portion of column, excluding the plot
			this.$el.find('tr:not(.static)').hide();
			this.$selectAnchor.empty();
			this.$feature = undefined;

			// render by row
			this.renderInputModes();
			this.renderList();
			this.renderSingle();
			this.renderSelect();
		},

		goClick: function () {
			this.renderColumn();
			this.destroy();
		},

		featureChange: function () {
			this.stateTmp.feature = this.$feature.select2('val');
			this.$goRow.show();
		},

		singleListKeyup: function (ev) {
			if ($(ev.target).val() === "") {
				this.$goRow.hide();
			} else {
				this.$goRow.show();
			}
		},

		singleBlur: function () {
			this.stateTmp.gene = this.$single.val();
		},

		listBlur: function () {
			if (this.stateTmp.inputMode === 'iGenes') {
				this.stateTmp.genes = this.$list.val();
			} else {
				this.stateTmp.probes = this.$list.val();
			}
		},

		inputModeClick: function () {
			var self = this;
			_.each(this.inputModesDisplayed, function (mode, i) {
				if (self.$el.find('.inputMode' + i).prop('checked')) {
					self.stateTmp.inputMode = mode;
				}
			});
			this.reRender();
		},

		datasetChange: function () {
			var dsID = this.$dataset.select2('val');
			this.state.dsID = dsID;
			this.reRender();
		},

		toggleAdvanced: function (e) {
			var label = (this.$advancedLabel.text() === 'Advanced:')
				? 'Advanced...'
				: 'Advanced:';
			this.$advanced.toggle();
			this.$advancedLabel.text(label);
		},

		render: function () {
			var self = this,
				basic;
			basic = basicTemplate({
				inputModes: ['genes', 'identifiers']
			});
			this.$el = $(template({
				basic: basic,
				advanced: undefined
				//advanced: advanced
			}));

			// cache jquery objects for active DOM elements
			this.cache = ['inputModeRow', 'inputModeAnchor',
				'listRow', 'listLabel', 'list', 'listEg',
				'singleRow', 'singleLabel', 'single', 'singleEg',
				'selectRow', 'selectLabel', 'selectAnchor',
				'goRow', 'advanced', 'advancedLabel'];
			_(self).extend(_(self.cache).reduce(function (a, e) {
				a['$' + e] = self.$el.find('.' + e);
				return a;
			}, {}));

			this.$el.dialog({
				title: 'Create Column',
				width: '500', // TODO make dynamic
				position: { my: "top", at: "top+70", of: window },
				close: this.destroy
				/*
				close: function () {
					self.cursor.update(function (state) {
						return _.assoc(state, 'columnEditOpen', false);
					});
				}
				*/
			});
		},

		initialize: function (options) {
			var self = this;

			_.bindAll.apply(_, [this].concat(_.functions(this)));

			this.$anchor = options.$anchor;
			this.sheetWrap = options.sheetWrap;
			this.columnUi = options.columnUi;
			this.cursor = options.cursor;
			this.firstRenderDataset = true;
			this.state = {};
			this.stateTmp = {};

			self.render();

			self.$el // TODO replace with rx event handlers
				.on('change', '.dataset', self.datasetChange)
				.on('click', '.inputMode', self.inputModeClick)
				.on('blur', '.list', self.listBlur)
				.on('blur', '.single', self.singleBlur)
				.on('keyup', '.single, .list', self.singleListKeyup)
				.on('change', '.feature', self.featureChange)
				.on('click', '.go', self.goClick);
			if (self.columnUi) {
				self.$el.on('mouseenter mouseleave', self.columnUi.mouseenterLeave);
			}

			// TODO this should use datasetSelect.js instead of this block of code
			// as soon as I know how to update one piece of state in the column: dsID
			this.subs = this.sheetWrap.sources.subscribe(function (sources) {
				var opts;
				self.sources = sources;

				opts = $(datasetsTemplate({sources: self.sources}));

				// there might or might not be a a select2 element.
				// need to find it & do a destroy.
				// replaceWith returns the removed elements.
				if (self.$dataset) {
					self.$dataset.select2('destroy');
				}
				self.$el.find('.dataset').replaceWith(opts);
				opts.select2({
					minimumResultsForSearch: 3,
					dropdownAutoWidth: true,
					placeholder: 'Select...',
					placeholderOption: 'first'
				});

				// XXX State should be in the monad, not fetched from
				// the DOM elements like $dataset.
				self.$dataset = self.$el.find('.select2-container.dataset');
			});
		}

	};

	function create(id, options) {
		var w = Object.create(aWidget);
		w.id = id;
		w.initialize(options);
		return w;
	}

	return {
		getMetadata: getMetadata,

		destroyAll: function () {
			_.each(widgets, function (w) {
				w.destroy();
			});
		},

		show: function (id, options) {
			var widget = widgets[id];
			if (widget) {
				widget.moveToTop();
			} else {
				widgets[id] = create(id, options);
			}
			return widgets[id];
		},

		showDataset: function (id, options) {
			return create(id, options);
		}
	};
});
