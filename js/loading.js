/*eslint strict: [2, "function"] */
/*eslint-env browser */
/*global define: false */
define(["jquery", "config", 'haml/loading.haml',
	'jquery-ui', '../images/snake.gif'], function ($, config, template, image) {
	'use strict';

	$.widget('cancerBrowser.loading', {
		options: {
			height: 16,
			left: 0,
			top: 0
		},

		// shows the loading image in the middle of the anchor element
		show: function () {
			var a = this.element,
				offset = a.offset(),
				left = a.width() / 2 + offset.left - (this.options.height / 2) - $(window).scrollLeft(),
				top = a.height() / 2 + offset.top - (this.options.height / 2);
			this.$el.css({ 'left': left, 'top': top });
			this.$el.show();
		},

		hide: function () {
			this.$el.hide();
		},

		_create: function () {
			var options = this.options;
			this.$el = $(template({
				loadingSrc: image
			}));
			this.$el.css({ 'height': options.height + 'px' });
			this.element.append(this.$el);
		}
	});
});
