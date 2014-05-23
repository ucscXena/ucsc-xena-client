/*jslint nomen:true, browser: true */
/*global define: false */

define(['haml!haml/columnEdit', 'haml!haml/columnEditBasic', 'haml!haml/select', 'haml!haml/columnEditAdvanced', 'defer', 'stub', 'lib/select2', 'jquery', 'underscore_ext',
	// non-object dependencies
	'lib/jquery-ui'
	], function (template, basicTemplate, selectTemplate, advancedTemplate, defer, stub, select2, $, _) {
	'use strict';

	var datasetsStub = stub.getDatasets(),

		// TODO: make these more global
		defaultGene = 'ALK',
		defaultGenes = 'ALK, PTEN',
		defaultProbes = 'no probes entered', // TODO
		defaultChrom = 'chr1-chrY',
		defaultField = 'fields for this option',
		defaultWidth = 100,

		displaysByDataSubType = { // TODO combine with columnUi:columnUntitles
			cna: ['dGene', 'dGenes', /*'dGeneChrom', 'dChrom'*/],
			DNAMethylation: ['dGene', 'dGenes', /*'dGeneProbes', 'dProbes', 'dGeneChrom', 'dChrom'*/],
			geneExp: ['dGene', 'dGenes', /*'dGeneProbes', 'dProbes', 'dGeneChrom', 'dChrom'*/], // TODO replace with RNAseqExp & arrayExp
			RNAseqExp: ['dGene', 'dGenes', /*'dGeneChrom', 'dChrom'*/],
			arrayExp: ['dGene', 'dGenes', /*'dGeneProbes', 'dProbes', 'dGeneChrom', 'dChrom'*/],
			somaticMutation: ['dGene', 'dGenes'],
			sparseMutation: ['dExonSparse', /*'dGeneChrom', 'dChrom'*/],
			protein: ['dGene', 'dGenes', /*'dGeneProbes', 'dProbes', 'dGeneChrom', 'dChrom'*/],
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
			dGene: 'nonspatial',
			dGeneProbes: 'nonspatial',
			dExonDense: 'spatialExonDense',
			dExonSparse: 'spatialExonSparse',
			dGeneChrom: 'spatialGeneChrom',
			dGenes: 'nonspatial',
			dProbes: 'nonspatial',
			dClinical: 'nonspatial',
			dChrom: 'spatialChrom'
		},
		widgets = {},
		aWidget;

	function getDataSubType(dsID) {
		var datasetInfo = _.find(datasetsStub, function (d) {
				return d.dsID === dsID; // TODO
			});
		return datasetInfo.dataSubType;
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

	aWidget = {

		destroy: function () {
			this.$el.dialog('destroy').remove();
			delete widgets[this.id];
		},

		moveToTop: function () {
			if (this.$el) {
				this.$el.dialog('moveToTop');
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
				this.$list.val(this.state.genes);
				this.$listRow.show();
			} else if (this.state.inputMode === 'iProbes') {
				if (!this.state.probes || this.state.probes === '') {
					this.state.probes = defaultProbes;
				}
				this.$list.val(this.state.probes);
				this.$listRow.show();
			}
		},

		renderSingle: function () {
			if (this.state.inputMode === 'iChrom') {
				if (!this.state.chrom || this.state.chrom === '') {
					this.state.chrom = defaultChrom;
				}
				this.$single.val(this.state.chrom);
				this.$singleRow.show();
			} else if (this.state.inputMode === 'iGene') {
				if (!this.state.gene || this.state.gene === '') {
					this.state.gene = defaultGene;
				}
				this.$single.val(this.state.gene);
				this.$singleRow.show();
			}
		},

		renderSelect: function () {
			if (this.state.inputMode === 'iClinical') {
				this.$selectAnchor.append(
					selectTemplate({
						klass: 'feature',
						options: stub.getFeatures(),
						labels: undefined
					})
				);
				this.$selectRow.show();
				this.$el.find('.feature').select2({
					minimumResultsForSearch: 20,
					dropdownAutoWidth: true
				});
				this.$feature = this.$el.find('.select2-container.feature');
				if (this.state.feature) {
					this.$feature.select2('val', this.state.feature);
				}
			}
		},

		renderTitle: function (dataSubType) {
			//this.$title.val(this.columnUi.getTitle(dataSubType));
		},

		renderGo: function () {
			if (this.state.dsID) {
				this.$goRow.show();
			}
		},

		getFields: function () {
			var fields;
			switch (this.state.inputMode) {
			case 'iGene':
				fields = [this.state.gene];
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
			console.log('columnEdit.reRender(): id: ' + this.id);
			var dataSubType = getDataSubType(this.state.dsID);
			if (dataSubType === 'mutationVector' || dataSubType === 'sparseMutation') {
				return;
			}
			this.$el.find('tr:not(.static)').hide();
			this.$inputModeAnchor.empty();
			this.$inputMode = undefined;
			this.$displayModeAnchor.empty();
			this.$displayMode = undefined;
			this.$selectAnchor.empty();
			this.$feature = undefined;

			this.renderInputModes(dataSubType);
			this.renderList();
			this.renderSingle();
			this.renderDisplayModes(dataSubType);
			this.renderSelect();
			this.renderTitle(dataSubType);
			this.renderGo();

			//this.renderColumn();
		},

		goClick: function () {
			this.renderColumn();
			this.destroy();
		},

		featureChange: function () {
			this.state.feature = this.$feature.select2('val');
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
			this.state.dsID = this.$dataset.select2('val');
			this.reRender();
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
			console.log('columnEdit.render(): id: ' + this.id);
			var self = this,
				basic;
			basic = basicTemplate({
				datasets: this.datasets
			});
			this.$el = $(template({
				basic: basic,
				advanced: undefined
				//advanced: advanced
			}));

			this.$el.find('.dataset').select2({
				minimumResultsForSearch: -1,
				dropdownAutoWidth: true,
				placeholder: 'Select...',
				placeholderOption: 'first'
			});
			this.$dataset = this.$el.find('.select2-container.dataset');

			// cache jquery objects for active DOM elements
			this.cache = ['inputModeRow', 'inputModeAnchor', 'listRow', 'list', 'singleRow', 'single',
				'selectRow', 'selectAnchor',
				'displayModeRow', 'displayModeAnchor', 'columnTitleRow', 'goRow', 'advanced', 'advancedLabel'];
			_(self).extend(_(self.cache).reduce(function (a, e) {
				a['$' + e] = self.$el.find('.' + e);
				return a;
			}, {}));

			this.$el.dialog({
				title: 'Define Column',
				width: '600', // TODO make dynamic ?
				close: this.destroy
			});
			this.position();
		},

		initialize: function (options) {
			_.bindAll.apply(_, [this].concat(_.functions(this)));
			//_(this).bindAll();
			this.$anchor = options.$anchor;
			this.sheetWrap = options.sheetWrap;
			this.columnUi = options.columnUi;
			this.updateColumn = options.updateColumn;
			this.firstRenderDataset = true;
			this.state = {},
			//this.state = options.state;
			datasetsStub = stub.getDatasets(),
			this.datasets = datasetsStub; // TODO
			this.render();
			if (options.dataset) {
				this.$dataset.select2('val', options.dataset);
			}

			this.$el // TODO replace with rx event handlers
				.on('change', '.dataset', this.datasetChange)
				.on('change', '.inputMode', this.inputModeChange)
				.on('blur', '.list', this.listBlur)
				.on('blur', '.single', this.singleBlur)
				.on('change', '.displayMode', this.displayModeChange)
				.on('change', '.feature', this.featureChange)
				.on('click', '.go', this.goClick);
			if (this.columnUi) {
				this.$el.on('mouseenter mouseleave', this.columnUi.mouseenterLeave);
			}
		}
	};

	function create(id, options) {
		var w = Object.create(aWidget);
		w.id = id;
		w.initialize(options);
		return w;
	}

	return {
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
		},

		getDataSubType: getDataSubType
	};
});
