/*jslint nomen:true, browser: true */
/*global define: false */

define(['haml!haml/columnMenu', 'columnEdit', 'download', 'mutationVector', 'Menu', 'jquery', 'lib/underscore'
	// non-object dependencies
	], function (template, columnEdit, download, mutationVector, Menu, $, _) {
	'use strict';

	var APPLY_BUTTON,
		ColumnMenu = function () {

			this.docClick = function () {
				console.log('docClick');
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
				console.log('duplicate');
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
				var list = $(template({
						type: this.columnUi.ws.column.dataType, // TODO should be more specifically mutation exon sparse
						moreItems: this.moreItems
					}));
				this.menuRender(list);
			};

			this.initialize = function (options) {
				var self = this;
				_.bindAll.apply(_, [this].concat(_.functions(this)));
				//_(this).bindAll();
				APPLY_BUTTON = options.APPLY_BUTTON;
				this.columnUi = options.columnUi;
				this.deleteColumn = options.deleteColumn;
				this.duplicateColumn = options.duplicateColumn;
				this.moreItems = options.moreItems;
				this.menuInitialize(options);

				// bindings
				this.$el // TODO replace with Rx bindings
					.on('click', '.duplicate', this.duplicateClick)
					.on('click', '.mupit', this.mupitClick)
					.on('click', '.download', this.downloadClick)
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
