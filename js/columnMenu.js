/*jslint nomen:true, browser: true */
/*global define: false */

define(['haml!haml/columnMenu', 'columnEdit', 'Menu', 'jquery', 'lib/underscore'
	// non-object dependencies
	], function (template, columnEdit, Menu, $, _) {
	'use strict';

	var APPLY_BUTTON,
		ColumnMenu = function () {

			this.showItem = function (item) {
				this.show[item] = true;
			};

			this.hideItem = function (item) {
				this.show[item] = false;
			};

			this.docClick = function () {
				console.log('docClick');
				if (this.firstDocClick) {
					this.firstDocClick = false;
				} else {
					this.destroy();
				}
			};

			this.editClick = function (ev) {
				this.column.columnEdit = columnEdit.show(this.id, {
					column: this.column,
					APPLY_BUTTON: APPLY_BUTTON
				});
			};

			this.duplicateClick = function (ev) {
				console.log('duplicate');
				this.duplicateColumn(this.id);
			};

			this.mupitClick = function (ev) {
				console.log('mupitView');
				if (this.column.mutation) {
					this.column.mutation.mupitClick();
				}
			};

			this.removeClick = function (ev) {
				this.deleteColumn(this.id);
			};

			this.render = function () {
				var cache,
					list = $(template({
						moreItems: this.moreItems
					}));
				this.menuRender(list);
				this.$mupit = this.$el.find('.mupit');
				/*
				cache = ['mupit'];
					_(self).extend(_(self.cache).reduce(function (a, e) {
						a['$' + e] = self.$el.find('.' + e);
						return a;
					}, {}));
				if (this.show.mupit) {
					this.$mupit.show();
				} else {
					this.$mupit.hide();
				}
				*/
			};

			this.initialize = function (options) {
				var self = this;
				_.bindAll.apply(_, [this].concat(_.functions(this)));
				//_(this).bindAll();
				APPLY_BUTTON = options.APPLY_BUTTON;
				this.column = options.column;
				this.deleteColumn = options.deleteColumn;
				this.duplicateColumn = options.duplicateColumn;
				this.moreItems = options.moreItems;
				this.show = {};
				this.show.mupit = false;
				this.menuInitialize(options);

				// bindings
				this.$el // TODO replace with Rx bindings
					.on('click', '.duplicate', this.duplicateClick)
					.on('click', '.mupit', this.mupitClick)
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
