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
		defaultFeature = '_INTEGRATION',
		//defaultFeature = 'days_to_birth',
		defaultField = 'fields for this option',
		defaultWidth = 100,

		displaysByDataSubType = {
			cna: ['dGene', 'dGenes', /*'dGeneChrom', 'dChrom'*/],
			DNAMethylation: ['dGene', 'dGenes', /*'dGeneProbes', 'dProbes', 'dGeneChrom', 'dChrom'*/],
			geneExp: ['dGene', 'dGenes', /*'dGeneProbes', 'dProbes', 'dGeneChrom', 'dChrom'*/], // TODO replace with RNAseqExp & arrayExp
			RNAseqExp: ['dGene', 'dGenes', /*'dGeneChrom', 'dChrom'*/],
			arrayExp: ['dGene', 'dGenes', /*'dGeneProbes', 'dProbes', 'dGeneChrom', 'dChrom'*/],
			somaticMutation: ['dGene', 'dGenes'],
			sparseMutation: ['dExonSparse', /*'dGeneChrom', 'dChrom'*/],
			protein: ['dGene', 'dGenes', /*'dGeneProbes', 'dProbes', 'dGeneChrom', 'dChrom'*/],
			null: ['dClinical']
		},
		displaysByInput = {
			iGene: ['dGene', 'dGeneProbes', 'dGeneChrom', 'dExonDense', 'dExonSparse'],
			iGenes: ['dGenes'],
			iProbes: ['dProbes'],
			iChrom: ['dChrom'],
			iClinical: ['dClinical']
		},
		inputModeLabels = {
			iGene: 'single gene',
			iGenes: 'list of genes',
			iProbes: 'list of probes',
			iChrom: 'chromosome coordinates',
			iClinical: 'clinical'
		},
		displayModeLabels = {
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
			if (!this.state.feature) {
				this.state.feature = defaultFeature;
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

		renderChrom: function () {
			if (this.state.inputMode === 'iChrom') {
				if (!this.state.chrom || this.state.chrom === '') {
					this.state.chrom = defaultChrom;
				}
				this.$chrom.val(this.state.chrom);
				this.$chromRow.show();
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
					"width": 300,
					"dsID": this.state.dsID,
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
			this.$el.find('tr:not(.static)').hide();
			this.$inputModeAnchor.empty();
			this.$displayModeAnchor.empty();
			this.$inputMode = undefined;
			this.$displayMode = undefined;

			this.renderInputModes(dataSubType);
			this.renderList();
			this.renderChrom();
			this.renderDisplayModes(dataSubType);

			this.renderColumn();
		},

		displayModeChange: function () {
			this.state.displayMode = this.$displayMode.select2('val');
			this.reRender();
		},

		chromBlur: function () {
			this.state.chrom = this.$chrom.val();
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
			if (this.column) {
				offset = 10;
				of = this.column.$el;
			} else {
				offset = defaultWidth - 12;
				of = this.sheetWrap.$addColumn;
			}
			defer(function () {
				self.$el.dialog('option', 'position', {
					my: 'left+' + offset + ' top+105',
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
			this.cache = ['inputModeRow', 'inputModeAnchor', 'listRow', 'list', 'chromRow', 'chrom',
				'displayModeRow', 'displayModeAnchor', 'columnTitleRow', 'advanced', 'advancedLabel'];
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
			this.column = options.column;
			this.updateColumn = options.updateColumn;
			this.firstRenderDataset = true;
			this.state = {};
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
				.on('blur', '.chrom', this.chromBlur)
				.on('change', '.displayMode', this.displayModeChange);
			if (this.column) {
				this.$el.on('mouseenter mouseleave', this.column.mouseenterLeave);
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
