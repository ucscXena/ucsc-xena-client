/*jslint nomen:true, browser: true */
/*global define: false */

define(['haml!haml/columnEdit', 'haml!haml/columnEditBasic', 'haml!haml/columnEditMode', 'haml!haml/columnEditAdvanced', 'defer', 'stub', 'lib/select2', 'jquery', 'lib/underscore',
	// non-object dependencies
	'lib/jquery-ui'
	], function (template, basicTemplate, modeTemplate, advancedTemplate, defer, stub, select2, $, _) {
	'use strict';

	var TEST = stub.TEST(),
		APPLY_BUTTON,
		widgets = {},
		datasets = [
			{
				name: 'allData',
				title: 'all sparse mutation datasets',
				dataType: 'sparseMutation'
			},
			{
				name: 'TCGA_LUAD_mutation_RADIA',
				title: 'TCGA lung adenocarcinoma (LUAD) somatic SNPs by RADIA',
				dataType: 'sparseMutation'
			},
			{
				name: 'TCGA_UCEC_mutation_RADIA',
				title: 'TCGA uterine corpus endometrioid carcinoma (UCEC) somatic SNPs by RADIA',
				dataType: 'sparseMutation'
			},
			{
				name: '8132-002-NWMS-CO_somaticNonSilentSNP',
				title: 'CCI trial patient 8132-002-NWMS-CO somatic non-silent SNPs by RADIA using triple bams',
				dataType: 'sparseMutation'
			},
			{
				name: 'testData',
				title: 'test data',
				dataType: 'sparseMutation'
			},
			{
				name: 'TCGA_LUAD_clinical',
				title: 'TCGA lung adenocarcinoma (LUAD) clinical',
				dataType: 'clinical'
			},
			{
				name: 'TCGA_LUAD_hMethyl450',
				title: 'TCGA lung adenocarcinoma (LUAD) DNA methylation (HumanMethylation450)',
				dataType: 'DNAMethylation'
			},
			{
				name: 'TCGA_LUAD_exp_HiSeqV2_exon',
				title: 'TCGA lung adenocarcinoma (LUAD) exon expression by RNAseq (IlluminaHiSeq)',
				dataType: 'expression'
			},
			{
				name: 'TCGA_LUAD_G44502A_07_3',
				title: 'TCGA lung adenocarcinoma (LUAD) gene expression (AgilentG4502A_07_3 array)',
				dataType: 'expression'
			},
			{
				name: 'TCGA_LUAD_RPPA',
				title: 'TCGA lung adenocarcinoma (LUAD) reverse phase protein array',
				dataType: 'protein'
			},
			{
				name: 'TCGA_LUAD_GSNP6raw',
				title: 'TCGA lung adenocarcinoma (LUAD) segmented copy number',
				dataType: 'CNV'
			},
			{
				name: 'TCGA_LUAD_mutation',
				title: 'TCGA lung adenocarcinoma (LUAD) somatic mutation',
				dataType: 'somaticMutation'
			}
		],
		modeLabels = {
			gene: 'single gene',
			genes: 'list of genes',
			probes: 'list of probes',
			chrom: 'chromosome coordinates',
			clinical: 'clinical'
		},
		modes = {
			CNV: ['gene', 'genes', 'chrom'],
			DNAMethylation: ['gene', 'genes', 'probes', 'chrom'],
			expression: ['gene', 'genes', 'probes', 'chrom'],
			somaticMutation: ['gene', 'genes'],
			sparseMutation: ['gene', 'genes', 'chrom'],
			protein: ['gene', 'genes', 'probes', 'chrom'],
			clinical: ['clinical']
		},
		// TODO moved to column.js
		features = [
			{name: 'impact', title: 'impact'}, // shorttitle ?
			{name: 'DNA_AF', title: 'DNA allele frequency'},
			{name: 'RNA_AF', title: 'RNA allele frequency'},
			{name: 'dataset', title: 'dataset'}
		],
		colors = [
			'grey_green_blue_red',
			'category_50', //'yellow_green_blue_red_rgb50',
			'category_25',
			'category_0',
			'scale_25',
			'category_transparent_25',
			'category_line',
			'category_gradient',
			'duplicate_checker'
		],
		pixs = ['fit to inherited height', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30],
		radii = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		points = [0.1, 0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
		refHeights = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
		sorts = ['impact, then position', 'position, then impact', 'sample ID'],
		genes = stub.getRefGeneNames2(),
		aWidget;

	function defaultDataset() {
		return datasets[0].name;
	}

	function defaultMode() {
		return modes[datasets[0].dataType][0];
		//return modes[0].name;
	}

	function defaultFeature() {
		return features[0].name;
	}

	function defaultColor() {
		return colors[2];
	}

	function defaultPix() {
		return pixs[0];
	}

	function defaultRadius() {
		if (TEST) {
			return radii[9];
		} else {
			return radii[4];
		}
	}

	function defaultPoint() {
		return points[1];
	}

	function defaultRefHeight() {
		return refHeights[6];
	}

	function defaultSort() {
		return sorts[0];
	}

	function defaultGene() {
		if (TEST) {
			return 'TP53';
		} else {
			return 'CDKN2A';
		}
	}

	function getDataType(datasetName) {
		var datasetInfo = _.find(datasets, function (d) {
				return d.name === datasetName; // TODO
			});
		return datasetInfo.dataType;
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

		renderMode: function (id) {
			var dataType = getDataType(this.$datasetSelect2.select2('val')),
				$mode,
				$modeAnchor;
			/*
			if (modes[dataType] === undefined) {
				this.$el.find('.modeRow').hide();
				return;
			}
			*/
			$mode = modeTemplate({
				modeSelectId: this.id.modeSelect,
				modes: modes[dataType],
				modeLabels: modeLabels
			});
			$modeAnchor = this.$el.find('.mode');
			$modeAnchor.empty();
			$modeAnchor.append($mode);
			this.$modeSelect2 = this.$el.find('#' + this.id.modeSelect);
			this.$el.find('.modeRow').show();
			this.$modeSelect2.select2({
				minimumResultsForSearch: -1,
				dropdownAutoWidth: true,
				val: 'exons'
			});
		},

		setFieldVisibility: function () {
			var dataset = this.$datasetSelect2.select2('val'),
				dataType;
			if (dataset === '') {
				this.$el.find('.modeRow, .advancedLabel').hide();
			} else {
				// TODO set the displayMode options depending on dataType
				this.renderMode();
				dataType = getDataType(dataset);
				if (dataType === 'sparseMutation') {
					this.$el.find('.advancedLabel').show();
				} else {
					this.$el.find('.advancedLabel').hide();
				}
			}
		},

		datasetChange: function (e) {
			this.setFieldVisibility();
			if (!APPLY_BUTTON) {
				this.column.datasetChange(this.$datasetSelect2.select2('val'));
			}
		},

		modeChange: function (e) {
			if (!APPLY_BUTTON) {
				this.column.modeChange(this.$modeSelect2.select2('val'));
			}
		},

		goClick: function (e) {
			if (APPLY_BUTTON) {
				this.column.editGo(
					this.$datasetSelect2.select2('val'),
					this.$modeSelect2.select2('val')
				);
				this.destroy();
			}
		},

		featureChange: function (e) {
			this.column.featureChange(this.$featureSelect2.select2('val'));
		},

		toggleAdvanced: function (e) {
			var label = (this.$advancedLabel.text() === 'Advanced:')
				? 'Advanced...'
				: 'Advanced:';
			this.$advanced.toggle();
			this.$advancedLabel.text(label);
		},

		colorChange: function (e) {
			this.column.colorChange(this.$colorSelect2.select2('val'));
		},

		pixChange: function (e) {
			this.column.pixChange(this.$pixSelect2.select2('val'));
		},

		radiusChange: function (e) {
			this.column.radiusChange(Number(this.$radiusSelect2.select2('val')));
		},

		pointChange: function (e) {
			this.column.pointChange(Number(this.$pointSelect2.select2('val')));
		},

		refHeightChange: function (e) {
			this.column.refHeightChange(Number(this.$refHeightSelect2.select2('val')));
		},

		sortChange: function (e) {
			this.column.sortChange(this.$sortSelect2.select2('val'));
		},

		geneChange: function (e) {
			this.column.geneChange(this.$geneSelect2.select2('val'));
		},

		geneInputChange: function (e) {
			var RETURN = 13,
				val;
			this.$geneInput.css('color', 'black');
			if (e.keyCode === RETURN) {
				val = this.$geneInput.val();
				if (genes.indexOf(val.toUpperCase()) > -1) {
					this.column.geneChange(val);
				} else {
					this.$geneInput.val(val + ' not found');
					this.$geneInput.css('color', 'red');
				}
			}
		},

		renderFields: function (id) {
			this.$el.find('.datasetSelect').select2({
				minimumResultsForSearch: -1,
				dropdownAutoWidth: true,
				placeholder: 'Select...',
				placeholderOption: 'first'
			});
			this.$datasetSelect2 = this.$el.find('#' + id.datasetSelect);

			this.$el.find('.geneSelect').select2({
				dropdownAutoWidth: true
			});
			this.$geneSelect2 = this.$el.find('#' + id.geneSelect);

			if (this.$datasetSelect2.select2('val') !== '') {
				this.renderMode(id);
			}

			this.$el.find('.featureSelect').select2({
				minimumResultsForSearch: -1,
				dropdownAutoWidth: true
			});
			this.$featureSelect2 = this.$el.find('#' + id.featureSelect);

			this.$el.find('.colorSelect').select2({
				minimumResultsForSearch: -1,
				dropdownAutoWidth: true
			});
			this.$colorSelect2 = this.$el.find('#' + id.colorSelect);

			this.$el.find('.pixSelect').select2({
				minimumResultsForSearch: -1,
				dropdownAutoWidth: true
			});
			this.$pixSelect2 = this.$el.find('#' + id.pixSelect);

			this.$el.find('.radiusSelect').select2({
				minimumResultsForSearch: -1,
				dropdownAutoWidth: true
			});
			this.$radiusSelect2 = this.$el.find('#' + id.radiusSelect);

			this.$el.find('.pointSelect').select2({
				minimumResultsForSearch: -1,
				dropdownAutoWidth: true
			});
			this.$pointSelect2 = this.$el.find('#' + id.pointSelect);

			this.$el.find('.refHeightSelect').select2({
				minimumResultsForSearch: -1,
				dropdownAutoWidth: true
			});
			this.$refHeightSelect2 = this.$el.find('#' + id.refHeightSelect);

			this.$el.find('.sortSelect').select2({
				minimumResultsForSearch: -1,
				dropdownAutoWidth: true
			});
			this.$sortSelect2 = this.$el.find('#' + id.sortSelect);

			this.setFieldVisibility();
		},

		position: function () {
			var self = this;
			defer(function () {
				self.$el.dialog('option', 'position', {
					my: 'left+10 top-2',
					at: 'right top',
					of: self.column.$el
				});
			});
		},

		render: function (options) {
			var self = this,
				id,
				basic,
				advanced;
			this.id = {
				datasetSelect: _.uniqueId(),
				geneSelect: _.uniqueId(),
				modeSelect: _.uniqueId(),
				featureSelect: _.uniqueId(),
				colorSelect: _.uniqueId(),
				pixSelect: _.uniqueId(),
				radiusSelect: _.uniqueId(),
				pointSelect: _.uniqueId(),
				refHeightSelect: _.uniqueId(),
				sortSelect: _.uniqueId()
			};
			id = this.id;
			basic = basicTemplate({
				datasetSelectId: id.datasetSelect,
				datasets: datasets,
				modeSelectId: id.modeSelect,
				//modes: modes[datasets[0].dataType],
				featureSelectId: id.featureSelect,
				features: features,
				geneSelectId: id.geneSelect,
				genes: genes
			});
			advanced = advancedTemplate({
				sortSelectId: id.sortSelect,
				sorts: sorts,
				colorSelectId: id.colorSelect,
				colors: colors,
				pixSelectId: id.pixSelect,
				pixs: pixs,
				radiusSelectId: id.radiusSelect,
				radii: radii,
				pointSelectId: id.pointSelect,
				points: points,
				refHeightSelectId: id.refHeightSelect,
				refHeights: refHeights
			});
			this.$el = $(template({
				basic: basic,
				advanced: advanced
			}));

			this.renderFields(id);

			// cache jquery objects for active DOM elements
			this.cache = ['geneInput', 'advanced', 'advancedLabel'];
			_(self).extend(_(self.cache).reduce(function (a, e) {
				a['$' + e] = self.$el.find('.' + e);
				return a;
			}, {}));

			if (!TEST) {
				this.$el.find('.geneSelect').css('display', 'none');
			}

			this.$el.dialog({
				title: 'Define Column',
				//position: dialogPosition,
				width: '725', // TODO make dynamic
				close: this.destroy
			});
			this.position();
		},

		initialize: function (options) {
			_(this).bindAll();
			APPLY_BUTTON = options.APPLY_BUTTON;
			this.$anchor = options.$anchor;
			this.column = options.column;
			this.firstRenderDataset = true;
			this.render(options);

			this.$colorSelect2.select2('val', defaultColor());
			this.$pixSelect2.select2('val', defaultPix());
			this.$radiusSelect2.select2('val', defaultRadius());
			this.$pointSelect2.select2('val', defaultPoint());
			this.$refHeightSelect2.select2('val', defaultRefHeight());
			this.$sortSelect2.select2('val', defaultSort());
			this.$el
				.on('mouseenter mouseleave', this.column.mouseenterLeave)
				.on('change', '.datasetSelect', this.datasetChange)
				//.on('change', '.geneSelect', this.geneChange)
				//.on('keydown', '.geneInput', this.geneInputChange)
				//.on('change', '.modeSelect', this.modeChange)
				//.on('change', '.featureSelect', this.featureChange)
				.on('click', '.advancedLabel', this.toggleAdvanced)
				.on('change', '.sortSelect', this.sortChange)
				.on('change', '.colorSelect', this.colorChange)
				.on('change', '.pixSelect', this.pixChange)
				.on('change', '.radiusSelect', this.radiusChange)
				.on('change', '.pointSelect', this.pointChange)
				.on('change', '.refHeightSelect', this.refHeightChange);
			if (APPLY_BUTTON) {
				this.$el.on('click', '.go', this.goClick);
			}
			if (options.dataset) {
				this.$datasetSelect2.select2('val', options.dataset);
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

		getDataType: getDataType,
		defaultDataset: defaultDataset,
		defaultMode: defaultMode,
		defaultFeature: defaultFeature,
		defaultColor: defaultColor,
		defaultPix: defaultPix,
		defaultRadius: defaultRadius,
		defaultPoint: defaultPoint,
		defaultRefHeight: defaultRefHeight,
		defaultSort: defaultSort,
		defaultGene: defaultGene
	};
});
