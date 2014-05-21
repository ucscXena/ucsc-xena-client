/*jslint nomen:true, browser: true */
/*global define: false */

define(['stub', 'haml!haml/columnUi', 'haml!haml/tupleDisplay', 'colorBar', 'columnEdit', 'columnMenu', 'defer', /*'mutation',*/ 'refGene', 'util', 'lib/d3', 'jquery', 'lib/select2', 'lib/underscore'
	// non-object dependenciies
	], function (stub, template, tupleTemplate, colorBar, columnEdit, columnMenu, defer, /*mutation,*/ refGene, util, d3, $, select2, _) {
	'use strict';

	var TEST = stub.TEST(),
		untitle = 'untitled column',
		each = _.each,
		filter = _.filter,
		find = _.find,
		map = _.map,
		reduce = _.reduce,
		toNumber = _.toNumber,
		uniqueId = _.uniqueId,
		genes = stub.getRefGeneNames2(),
		columnUntitles = {
			cna: 'copy number',
			DNAMethylation: 'DNA methylation',
			geneExp: 'gene expression',
			RNAseqExp: 'RNA sequence expression',
			arrayExp: 'array expression',
			somaticMutation: 'somatic mutation',
			sparseMutation: 'sparse mutation',
			protein: 'protein',
			null: 'clinical feature'
		},
		features = [
			{name: 'impact', title: 'Impact:'}, // shorttitle ?
			{name: 'DNA_AF', title: 'DNA allele frequency:'},
			{name: 'RNA_AF', title: 'RNA allele frequency:'},
			{name: 'dataset', title: 'Dataset:'}
		],
		widgets = {},
		aWidget = {

			destroy: function () {
				this.$el.remove();
				// TODO clean up subWidgets
				delete widgets[this.id];
			},

			titleChange: function (e) {
				if (this.$columnTitle.val() === this.untitle) {
					this.$columnTitle.addClass('untitled');
				} else {
					this.$columnTitle.removeClass('untitled');
				}
			},

			titleFocusout: function (e) {
				if (this.$columnTitle.val() === '') {
					this.$columnTitle.val(this.untitle);
				}
				this.titleChange();
			},

			renderPlots: function () {
				console.log('columnUi.renderPlots()');
			/*
				var datasetName = this.columnEdit.$datasetSelect2.select2('val'),
					dataType = columnEdit.getDataType(datasetName),
					mode,
					text,
					$plot = this.$el.find('.samplePlot'),
					$stub;
				switch (dataType) {
				case 'sparseMutation':
					this.columnMenu.showItem('mupit');
					this.renderPlotsMutation();
					break;
				default:
					this.columnMenu.hideItem('mupit');
					if (this.columnEdit.$modeSelect2) {
						mode = this.columnEdit.$modeSelect2.select2('val');
					}
					$stub = $(tupleTemplate({
						header: 'future plot of:',
						labels: ['dataset:', 'dataType:', 'displayMode:'],
						values: [datasetName, dataType, mode]
					}));
					$plot.append($stub);
					$plot.find('.tupleDisplay').css({
						'margin-top': '130px',
						'margin-left': '5px',
						'font-style': 'italic'
					});
					$plot.parents('tr').removeClass('new');
					break;
				}
				*/
			},

			resize: function () {
				var self = this;
				setTimeout(function () {
					var width = self.$el.width()
						- self.$columnTitle.css('padding-left').replace('px', '')
						- self.$columnTitle.css('padding-right').replace('px', '')
						- self.$columnTitle.css('border-left-width').replace('px', '')
						- self.$columnTitle.css('border-right-width').replace('px', '')
						- self.$more.width()
						- 4; // for don't know what
					self.$columnTitle.width(width);
				}, 200);
			},

			render: function (options) {
				var ui = options.ws.column.ui,
					untitle = columnUntitles[ui.dataSubType];
				if (!this.untitle || (this.$columnTitle.val() === this.untitle)) {
					this.untitle = untitle;
					this.$columnTitle.val(untitle);
					this.titleChange();
				} else {
					this.untitle = untitle;
				}
				this.resize();
			},

			initialize: function (options) {
				var self = this,
					ws = options.ws;
				_.bindAll.apply(_, [this].concat(_.functions(this)));
				//_(this).bindAll();
				this.$anchor = $(ws.el);
				this.width = ws.column.width;
				this.height = ws.height;
				this.sheetWrap = options.sheetWrap;
				this.$el = $(template({
					features: undefined
				}));
				this.$anchor.append(this.$el);

				// cache jquery objects for active DOM elements
				this.cache = ['columnTitle', 'more', 'samplePlot'];
				_(self).extend(_(self.cache).reduce(function (a, e) { a['$' + e] = self.$el.find('.' + e); return a; }, {}));
				this.columnMenu = columnMenu.create(this.id, {
					anchor: this.$more,
					column: this,
					deleteColumn: this.sheetWrap.deleteColumn,
					duplicateColumn: this.sheetWrap.duplicateColumn
				});
				//this.$columnTitle.on('blur', this.titleFocusOut);
				this.$el // TODO use rx handlers?
					.on('resize', this.resize)
					.on('keyup change', '.columnTitle', this.titleChange)
					.on('focusout', '.columnTitle', this.titleFocusout);

				this.render(options);
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
				widget.render(options);
			} else {
				widget = widgets[id] = create(id, options);
			}
			return widget.$samplePlot;
		}
	};
});
