/*jslint browser: true, nomen: true */
/*global define: false */

define(['haml!haml/colorBar', 'lib/underscore', 'jquery'
	], function (template, _, $) {
	'use strict';

	var widgets = [],
		Awidget = function () {

			this.destroy = function () {
				this.$anchor.empty();
			};

			this.render = function (options) {
				var bar = template({
					colors: options.colors,
					labels: options.labels,
					tooltips: options.tooltips
				});
				this.$anchor.append(bar);
				options.$barLabel.text(options.barLabel);
			};

			this.initialize = function (options) {
				this.$anchor = options.$anchor;
				this.render(options);
				return this;
			};
		};

	function create(id, options) {
		var w = new Awidget();
		w.id = options.id;
		w.initialize(options);
		return w;
	}

	return {
		create: function (id, options) {
			if (widgets[id]) {
				widgets[id].destroy();
			}
			widgets[id] = create(id, options);
			return widgets[id];
		}
	};
});
