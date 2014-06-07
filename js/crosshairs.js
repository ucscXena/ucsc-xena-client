/*jslint nomen:true, browser: true */
/*global define: false */

define(['lib/d3', 'jquery', 'lib/underscore'
	// non-object dependencies
	], function (d3, $, _) {
	'use strict';

	function mousing(e) {
		var plot = $(e.target),
			column = plot.parents('.columnUi'),
			crosshairH = plot.parents('.spreadsheet').find('.crosshairH'),
			crosshairV = column.find('.crosshairV'),
			scrollTop = $('body').scrollTop(),
			headerPlot = column.find('.headerPlot'),
			samplePlot = column.find('.samplePlot'),
			vHeight = samplePlot.height(),
			vTop = samplePlot.offset().top;
		if (!plot.hasClass('plot')) {
			plot = plot.parents('.plot');
		}
		if (e.type === 'mousemove') {
			if (headerPlot.children().length > 0) {
				vHeight += headerPlot.height();
				vTop = headerPlot.offset().top;
			}
			crosshairH.css('top', e.pageY - scrollTop);
			crosshairV.css({
				'left': e.pageX,
				'top': vTop - scrollTop,
				'height': vHeight
			});
		} else if (e.type === 'mouseenter') {
			crosshairV.show();
			crosshairH.show();
			/* TODO when we have a cursor, we could skip the horizontal crosshair on headerPlots
			if (!plot.hasClass('plot')) {
				plot = plot.parents('.plot');
			}
			if (plot.hasClass('samplePlot')) {
				crosshairH.show();
			}
			*/
		} else {
			crosshairV.hide();
			crosshairH.hide();
		}
	}

	return {
		create: function ($anchor) {
			if (!$anchor.hasClass('crosshairPlot')) { // so we only add it once
				$anchor
					.addClass('crosshairPlot')
					.append($("<div class='crosshairV crosshair'></div>"))
					.on('mousemove mouseenter mouseleave', mousing);
			}
		}
	};
});
