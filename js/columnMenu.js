/*jslint nomen:true, browser: true */
/*global define: false */
/*global alert: false */

define(['haml!haml/columnMenu', 'columnEdit', 'download', 'kmPlot', 'mutationVector', 'Menu', 'jquery', 'lib/underscore'
	// non-object dependencies
	], function (template, columnEdit, download, kmPlot, mutationVector, Menu, $, _) {
	'use strict';

	var APPLY_BUTTON,
		ColumnMenu = function () {

			this.docClick = function () {
				if (this.firstDocClick) {
					this.firstDocClick = false;
				} else {
					this.destroy();
				}
			};

			this.editClick = function (ev) {
				this.columnUi.columnEdit = columnEdit.show(this.id, {
					columnUi: this.columnUi,
					APPLY_BUTTON: APPLY_BUTTON
				});
			};

			this.duplicateClick = function (ev) {
				this.duplicateColumn(this.id);
			};

			this.kmPlotClick = function (ev) {
				var self = this,
					column = this.columnUi.ws.column;
				if (this.$kmPlot.hasClass('disabled')) {
					return;
				}
				if (column.kmPlot) {
					kmPlot.moveToTop(this.id);
				} else {
					this.cursor.update(function (s) {
						return _.assoc_in(s, ['column_rendering', self.id, 'kmPlot'], { geometry: 'default' });
					});
				}
			};

			this.mupitClick = function (ev) {
				mutationVector.mupitClick(this.id);
			};

			this.downloadClick = function (ev) {
				download.create({
					ws: this.columnUi.ws,
					columnUi: this.columnUi,
					$anchor: this.$el
				});
			};

			this.mouseleave = function (ev) {
				this.destroyList();
			};

			this.viewMouseenter = function (ev) {
				this.$el.find('.viewList')
					.show()
					.position({ my: 'left top', at: 'right top', of: this.$el.find('.view') });
			};

			this.viewMouseleave = function (ev) {
				this.$el.find('.viewList').hide();
			};

			this.updateColumn = function (key, val) {
				var id = this.id;
				this.cursor.update(function (state) {
					var newState = _.assoc_in(state, ['column_rendering', id, key], val);
					return newState;
				});
			};

			this.detailClick = function (ev) {
				this.updateColumn('dataType', 'geneProbesMatrix');
			};

			this.geneAverageClick = function (ev) {
				this.updateColumn('dataType', 'geneMatrix');
			};

			this.impactClick = function (ev) {
				this.updateColumn('sFeature', 'impact');
			};

			this.dna_vafClick = function (ev) {
				this.updateColumn('sFeature', 'dna_vaf');
			};

			this.rna_vafClick = function (ev) {
				this.updateColumn('sFeature', 'rna_vaf');
			};

			this.removeClick = function (ev) {
				this.deleteColumn(this.id);
			};

			this.anchorClick = function (event, options) {
				if ($(event.target).hasClass('link')) {
					event.stopPropagation();
				} else {
					options.topAdd = -3;
					options.leftAdd = -25;
					this.menuAnchorClick(event, options);
				}
			};

			this.render = function () {
				var column = this.columnUi.ws.column,
					$kmPlot;
				this.menuRender($(template()));
				if (column.dataType === 'mutationVector') {
					this.$el.find('.mupit, .view, .impact, .dna_vaf, .rna_vaf, hr').show();
					this.$el.find('.' + column.sFeature + ' .ui-icon-check').css('opacity', 1);
				} else if (column.dataType === 'geneProbesMatrix') {
					this.$el.find('.view, .detail, .geneAverage, hr').show();
					this.$el.find('.detail .ui-icon-check').css('opacity', 1);
				} else if (column.dataType === 'geneMatrix' && column.fields.length === 1) {
					this.$el.find('.view, .detail, .geneAverage, hr').show();
					this.$el.find('.geneAverage .ui-icon-check').css('opacity', 1);
				}
				if (this.columnUi.plotData) {
					this.$kmPlot = this.$el.find('.kmPlot');
					this.$kmPlot.show();
					if (column.dataType !== 'geneProbesMatrix' && column.fields.length > 1) {
						this.$kmPlot.addClass('disabled');
					}
				}
			};

			this.initialize = function (options) {
				var self = this;
				_.bindAll.apply(_, [this].concat(_.functions(this)));

				APPLY_BUTTON = options.APPLY_BUTTON;
				this.columnUi = options.columnUi;
				this.cursor = options.cursor;
				this.state = options.state;
				this.deleteColumn = options.deleteColumn;

				this.moreItems = options.moreItems;
				this.menuInitialize(options);

				// bindings
				this.$el // TODO replace with Rx bindings ?
					.on('mouseleave', this.mouseleave)
					.on('click', '.mupit', this.mupitClick)
					.on('mouseenter', '.view', this.viewMouseenter)
					.on('mouseleave', '.view', this.viewMouseleave)
					.on('click', '.detail', this.detailClick)
					.on('click', '.geneAverage', this.geneAverageClick)
					.on('click', '.impact', this.impactClick)
					.on('click', '.dna_vaf', this.dna_vafClick)
					.on('click', '.rna_vaf', this.rna_vafClick)
					.on('click', '.kmPlot', this.kmPlotClick)
					.on('click', '.edit', this.editClick)
					.on('click', '.duplicate', this.duplicateClick)
					.on('click', '.download', this.downloadClick)
					.on('click', '.remove', this.removeClick);
			};
		};

	ColumnMenu.prototype = new Menu();

	function create(id, options) {
		var w = new ColumnMenu();
		w.id = id;
		w.initialize(options);
		return w;
	}

	return {
		create: function (id, options) {
			return create(id, options);
		}
	};
});
