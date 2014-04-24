/*jslint nomen:true, browser: true */
/*global define: false */

define(['lib/d3', 'jquery', 'lib/underscore'
	// non-object dependencies
	], function (d3, $, _) {
	'use strict';

	function mousing(e) {
		var column = $(e.target).parents('.column'),
			spreadsheet = $(e.target).parents('.spreadsheet'),
			crosshairH = spreadsheet.find('.crosshairH'),
			crosshairV = column.find('.crosshairV');
		if (e.type === 'mousemove') {
			crosshairH.css('top', e.pageY);
			_.each(column.find('.crosshairPlot'), function (p, i) {
				$(p).find('.crosshairV').css('left', e.pageX);
			});
		} else if (e.type === 'mouseenter') {
			crosshairV.show();
			crosshairH.show();
		} else {
			crosshairV.hide();
			crosshairH.hide();
		}
	}

	return {
		create: function ($anchor) {
			$anchor
				.addClass('crosshairPlot')
				.append($("<div class='crosshairV crosshair'></div>"))
				.on('mousemove mouseenter mouseleave', mousing);
		}
	};
});
