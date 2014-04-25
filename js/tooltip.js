/*jslint browser: true, nomen: true */
/*global define: false  */

define(["haml!haml/tooltip", "jquery", "error", "tutor", "lib/underscore"
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
		freezeText = '(shift-click to freeze)',
		thawText = '(shift-click on map to unfreeze)',
		$tooltip = $('#tooltip'),
		$close,
		$prompt,
		frozen,
		chromPos = {
			html: function (id, p) {
				var pos = '', value;
				if (p) {
					pos = p.chrom + ':' + addCommas(p.start) + '-' + addCommas(p.end);
					if (id) {
						value = '...';
					}
				}
				return template({
					id: id,
					pos: pos,
					val: value,
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
			html: function (sampleID, dsID, p, vals) {
				var gene = 'N/A', pos = 'N/A', probe, value;
				if (p) {
					gene = p.geneName;
					pos = p.chrom + ':' + addCommas(p.start) + '-' + addCommas(p.end);
					if (vals === undefined) {
						if (sampleID) {
							value = '...';
						} else {
							value = p.value;
						}
					}
				}
				return template({
					sampleID: sampleID,
					dsID: dsID,
					gene: gene,
					pos: pos, // TODO needs refining for refgene, range and remove decimals
					probe: probe,
					val: value,
					vals: vals,
					feature: undefined
				});
			},
		},

		/* classic
		genesetPos = {
			html: function (id, p) {
				var gene = 'N/A', probe = '', value;
				if (p) {
					gene = p.geneName;
					//probe = p.probeName;
					if (id) {
						value = '...';
					}
				}
				return template({
					id: id,
					gene: gene,
					probe: probe,
					val: value,
					chrom: undefined,
					pos: undefined,
					feature: undefined
				});
			},
			dataVars: function (p) {
				return { hgh2_probe : p.probeName };
			}
		},
		*/
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
			$tooltip.position({my: my, at: at, of: el, collision: 'none none'});
		},

		hide = function () {
			$tooltip.stop().fadeOut('fast');
		},

		show = function () {
			if ($tooltip.css('opacity') !== 1) {
				$tooltip.css({'opacity': 1}).stop().fadeIn('fast');
			}
		},

		freeze = function (freeze, hideTip) {
			frozen = freeze;
			if (frozen) {
				$close.show();
				$tooltip.addClass('frozen');
				$prompt.text(thawText);
			} else {
				$close.hide();
				if (hideTip) { hide(); }
				$tooltip.removeClass('frozen');
				$prompt.text(freezeText);
			}
		},

		prep = function (ev, dsID) {
			clearTimeout(toolTipTimeout);
			if (frozen) {
				show();
				return false;
			} else if (ev.type === 'mouseleave') {
				hide();
				return false;
			}
			if (tutor.deactivateTooltip(dsID)) {
				return false;
			}
			return true;
		},

		complete = function () {
			$close = $('#tooltipClose');
			$close.on('click', function () { freeze(false, true); });
			$prompt = $('#tooltipPrompt');
			$prompt.text(freezeText);
		},

		/* classic
		genomic = function (ev, pos, dsID, sampleID, longest, el, my, at, mode, normalize, server) {
			if (prep(ev, dsID) === false) { return; }
			show();
			position(el, my, at);

			$tooltip.html(modeOpt[mode].html(sampleID, pos));
			complete();

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
			if (prep(ev) === false) { return; }

			if (sampleID !== undefined) {
				value = '...';
			}
			$tooltip.html(template({
				id: sampleID,
				feature: pos.label,
				val: value,
				chrom: undefined,
				pos: undefined,
				gene: undefined,
				probe: undefined
			}));
			complete();

			show();
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
		*/
/*
		mutation = function (ev, pos, dsID, sampleID, el, my, at, mode, normalize, server) {
		//mutation = function (ev, pos, dsID, sampleID, longest, el, my, at, mode, normalize, server) {
			if (prep(ev, dsID) === false) { return; }
			show();
			position(el, my, at);

			$tooltip.html(modeOpt[mode].html(sampleID, pos));
			complete();

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
*/
		mutation = function (t) {
			if (prep(t.ev) === false) { return; }
			show();
			position(t.el, t.my, t.at);
			$tooltip.html(modeOpt[t.mode].html(t.sampleID, t.dsID, t.pos, t.vals));
			complete();
		};


	return {
		'hide': hide,
		'mutation': mutation,

		/* classic
		'clinical': clinical,
		'genomic': genomic,
		*/

		frozen: function () {
			return frozen;
		},

		toggleFreeze: function () {
			freeze(!frozen);
		}

		/* classic,

		activate: function (activate) {
			if (activate) {
				$('.pdfScreen').remove();
			} else {
				$('#brMapBody').prepend($('<div>').addClass("pdfScreen").on('mouseenter mouseleave', function (e) { return false; }));
			}
		}
		*/
	};
});
