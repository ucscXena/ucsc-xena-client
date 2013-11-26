/*jslint browser: true, nomen: true */
/*global define: false  */

define(["haml!haml/tooltipTemplate", "jquery", "error", "tutor", "lib/underscore"
	], function (template, $, error, tutor, _) {
	'use strict';

	// utility fxn to add commas to a number str
	// found at: http://www.mredkj.com/javascript/numberFormat.html
	function addCommas(nStr) {
		nStr += '';
		var x = nStr.split('.'),
			x1 = x[0],
			x2 = x.length > 1 ? '.' + x[1] : '',
			rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	}

	var toolTipTimeout,
		lastRequest,
		$tooltip = $('#tooltip'),
		width = 0.6 * "Sample: 99999999-9999-9999-9999-999999999999".length, // tcga standard
		chromPos = {
			html: function (id, p) {
				var num = 'N/A', pos = '', value;
				if (p) {
					num = p.chrom.slice(3);
					pos = addCommas(p.start + 1) + " - " +
						addCommas(p.end);
					if (id) {
						value = '...';
					}
				}
				return template({
					id: id,
					chrom: num,
					pos: pos,
					value: value,
					gene: undefined,
					probe: undefined,
					feature: undefined
				});
			},
			dataVars: function (p) {
				return {
					hgh2_chromStart : p.chrom + ":" + p.start,
					hgh2_chromEnd : p.chrom + ":" + p.end
				};
			}
		},
		genesetPos = {
			html: function (id, p) {
				var gene = 'N/A', probe = '', value;
				if (p) {
					gene = p.geneName;
					probe = p.probeName;
					if (id) {
						value = '...';
					}
				}
				return template({
					id: id,
					gene: gene,
					probe: probe,
					value: value,
					chrom: undefined,
					pos: undefined,
					feature: undefined
				});
			},
			dataVars: function (p) {
				return { hgh2_probe : p.probeName };
			}
		},
		modeOpt = { genesets: genesetPos, chrom: chromPos },

		tooltipQuery_callback = function (data) {
			if (this && this.requestTime !== lastRequest) {
				return false;
			}

			if (data.err) {
				return error.hgh(data.err);
			}

			$("#tooltipValue").html(data.value);
		},
		position = function (el, my, at) {
			$tooltip.position({my: my, at: at, of: el, offset: '0 0', collision: 'none none'});
		},

		genomic = function (ev, pos, dsID, sampleID, longest, el, my, at, mode, normalize, server) {
			clearTimeout(toolTipTimeout);
			if (ev.type === 'mouseleave') {
				$tooltip.stop().fadeOut('fast');
				return;
			}
			if (tutor.deactivateTooltip(dsID)) {
				return;
			}

			if ($tooltip.css('opacity') !== 1) {
				$tooltip.css({'opacity': 1, 'width': width + 'em'}).stop().fadeIn('fast');
			}
			position(el, my, at);

			$tooltip.html(modeOpt[mode].html(sampleID, pos));

			if (sampleID && pos) {
				toolTipTimeout = setTimeout(function () {
					lastRequest = (new Date()).getTime();

					$.ajax({
						type: "POST",
						url: "../../" + server + "/cgi-bin/hgHeatmap2",
						data: _(modeOpt[mode].dataVars(pos)).extend({
							hgh2_mode: "tooltipQuery",
							hgh2_mapSettings: JSON.stringify({
								name: dsID,
								colNormalize: normalize
							}),
							hgh2_sample: sampleID
						}),
						success: tooltipQuery_callback,
						requestTime: lastRequest
					});
				}, 500);
			}
		},

		clinical = function (ev, pos, ms, sampleID, longest, el, my, at, server) {
			var value,
				feature;
			clearTimeout(toolTipTimeout);
			if (ev.type === 'mouseleave') {
				$tooltip.stop().fadeOut('fast');
				return;
			}
			if (tutor.deactivateTooltip() || !pos.label) {
				return;
			}
			if (sampleID !== undefined) {
				value = '...';
			}
			$tooltip.html(template({
				id: sampleID,
				feature: pos.label,
				value: value,
				chrom: undefined,
				pos: undefined,
				gene: undefined,
				probe: undefined
			}));

			if ($tooltip.css('opacity') !== 1) {
				$tooltip.css({'opacity': 1, 'width': width + 'em'}).stop().fadeIn('fast');
			}
			position(el, my, at);

			// tooltip info query
			if (sampleID) {
				feature = ms.features().get(pos.name);
				$.when(feature.data()).then(function (data) {
					var i = _.indexOf(data.samples, sampleID),
						val = data.clinical[pos.name].values[i];
					// We get undefined if there's no record from the server, and null if there's a record with null.
					if (val !== null && typeof val !== 'undefined' && feature.get('filtertype') === 'coded') {
						val = data.clinical[pos.name].codes[val];
					}
					tooltipQuery_callback.call(null, {value: (val !== null && typeof val !== 'undefined') ? val : "N/A"});
				});
			}
		};

	return {
		'clinical': clinical,
		'genomic': genomic,

		activate: function (activate) {
			if (activate) {
				$('.pdfScreen').remove();
			} else {
				$('#brMapBody').prepend($('<div>').addClass("pdfScreen").on('mouseenter mouseleave', function (e) { return false; }));
			}
		}
	};
});
