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
				var bar,
					sum,
					textColors = _.map(options.colors, function (color) {
						var lightness,
							c;
						if (color.indexOf('#') === 0) {
							c = [
								parseInt(color.substring(1, 3), 16),
								parseInt(color.substring(3, 5), 16),
								parseInt(color.substring(5, 7), 16)
							];
						} else { // assume rgb, TODO untested
							c = _.map(color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/), function (c) {
								return Number(c);
							});
						}
						sum = _.reduce(c, function (sum, c) {
							return sum + c;
						}, 0);
						if (sum === 0) {
							lightness = 0;
						} else {
							lightness = sum / 3;
						}
						return lightness < 128 ? 'white' : 'black';
					});

				bar = template({
					colors: options.colors,
					textColors: textColors,
					labels: options.labels,
					tooltips: options.tooltips,
					align: options.align,
					vertical: options.vertical
				});
				this.$anchor.append(bar);
				if (options.$barLabel) {
					options.$barLabel.text(options.barLabel);
				}
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
