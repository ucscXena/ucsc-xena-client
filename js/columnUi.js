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
				if (this.$title.val() === untitle) {
					this.$title.addClass('untitled');
				} else {
					this.$title.removeClass('untitled');
				}
			},

			titleFocusout: function (e) {
				if (this.$title.val() === '') {
					this.$title.val(untitle);
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

			initialize: function (options) {
				var self = this,
					ws = options.ws;
				_.bindAll.apply(_, [this].concat(_.functions(this)));
				//_(this).bindAll();
				this.$anchor = $(ws.el);
				this.width = ws.column.width;
				this.height = ws.height;
				this.sheetWrap = options.sheetWrap;
				this.$el = $(template());
				this.$anchor.append(this.$el);

				// cache jquery objects for active DOM elements
				this.cache = ['more', 'samplePlot'];
				_(self).extend(_(self.cache).reduce(function (a, e) { a['$' + e] = self.$el.find('.' + e); return a; }, {}));

				this.columnMenu = columnMenu.create(this.id, {
					anchor: this.$more,
					column: this,
					deleteColumn: this.sheetWrap.deleteColumn,
					duplicateColumn: this.sheetWrap.duplicateColumn
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
		show: function (id, options) {
			var widget = widgets[id];
			if (widget) {
				widget.show();
			} else {
				widget = widgets[id] = create(id, options);
			}
			return widget.$samplePlot;
		}
	};
});
