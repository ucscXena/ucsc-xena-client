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

	var dsTitles = { // TODO for demo
			"http://cancerdb:7222/TARGET/TARGET_neuroblastoma/cnv.matrix": 'Copy number',
			"http://cancerdb:7222/TARGET/TARGET_neuroblastoma/rma.Target190.Probeset.Full": 'Gene expression, array',
			"http://cancerdb:7222/TARGET/TARGET_neuroblastoma/NBL_10_RNAseq_log2": 'Gene expression, RNAseq',
			"http://cancerdb:7222/TARGET/TARGET_neuroblastoma/mutationGene": 'Mutations, gene',
			"http://cancerdb:7222/TARGET/TARGET_neuroblastoma/TARGET_neuroblastoma_clinicalMatrix": 'Phenotypical, Clinical'
		},
		sFeatures = { // TODO for demo
			impact: 'impact', // shorttitle ?
			DNA_AF: 'DNA allele frequency',
			RNA_AF: 'RNA allele frequency'
		},
		defaultGene = 'ALK', // TODO: make these more global ?
		defaultGenes = 'ALK, PTEN',
		defaultProbes = '(no default probes)', // TODO
		defaultChrom = 'chr1-chrY',
		defaultField = '(fields for this option)', // TODO
		defaultWidth = 100,

		displaysByDataSubType = { // TODO combine with columnUi:columnUntitles
			cna: ['dGene', 'dGenes', /*'dGeneChrom', 'dChrom'*/],
			DNAMethylation: ['dGene', 'dGenes'/*, 'dGeneProbes', 'dProbes', 'dGeneChrom', 'dChrom'*/],
			geneExp: ['dGene', 'dGenes'/*, 'dGeneProbes', 'dProbes', 'dGeneChrom', 'dChrom'*/], // TODO replace with geneRNAseq & geneArray
			geneRNAseq: ['dGene', 'dGenes', /*'dGeneChrom', 'dChrom'*/],
			geneArray: ['dGene', 'dGenes'/*, 'dGeneProbes', 'dProbes', 'dGeneChrom', 'dChrom'*/],
			somaticMutation: ['dGene', 'dGenes'],
			mutationVector: ['dExonSparse', /*'dGeneChrom', 'dChrom'*/],
			protein: ['dGene', 'dGenes'/*, 'dGeneProbes', 'dProbes', 'dGeneChrom', 'dChrom'*/],
			clinical: ['dClinical']
		},
		displaysByInput = {
			iGene: ['dGene', 'dGeneProbes', 'dGeneChrom', 'dExonDense', 'dExonSparse'],
			iGenes: ['dGenes'],
			iProbes: ['dProbes'],
			iChrom: ['dChrom'],
			iClinical: ['dClinical']
		},
		inputModeLabels = { // TODO combine with displaysByInput
			iGene: 'single gene',
			iGenes: 'list of genes',
			iProbes: 'list of probes',
			iChrom: 'chromosome coordinates',
			iClinical: 'clinical'
		},
		displayModeLabels = { // TODO combine with dataTypeByDisplay
			dGene: 'gene',
			dGeneProbes: 'probes',
			dExonDense: 'exons',
			dExonSparse: 'exons',
			dGeneChrom: 'chromosomes'
		},
		dataTypeByDisplay = {
			dGene: 'probeGene', //'nonspatial',
			dGenes: 'probeGene', //'nonspatial',
			dExonSparse: 'sparse', //spatial
			dClinical: 'probeFeature', //'nonspatial',
			//dGeneProbes: 'probe', //'nonspatial',
			//dExonDense: 'exonDense', // spatial
			//dGeneChrom: 'geneChrom', // spatial
			//dProbes: 'probe', //'nonspatial',
			//dChrom: 'chrom' // spatial
		},
		map = _.map,
		widgets = {},
		aWidget,
		dataset_list_query;

	function getDataSubType(sources, hdsID) {
		// TODO for demo, our mutationVector dataset is in the cgi
		if (hdsID === 'http://cancerdb:7222/TARGET/TARGET_neuroblastoma/TARGET_neuroblastoma_mutationVector') {
			return 'mutationVector';
		}
		return xenaQuery.find_dataset(sources, hdsID).dataSubType;
	}

	function getInputModesByDataSubType(dataSubType) {
		var inputs = [];
		_.each(displaysByInput, function (displays, input) {
			var intersect = _.intersection(displays, displaysByDataSubType[dataSubType]);
			if (intersect.length) {
				inputs.push(input);
			}
		});
		return inputs;
	}

	function getDisplayModes(dataSubType, inputMode) {
		return _.intersection(
			displaysByDataSubType[dataSubType],
			displaysByInput[inputMode]
		);
	}

	function datasetTitle(dsID, title) {
		return dsTitles[dsID] || title;
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

		getFields: function () {
			var fields;
			switch (this.state.inputMode) {
			case 'iGene':
				fields = [this.state.gene]; // TODO use named text?
				break;
			case 'iGenes':
				fields = this.state.genes.split(', '); // TODO use named text?
				break;
			case 'iProbes':
				fields = this.state.probes.split(', '); // TODO use named text?
				break;
			case 'iClinical':
				fields = [this.state.feature];
				break;
			default:
				fields = [defaultField];
				break;
			}
			return fields;
		},

		renderInputModes: function (dataSubType) {
			var modes = getInputModesByDataSubType(dataSubType);
			this.state.dataSubType = dataSubType;
			if (modes.length === 1) {
				this.state.inputMode = modes[0];
			} else {
				this.$inputModeAnchor.append(
					selectTemplate({
						klass: 'inputMode',
						options: modes,
						labels: inputModeLabels
					})
				);
				this.$el.find('.inputMode').select2({
					minimumResultsForSearch: -1,
					dropdownAutoWidth: true
				});
				this.$inputModeRow.show();
				this.$inputMode = this.$el.find('.select2-container.inputMode');
				if (modes.indexOf(this.state.inputMode) > -1) {
					this.$inputMode.select2('val', this.state.inputMode);
				} else {
					this.state.inputMode = modes[0];
				}
			}
			// TODO should this be somewhere else?
			if (!this.state.gene) {
				this.state.gene = defaultGene;
			}
		},

		renderList: function () {
			if (this.state.inputMode === 'iGenes') {
				if (!this.state.genes || this.state.genes === '') {
					this.state.genes = defaultGenes;
				}
				this.$listLabel.text('Genes:');
				this.$listRow.show();
				this.$list.val(this.state.genes);
			} else if (this.state.inputMode === 'iProbes') {
				if (!this.state.probes || this.state.probes === '') {
					this.state.probes = defaultProbes;
				}
				this.$listLabel.text('Probes:');
				this.$listRow.show();
				this.$list.val(this.state.probes);
			}
		},

		renderSingle: function () {
			if (this.state.inputMode === 'iChrom') {
				if (!this.state.chrom || this.state.chrom === '') {
					this.state.chrom = defaultChrom;
				}
				this.$singleLabel.text('Chromosomal Position:');
				this.$singleRow.show();
				this.$single.val(this.state.chrom);
			} else if (this.state.inputMode === 'iGene') {
				if (!this.state.gene || this.state.gene === '') {
					this.state.gene = defaultGene;
				}
				this.$singleLabel.text('Gene:');
				this.$singleRow.show();
				this.$single.val(this.state.gene);
			}

		},

		renderSelect: function () {
			var self = this;
			if (self.state.dataSubType === 'clinical') {
				xenaQuery.feature_list(self.state.dsID).subscribe(function (features) {
					self.$selectAnchor.append(
						selectTemplate({
							klass: 'feature',
							options: features,
							labels: undefined
						})
					);
					self.$selectLabel.text('Feature:');
					self.$selectRow.show();
					self.$el.find('.feature').select2({
						minimumResultsForSearch: 12,
						dropdownAutoWidth: true
					});
					self.$feature = self.$el.find('.select2-container.feature');
					if (self.state.feature) {
						self.$feature.select2('val', self.state.feature);
					} else {
						self.state.feature = self.$feature.select2('val');
					}
				});
			} else if (self.state.dataSubType === 'mutationVector') {
				self.$selectAnchor.append(
					selectTemplate({
						klass: 'sFeature',
						options: sFeatures,
						labels: undefined
					})
				);
				self.$selectLabel.text('Variable:');
				self.$selectRow.show();
				self.$el.find('.sFeature').select2({
					minimumResultsForSearch: -1,
					dropdownAutoWidth: true
				});
				self.$sFeature = self.$el.find('.select2-container.sFeature');
				if (self.state.sFeature) {
					self.$sFeature.select2('val', self.state.sFeature);
				} else {
					self.state.sFeature = self.$sFeature.select2('val');
				}
				//self.$sFeature.select2('val', self.state.sFeature);
			}
		},

		renderDisplayModes: function (dataSubType) {
			var modes = getDisplayModes(dataSubType, this.state.inputMode);
			if (modes.length === 1) {
				this.state.displayMode = modes[0];
			} else {
				this.$displayModeAnchor.append(
					selectTemplate({
						klass: 'displayMode',
						options: modes,
						labels: displayModeLabels
					})
				);
				this.$displayModeRow.show();
				this.$el.find('.displayMode').select2({
					minimumResultsForSearch: -1,
					dropdownAutoWidth: true
				});
				this.$displayMode = this.$el.find('.select2-container.displayMode');
				if (modes.indexOf(this.state.displayMode) > -1) {
					this.$displayMode.select2('val', this.state.displayMode);
				} else {
					this.state.displayMode = modes[0];
				}
			}
		},

		renderGo: function () {
			if (this.state.dsID) {
				this.$goRow.show();
			}
		},

		renderColumn: function () { // TODO shouldn't have to go through debug widgets
			var fields = this.getFields(),
				json = {
					"width": 200,
					"dsID": this.state.dsID, // TODO we don't need dsID in this.state too
					"dataType": dataTypeByDisplay[this.state.displayMode],
					"fields": fields,
					"ui": this.state
				};
			$('#columnStub').val(JSON.stringify(json, undefined, 4));
			this.updateColumn(this.id);
		},

		reRender: function () {
			var dataSubType = getDataSubType(this.sources, this.state.dsID);

			// reset the dynamic portion of column, excluding the plot
			this.$el.find('tr:not(.static)').hide();
			this.$inputModeAnchor.empty();
			this.$inputMode = undefined;
			this.$displayModeAnchor.empty();
			this.$displayMode = undefined;
			this.$selectAnchor.empty();
			this.$feature = undefined;

			// render by row
			this.renderInputModes(dataSubType);
			this.renderList();
			this.renderSingle();
			this.renderSelect();
			this.renderDisplayModes(dataSubType);
			this.renderGo();
		},

		goClick: function () {
			this.renderColumn();
			this.destroy();
		},

		featureChange: function () {
			this.state.feature = this.$feature.select2('val');
			this.reRender();
		},

		sFeatureChange: function () {
			this.state.sFeature = this.$sFeature.select2('val');
			this.reRender();
		},

		displayModeChange: function () {
			this.state.displayMode = this.$displayMode.select2('val');
			this.reRender();
		},

		singleBlur: function () {
			if (this.state.inputMode === 'iChrom') {
				this.state.chrom = this.$single.val();
			} else {
				this.state.gene = this.$single.val();
			}
			this.reRender();
		},

		listBlur: function () {
			if (this.state.inputMode === 'iGenes') {
				this.state.genes = this.$list.val();
			} else {
				this.state.probes = this.$list.val();
			}
			this.reRender();
		},

		inputModeChange: function () {
			this.state.inputMode = this.$inputMode.select2('val');
			this.reRender();
		},

		datasetChange: function () {
			var dsID = this.$dataset.select2('val');
			if (dsID === 'mine') {
				this.state.dsID = undefined;
			} else {
				this.state.dsID = dsID;
				this.reRender();
			}
		},

		toggleAdvanced: function (e) {
			var label = (this.$advancedLabel.text() === 'Advanced:')
				? 'Advanced...'
				: 'Advanced:';
			this.$advanced.toggle();
			this.$advancedLabel.text(label);
		},

		position: function () {
			var self = this,
				offset,
				of;
			if (this.columnUi && this.columnUi.$el) {
				offset = 10;
				of = this.columnUi.$el;
			} else {
				offset = 10;
				//offset = defaultWidth - 12;
				of = $('.addColumn');
			}
			defer(function () {
				self.$el.dialog('option', 'position', {
					my: 'left+' + offset + ' top',
					//my: 'left+' + offset + ' top+105',
					//my: 'left+' + offset + ' top-10',
					at: 'right top',
					of: of
				});
			});
		},

		render: function () {
			var self = this,
				basic;
			basic = basicTemplate();
			this.$el = $(template({
				basic: basic,
				advanced: undefined
				//advanced: advanced
			}));

			this.$dataset_plain = this.$el.find('.dataset');

			// cache jquery objects for active DOM elements
			this.cache = ['inputModeRow', 'inputModeAnchor',
				'listRow', 'listLabel', 'list', 'singleRow', 'singleLabel', 'single',
				'selectRow', 'selectLabel', 'selectAnchor',
				'displayModeRow', 'displayModeAnchor', 'columnTitleRow',
				'goRow', 'advanced', 'advancedLabel'];
			_(self).extend(_(self.cache).reduce(function (a, e) {
				a['$' + e] = self.$el.find('.' + e);
				return a;
			}, {}));

			this.$el.dialog({
				title: 'Define Column',
				width: '500', // TODO make dynamic
				position: {
					my: 'left top',
					at: 'left top',
					of: $('.addColumn')
				},
				close: this.destroy
			});
			//this.position();
		},

		initialize: function (options) {
			var self = this;

			_.bindAll.apply(_, [this].concat(_.functions(this)));
			//_(this).bindAll();
			this.$anchor = options.$anchor;
			this.sheetWrap = options.sheetWrap;
			this.columnUi = options.columnUi;
			this.updateColumn = options.updateColumn;
			this.firstRenderDataset = true;
			this.state = {};

			self.render();

			self.$el // TODO replace with rx event handlers
				.on('change', '.dataset', self.datasetChange)
				.on('change', '.inputMode', self.inputModeChange)
				.on('blur', '.list', self.listBlur)
				.on('blur', '.single', self.singleBlur)
				.on('change', '.displayMode', self.displayModeChange)
				.on('change', '.feature', self.featureChange)
				.on('change', '.sFeature', self.sFeatureChange)
				.on('click', '.go', self.goClick);
			if (self.columnUi) {
				self.$el.on('mouseenter mouseleave', self.columnUi.mouseenterLeave);
			}

			// TODO yikes, these columnEdit widgets are destroyed whenever the sources
			// change, rather than attempting to modify any of them. (Using destroyAll() called
			// from the cohortSelect change handler in sheetWrap.js.) These widgets
			// should be uncreatable between the time the user has selected a new cohort,
			// and the new cohort's dataset list has showed up.
			this.subs = this.sheetWrap.sources.subscribe(function (sources) {
				var index,
					opts;
				// TODO for demo, rename ucsc source and dataset titles
				self.sources = map(sources, function (s) {
					return {
						url: s.url,
						title: (s.title === 'cancerdb') ? 'cancerdb.ucsc.edu' : s.title,
						datasets: map(s.datasets, function (d) {
							return {
								dataSubType: d.dataSubType,
								dsID: d.dsID,
								title: datasetTitle(d.dsID, d.title)
							};
						})
					};
				});

				// TODO for demo, insert mutationVector dataset
				_.each(self.sources[1].datasets, function (d, i) {
					if (d.title === 'Mutations, gene') {
						index = i;
					}
				});
				self.sources[1].datasets.splice(index, 0, {
					dataSubType: 'mutationVector',
					dsID: 'http://cancerdb:7222/TARGET/TARGET_neuroblastoma/TARGET_neuroblastoma_mutationVector',
					title: 'Mutation'
				});

				opts = $(datasetsTemplate({sources: self.sources}));

				// there might or might not be a a select2 element.
				// need to find it & do a destroy.
				// replaceWith returns the removed elements.
				if (self.$dataset) {
					self.$dataset.select2('destroy');
				}
				self.$el.find('.dataset').replaceWith(opts);
				opts.select2({
					minimumResultsForSearch: 12,
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
		getDataSubType: getDataSubType,

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
