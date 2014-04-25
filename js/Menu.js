/*jslint browser: true, nomen: true */
/*global define: false */

define(["haml!haml/dropDownTemplate", "tooltip", "lib/underscore", "jquery"], function (template, tooltip, _, $) {
	'use strict';
	/* 
	 *	This menu depends on the following classes in the DOM elements:
	 *		.menu for the menu anchor
	 *		.list typically for the ul element, but may be another tag type
	 *		.focus for the first list item to have focus upon show; optional
	 *		.itemAlt on li elements wanting alternate shading
	 *		.noSelect on any elements that should not be select-highlighted or cause a hide menu
	 */

	var Menu = function () {

			this.menuDestroyList = function () {
				if (this.$list) {
					this.$list.remove();
					this.$list = undefined;
					this.$el.attr('title', this.anchorTitle);
					$(document).off('click.' + this.menuId);
					$('*').off('scroll.menu');
					//tooltip.activate(true); // TODO
					this.$el.removeClass('ui-state-hover');
				}
			};

			this.destroyList = function () {
				this.menuDestroyList();
			};

			this.clickOutsideThis = function (event, data) {
				var menu,
					target = $(event.target);
				if (target.hasClass('menu')) {
					menu = target;
				} else {
					menu = target.parents('.menu');
				}
				if (menu.length && menu[0] === this.$el[0]) {
					return;
				}

				if (this.fromSubmenu) {
					this.fromSubmenu -= 1;
					return;
				}

				this.destroyList();
			};

			this.scrollAnywhere = function (event) {
				if ($(event.target)[0] !== this.$list[0]) {
					this.destroyList(); // chrome is hitting this sometimes when scrolling in this.$list
				}
			};

			// position of list in these optional options:
			//		leftAdd: additive relative to anchor left; defaults to 0
			//		left: relative to window; overrides leftAdd
			//		topAdd: additive relative to anchor bottom; defaults to 0
			//		top: relative to window; overrides topAdd
			this.menuAnchorClick = function (event, options) {
				if (!($(event.target).hasClass('noSelect'))) {
					var offset = this.$el.offset(),
						top = options.top || (offset.top + this.$el.height() + (options.topAdd || 0)),
						left = options.left || (offset.left + (options.leftAdd || 0)),
						maxHeight = $(window).height() - top - 20;
					left -= $(window).scrollLeft();
					if (this.$list) {
						this.destroyList();
					} else {
						//tooltip.activate(false); // TODO
						this.render();
						this.$list.css({
							top: top,
							left: left,
							'max-height': maxHeight.toString() + 'px'
						});
						this.$el.removeAttr('title');
						if (this.geometryCallback) {
							this.geometryCallback();
						} else if (this.adjustGeometry) { // XXX could replace all uses of adjustGeometry() with geometryCallback
							this.adjustGeometry();
						}
						this.$list.scrollLeft(0);
						this.$el.find('.focus').focus();

						// bindings
						this.menuId = _.uniqueId('menu_');
						$(document).on('click.' + this.menuId, this.clickOutsideThis);
						$('*').on('scroll.menu', this.scrollAnywhere);
					}
				}
			};

			this.anchorClick = function (event, options) {
				var offset,
					height;
				if (this.dropDown) {
					offset = options.anchor.offset();
					height = options.anchor.height();
					this.menuAnchorClick(event, {
						left: offset.left + 6,
						top: offset.top + height
					});
				} else {
					this.menuAnchorClick(event, options);
				}
			};

			this.menuRender = function (list) {
				this.$el.append(list);
				this.$list = this.$el.find('.list');
			};

			this.render = function (list) { // TODO list is not known here
				this.menuRender(list);
			};

			this.menuInitialize = function (options) {
				var self = this;
				this.$el = options.anchor;
				this.$el.data('widget', this);
				this.anchorTitle = this.$el.attr('title');
				this.geometryCallback = options.geometryCallback;

				 // build a drop-down menu if requested
				if (options.dropDown) {
					this.dropDown = options.dropDown;
					options.anchor.append(template({
						rolledUpLabel: options.rolledUpLabel
					}));
					this.$rolledUpLabel = options.anchor.find('.rolledUpLabel');
				}

				_(this).bindAll();
				this.$el.on('click', function (event) {
					self.anchorClick(event, options);
				});
			};

			return this;
		};

	return Menu;
});
