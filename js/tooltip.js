/*jslint browser: true, nomen: true */
/*global define: false  */

define(['haml/tooltip.haml', 'haml/tooltipClose.haml','crosshairs', "jquery", "defer", 'underscore'
	], function (template, closeTemplate, crosshairs, $, defer, _) {
	'use strict';

	var freezeText = '(alt-click to freeze)',
		$tooltip,
		frozen,
		hiding = true,

		create = function () {
			$('body').append($("<div id='tooltip'></div>"));
			$tooltip = $('#tooltip');
			$tooltip.on('click', '#tooltipClose', function () {
				freeze(false, true);
				crosshairs.hide();
			});
		},

		destroy = function () {
			$tooltip = $('#tooltip');
			$tooltip.remove();
		},

		position = function (el, my, at) {
			$tooltip = $('#tooltip');
			$tooltip.position({my: "right top", at: "right-10 top", of: window, collision: 'none none'});
		},

		hide = function () {
			$tooltip = $('#tooltip');
			$tooltip.stop().fadeOut('fast');
			hiding = true;
		},

		show = function () {
			$tooltip = $('#tooltip');
			if ($tooltip.css('opacity') !== 1) {
				$tooltip.css({'opacity': 1}).stop().fadeIn('fast');
			}
			hiding = false;
		},

		freeze = function (freeze, hideTip) {
			$tooltip = $('#tooltip');
			frozen = freeze;
			if (frozen) {
				$tooltip.find('tr:first').append($(closeTemplate()));
				$tooltip.addClass('frozen');
				$('#tooltipPrompt').remove();
			} else {
				$tooltip.find('tr:first').empty();
				if (hideTip) { hide(); }
				$tooltip.removeClass('frozen');
				$('#tooltipPrompt').text(freezeText);
			}
		},

		mousing = function (t) {
			$tooltip = $('#tooltip');
			if (frozen) {
				show();
				return;
			} else if (t.ev.type === 'mouseleave') {
				hide();
				return;
			}
			show();
			position();
			$tooltip.html(template({
				sampleID: t.sampleID || null,
				rows: t.rows,
			}));
			$('#tooltipPrompt').text(freezeText);
		};

	return {
		create: function (){
			create();
		},

		destroy: function(){
			destroy();
		},

		'mousing': mousing,

		hide: function () {
			if (!frozen) {
				hide();
			}
		},

		frozen: function () {
			return frozen;
		},

		toggleFreeze: function (ev) {
			ev.stopPropagation();
			if (!hiding) {
				freeze(!frozen);
				if (!frozen) {
					hide();
				}
			}
		}
	};
});
