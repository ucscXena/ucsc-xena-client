/*global define: false, navigator: false */
define([ "jquery" ], function ($) {
	'use strict';

	var scrollbarWidth;

	return {
		focus: function (el, initial) {
			if (el.val() === initial) {
				el.val('');
				el.css('color', 'inherit');
			}
		},

		blur: function (el, initial) {
			if (el.val().length === 0) {
				el.val(initial);
				el.css('color', 'grey');
			}
		},

		// Strip any leading "genomic_" from a dataset ID for viewing by user.
		userDsID: function (dsID) {
			var prefix = 'genomic_';
			if (dsID.indexOf(prefix) === 0) {
				return dsID.slice(prefix.length, dsID.length);
			} else {
				return dsID;
			}
		},

		scrollbarWidth: function () {
			var div, w1, w2;
			if (!scrollbarWidth) {
				div = $('<div style="width:50px;height:50px;overflow:hidden;position:absolute;top:-200px;left:-200px;"><div style="height:100px;"></div></div>');
				$('body').append(div);
				w1 = $('div', div).innerWidth();
				div.css('overflow-y', 'auto');
				w2 = $('div', div).innerWidth();
				$(div).remove();
				scrollbarWidth = w1 - w2;
			}
			return scrollbarWidth;
		},

		caseInsensitiveSort: function (a, b) {
			if (a.toUpperCase() < b.toUpperCase()) {
				return -1;
			} else if (a.toUpperCase() > b.toUpperCase()) {
				return 1;
			} else {
				return 0;
			}
		},

		// Initialize a jquery-ui button whose border & background only show on hover.
		shyButton: function (el) {
			el.button();
			el.addClass('shy')
				.hover(function () {
					el.removeClass('shy');
				}, function () {
					el.addClass('shy');
				});
		},

		// a hack for those safari-only bugs...
		safari: function () {
			if (navigator.userAgent.indexOf('Safari') !== -1
					&& navigator.userAgent.indexOf('Chrome') === -1) {
				return true;
			} else {
				return false;
			}
		},

		// Make a name unique among a list of names by appending "_X" if needed,
		// where X is the first available number from 1 to 10,000
		makeUnique: function (name, list) {
			var i,
				newName = name;
			for (i = 1; i < 10000; i += 1) {
				if (list.indexOf(newName) === -1) {
					break;
				}
				newName = name + '_' + i;
			}
			return newName;
		},

		cleanDecimalNumberKeyPress: (function () {
			var BS = 8,
				RIGHT = 39,
				LEFT = 37,
				RETURN = 13, // TODO test with named text and replace that handler with this
				allowed = "0123456789.";
			return function (ev) {
				if (ev.keyCode === BS || ev.keyCode === RIGHT || ev.keyCode === LEFT || ev.keyCode === RETURN) {
					return true;
				}
				if (allowed.indexOf(String.fromCharCode(ev.charCode)) >= 0) {
					return true;
				}
				return false;
			};
		}()),

		cleanNameKeyPress: (function () {
			var BS = 8,
				RIGHT = 39,
				LEFT = 37,
				RETURN = 13, // TODO test with named text and replace that handler with this
				allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 _";
			return function (ev) {
				if (ev.keyCode === BS || ev.keyCode === RIGHT || ev.keyCode === LEFT || ev.keyCode === RETURN) {
					return true;
				}
				if (allowed.indexOf(String.fromCharCode(ev.charCode)) >= 0) {
					return true;
				}
				return false;
			};
		}()),

		cleanTextKeyDown: (function () {
			// keypress not working under firefox
			var DOUBLEQUOTE = 222;
			return function (ev) {
				if (ev.keyCode === DOUBLEQUOTE) {
					return false;
				}
				return true;
			};
		}())

	};
});
