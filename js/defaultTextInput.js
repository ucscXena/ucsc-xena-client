/*jslint browser: true, nomen: true */
/*global define: false */

define(['lib/underscore', 'jquery'
	], function (_, $) {
	'use strict';

	var widgets = [],
		aWidget;

	aWidget = {

		destroy: function () {
			this.$el // TODO use rx handlers?
				.removeClass('defaultTextInput')
				.off('keyup change', '.columnTitle', this.change)
				.off('focusout', '.columnTitle', this.focusout);
			delete widgets[this.id];
		},

		setVal: function (val) {
			this.$el
				.val(val)
				.prop('title', val);
		},

		change: function () {
			if (this.$el.val() === this.defalt) {
				this.$el.addClass('defalt');
			} else {
				this.$el.removeClass('defalt');
			}
			this.setVal(this.$el.val());
		},

		focusout: function () {
			if (this.$el.val() === '') {
				this.setVal(this.defalt);
			}
			this.change();
			if (this.focusOutChanged) {
				this.focusOutChanged();
			}
		},

		initialize: function (options) {
			var self = this;
			_.bindAll.apply(_, [this].concat(_.functions(this)));
			//_(this).bindAll();
			this.$el = options.$el;
			this.getDefault = options.getDefault;
			this.focusOutChanged = options.focusOutChanged;
			if (!this.$el.hasClass('defaultTextInput')) {
				this.$el.addClass('defaultTextInput');
			}
			this.getDefault().subscribe(function (defalt) {
				if (!self.defalt || (self.$el.val() === self.defalt)) {
					self.defalt = defalt;
					self.setVal(defalt);
					self.change();
				} else {
					self.defalt = defalt;
				}
			});
			this.$el // TODO use rx handlers?
				.on('keyup change', this.change)
				.on('focusout', this.focusout);
		}
	};

	return {
		create: function (id, options) {
			var w;
			if (widgets[id]) {
				widgets[id].destroy();
			}
			w = Object.create(aWidget);
			w.id = id;
			w.initialize(options);
			widgets[id] = w;
			return w;
		}
	};
});
