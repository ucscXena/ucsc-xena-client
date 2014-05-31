/*jslint browser: true, nomen: true */
/*globals define: false, $: false, _: false */
define(['haml!haml/sheetWrap',
		'columnEdit',
		'columnUi',
		'uuid',
		'underscore_ext',
		'jquery',
		], function (template, columnEdit, columnUi, uuid, _, $) {

	"use strict";

	var widget,
		aWidget;

	// TODO copied from main.js 
	function deleteColumn(uuid, upd, state) {
		var cols = _.dissoc(upd.get_in(state, ['column_rendering']), uuid),
			order = _.without(upd.get_in(state, ['column_order']), uuid);
		return upd.assoc_in(
			upd.assoc_in(state, ['column_order'], order),
			['column_rendering'],
			cols
		);
	}

	aWidget = {

		deleteColumn: function (id) {
			return this.cursor.set(_.partial(deleteColumn, id));
		},

		duplicateColumn: function (id) {
			console.log('sheetWrap:duplicateColumn()');
		},

		addColumnClick: function (ev) {
			var id = uuid();
			columnEdit.show(id, {
				sheetWrap: this,
				columnUi: undefined,
				updateColumn: this.updateColumn
			});
		},

		cohortChange: function (ev) {
			this.cohort = this.$cohort.select2('val');
			if (this.cohort === 'TARGET_Neuroblastoma') { // TODO make dynamic
				$('#pickSamples').click();
			} else if (this.cohort === 'TCGA_BRCA') {
				$('#pickBrcaSamples').click();
			}
			columnEdit.destroyAll();
			this.$addColumn.show().click();

		},

		initialize: function (options) {
			var self = this;
			_.bindAll.apply(_, [this].concat(_.functions(this)));
			//_(this).bindAll();
			this.updateColumn = options.updateColumn;
			this.state = options.state;
			this.cursor = options.cursor;
			//this.cohort = this.state.pluck('cohort');

			this.$el = $(template());
			options.$anchor.append(this.$el);

			// cache jquery objects for active DOM elements
			this.cache = ['addColumn'];
			_(self).extend(_(self.cache).reduce(function (a, e) {
				a['$' + e] = self.$el.find('.' + e);
				return a;
			}, {}));

			this.$el.find('.cohort').select2({
				minimumResultsForSearch: -1,
				dropdownAutoWidth: true,
				placeholder: 'Select...',
				placeholderOption: 'first'
			});
			this.$cohort = this.$el.find('.select2-container.cohort');
			this.$cohort.select2('val', 'TARGET_Neuroblastoma');
			this.cohortChange();

			this.$el // TODO replace with rx event handlers
				.on('change', '.cohort', this.cohortChange)
				.on('click', '.addColumn', this.addColumnClick);
		}
	};

	function create(options) {
		var w = Object.create(aWidget);
		w.initialize(options);
		return w;
	}

	return {

		get: function () {
			return widget;
		},

		columnShow: function (id, ws) {
			return columnUi.show(id, { ws: ws, sheetWrap: widget });
		},

		create: function (options) {
			widget = create(options);
			return widget;
		}
	};
});
