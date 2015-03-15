/*jslint browser: true, nomen: true */
/*global define: false */

define(['haml/colorBar.haml', 'underscore', 'jquery'
	], function (template, _, $) {
	'use strict';

	var widgets = [],
		Awidget = function () {

			this.destroy = function () {
				this.$bar.remove();
				delete widgets[this.id];
			};

			this.render = function (options) {
				var sum,
					$color,
					textColors = _.map(options.colors, function (color) {
						var c,
							lightness = 0;
						if (color.indexOf('rgba') === 0) { // rgba
							c = _.map(color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)$/), function (clr) {
								return Number(clr);
							});
							return (c[4] === 1) ? 'white' : 'black';
						} else {
							// XXX There are proper formulas for luminance, which
							// we might consider using.
							// http://stackoverflow.com/questions/596216/formula-to-determine-brightness-of-rgb-color
							if (color.indexOf('#') === 0) { // hexidecimal
								c = [
									parseInt(color.substring(1, 3), 16),
									parseInt(color.substring(3, 5), 16)*2,
									parseInt(color.substring(5, 7), 16)
								];
							} else { // assume rgb
								c = _.map(color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/), function (clr) {
									return Number(clr);
								});
								c.shift();
							}
							sum = c[0] + c[1] + c[2];
							if (sum > 0) {
								lightness = sum / 3;
							}
						}
						return (lightness < 147) ? 'white' : 'black';
					});
				this.$bar = $(template({
					colors: options.colors,
					textColors: textColors,
					labels: options.labels,
					tooltips: options.tooltips,
					align: options.align
				}));
				options.$prevRow.after(this.$bar);
				$color = this.$bar.find('.color');
				$($color[0]).css('border-top', '1px #bbbbbb solid');
				$($color[$color.length - 1]).css('border-bottom', '1px #bbbbbb solid');
				this.$bar.find('.colorTd').addClass(options.klass);
				if (options.$barLabel) {
					options.$barLabel.text(options.barLabel);
				}
			};

			this.initialize = function (options) {
				_.bindAll.apply(_, [this].concat(_.functions(this)));
				//_(this).bindAll();
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
