/*jslint browser: true, nomen: true */
/*global define: false  */

define(["haml!haml/tooltip", "haml!haml/tooltipClose", "jquery", "defer", "error", /*"tutor",*/ "lib/underscore"
	], function (template, closeTemplate, $, defer, error, /*tutor,*/ _) {
	'use strict';

	var freezeText = '(alt-click to freeze)',
		thawText = '(alt-click on map to unfreeze)',
		$tooltip = $('#tooltip'),
		$prompt,
		frozen,
		first = true,
		hiding = true,

		position = function (el, my, at) {
			$tooltip.position({my: my, at: at, of: el, collision: 'none none'});
		},

		hide = function () {
			$tooltip.stop().fadeOut('fast');
			hiding = true;
		},

		show = function () {
			if ($tooltip.css('opacity') !== 1) {
				$tooltip.css({'opacity': 1}).stop().fadeIn('fast');
			}
			hiding = false;
		},

		freeze = function (freeze, hideTip) {
			frozen = freeze;
			if (frozen) {
				$tooltip.find('tr:first').append($(closeTemplate()));
				$tooltip.addClass('frozen');
				$('#tooltipPrompt').text(thawText);
			} else {
				$tooltip.find('tr:first').empty();
				if (hideTip) { hide(); }
				$tooltip.removeClass('frozen');
				$('#tooltipPrompt').text(freezeText);
			}
		},

		mousing = function (t) {
			if (frozen) {
				show();
				return;
			} else if (t.ev.type === 'mouseleave') {
				hide();
				return;
			}
			show();
			position(t.el, t.my, t.at);
			$tooltip.html(template({
				sampleID: t.sampleID || null,
				rows: t.rows,
			}));
			if (t.labelWidth) {
				$tooltip.find('.labelCol').width(t.labelWidth);
			}
			if (t.valWidth) {
				$tooltip.find('.valueCol').width(t.valWidth);
			}
			$('#tooltipPrompt').text(freezeText);
		};

	$tooltip.on('click', '#tooltipClose', function () {
		freeze(false, true);
	});

	return {
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
