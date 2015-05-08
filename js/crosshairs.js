/*eslint strict: [2, "function"] */
/*global define: false */

define(['d3', 'jquery', 'underscore'
	// non-object dependencies
	], function (d3, $, _) {
	'use strict';

	var widgets = [],
		aWidget;

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
			/* TODO when we have a decent cursor, we could skip the horizontal crosshair on headerPlots
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

	aWidget = {

		destroy: function () {
			this.sub.dispose();
			delete widgets[this.id];
		},

		initialize: function (options) {
			_.bindAll.apply(_, [this].concat(_.functions(this)));
			//_(this).bindAll();
			options.$anchor
				.addClass('crosshairPlot')
				.append($("<div class='crosshairV crosshair'></div>"));
			this.mousingStream = options.$anchor.onAsObservable('mousemove mouseenter mouseleave');
			this.mousemoveStream = options.$anchor.onAsObservable('mousemove');
			this.sub = this.mousingStream.subscribe(mousing);
		}
	};

	function create(id, options) {
		var w = Object.create(aWidget);
		w.id = id;
		w.initialize(options);
		return w;
	}

	return {
		create: function (id, options) {
			if (!widgets[id]) {
				widgets[id] = create(id, options);
			}
			return widgets[id];
		}
	};
});
