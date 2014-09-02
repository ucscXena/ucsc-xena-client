/*jslint nomen:true, browser: true */
/*global define: false */

define(['haml!haml/columnMenu', 'columnEdit', 'download', 'mutationVector', 'Menu', 'jquery', 'lib/underscore'
	// non-object dependencies
	], function (template, columnEdit, download, mutationVector, Menu, $, _) {
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

			this.viewMouseenter = function (ev) {
				this.$el.find('.viewList')
					.show()
					.position({ my: 'left top', at: 'right top', of: this.$el.find('.view') });
			};

			this.viewMouseleave = function (ev) {
				this.$el.find('.viewList').hide();
			};

			this.renderColumn = function (dataType) {
				return; // TODO
				var json;
				json = {
					"width": this.column.width,
					"dsID": this.column.dsID,
					"dataType": dataType,
					"fields": this.column.fields
				};
				if (this.column.sFeature) {
					json.sFeature = this.column.sFeature;
				}
				$('#columnStub').val(JSON.stringify(json, undefined, 4));
				this.updateColumn(this.id);
			};

			this.detailClick = function (ev) {
				console.log('detailClick');
				this.renderColumn('geneProbesMatrix');
			};

			this.geneAverageClick = function (ev) {
				console.log('geneAverageClick');
				this.renderColumn('geneMatrix');
			};

			this.impactClick = function (ev) {
				console.log('impactClick');
				this.column.sFeature = 'impact';
				this.renderColumn('mutationMatrix');
			};

			this.dnaAfClick = function (ev) {
				console.log('dnaAfClick');
				this.column.sFeature = 'dnaAf';
				this.renderColumn('mutationMatrix');
			};

			this.rnaAfClick = function (ev) {
				console.log('rnaAfClick');
				this.column.sFeature = 'rnaAf';
				this.renderColumn('mutationMatrix');
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
				this.column = this.columnUi.ws.column;
				this.menuRender($(template()));
				if (this.column.dataType === 'mutationVector') {
					this.$el.find('.mupit, .view, .impact, .dnaAf, .rnaAf').show();
					this.$el.find('.' + this.column.sFeature + ' .ui-icon-check').css('opacity', 1);
				} else if (this.column.dataType === 'geneProbesMatrix') {
					this.$el.find('.view, .detail, .geneAverage').show();
					this.$el.find('.detail .ui-icon-check').css('opacity', 1);
				} else if (this.column.dataType === 'geneMatrix' && this.column.fields.length === 1) {
					this.$el.find('.view, .detail, .geneAverage').show();
					this.$el.find('.geneAverage .ui-icon-check').css('opacity', 1);
				}
			};

			this.initialize = function (options) {
				var self = this;
				_.bindAll.apply(_, [this].concat(_.functions(this)));

				APPLY_BUTTON = options.APPLY_BUTTON;
				this.columnUi = options.columnUi;
				this.updateColumn = options.updateColumn;
				this.deleteColumn = options.deleteColumn;
//				this.duplicateColumn = options.duplicateColumn;
				this.moreItems = options.moreItems;
				this.menuInitialize(options);

				// bindings
				this.$el // TODO replace with Rx bindings ?
					.on('click', '.duplicate', this.duplicateClick)
					.on('click', '.mupit', this.mupitClick)
					.on('click', '.download', this.downloadClick)
					.on('mouseenter', '.view', this.viewMouseenter)
					.on('mouseleave', '.view', this.viewMouseleave)
					.on('click', '.detail', this.detailClick)
					.on('click', '.geneAverage', this.geneAverageClick)
					.on('click', '.impact', this.impactClick)
					.on('click', '.dnaAf', this.dnaAfClick)
					.on('click', '.rnaAf', this.rnaAfClick)
					.on('click', '.remove', this.removeClick)
					.on('click', '.edit', this.editClick);
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
