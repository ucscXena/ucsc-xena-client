/*eslint-env browser */
/*eslint strict: [2, "function"] */
/*global define: false, navigator: false */
define([ "jquery" ], function ($) {
	'use strict';

	var scrollbarWidth,
		cleanNameAllowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 _";

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
			var uca = a.toUpperCase(),
				ucb = b.toUpperCase();
			if (uca < ucb) {
				return -1;
			} else if (uca > ucb) {
				return 1;
			} else {
				return 0;
			}
		},

		// XXX delete this.
		caseInsensitiveSortByLabel: function (a, b) {
			if (a.label.toUpperCase() < b.label.toUpperCase()) {
				return -1;
			} else if (a.label.toUpperCase() > b.label.toUpperCase()) {
				return 1;
			} else {
				return 0;
			}
		},

		// Initialize a jquery-ui button whose border & background only show on hover.
		shyButton: function (el, options) {
			el.button(options);
			el.addClass('shy')
				.hover(function () {
					el.removeClass('shy');
				}, function () {
					el.addClass('shy');
				});
		},

		// a hack for those safari-only bugs...
		safari: function () {
			if (navigator.userAgent.indexOf('Safari') !== -1 &&
					navigator.userAgent.indexOf('Chrome') === -1) {
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


		getParameterByName: function (name) {
			// TODO duplicates galaxy.js, so extract into common file
			// see http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values/901144#901144
			var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
			return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
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
				allowed = cleanNameAllowed;
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

		/* untested
		cleanName: function (name) {
			var allowed = cleanNameAllowed,
				array = name.toArray(),
				cleanArray = array.map(function (c) {
					return (allowed.indexOf(c) < 0) ? '_' : c;
				});
			return cleanArray.join('');
		},
		*/

		cleanTextKeyDown: (function () {
			// keypress not working under firefox
			var DOUBLEQUOTE = 222;
			return function (ev) {
				if (ev.keyCode === DOUBLEQUOTE) {
					return false;
				}
				return true;
			};
		}()),

		eventOffset: function (ev) {
			// event mouse offset not working under firefox
			var offset = {},
				targetOffset = $(ev.target).offset();
			offset.x = ev.pageX - targetOffset.left;
			offset.y = ev.pageY - targetOffset.top;
			return offset;
		},

		// utility fxn to add commas to a number str
		// found at: http://www.mredkj.com/javascript/numberFormat.html
		addCommas: function (nStr) {
			nStr += '';
			var x = nStr.split('.'),
				x1 = x[0],
				x2 = x.length > 1 ? '.' + x[1] : '',
				rgx = /(\d+)(\d{3})/;
			while (rgx.test(x1)) {
				x1 = x1.replace(rgx, '$1' + ',' + '$2');
			}
			return x1 + x2;
		},

		setSelect2height: function () {
			var results = $('#select2-drop .select2-results');
			results.css('max-height', $(window).height() - results.offset().top - 10);
		}
	};
});
