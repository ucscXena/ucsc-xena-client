/*jslint nomen:true, regexp: true */
/*global define: false */

define(['jquery', 'lib/underscore', 'lib/backbone', 'unicode_utils'], function ($, _, Backbone, unicode) {
	"use strict";

	// Return a slice of genesets over the current position.
	var genesetVisibleSlice = function (genesets, pos) {
		// If no pos, return all genesets.
		// If no genesets, don't try to slice them.
		if (!pos || !genesets || genesets.length === 0) {
			return genesets;
		}

		var gsnames = _(genesets).pluck('name'),
			gss = gsnames.indexOf(pos.genesetStart),
			gse = gsnames.indexOf(pos.genesetEnd),
			gsl = genesets.slice(gss, gse + 1), // array of references to gs objects
			gl;

		gsl[0] = $.extend(true, {}, gsl[0]); // deep copy
		gl = gsl[0].genes;
		gsl[0].genes = gl.slice(gl.indexOf(pos.geneStart));

		gsl[gsl.length - 1] = $.extend(true, {}, gsl[gsl.length - 1]); // deep copy
		gl = gsl[gsl.length - 1].genes;
		gsl[gsl.length - 1].genes = gl.slice(0, gl.indexOf(pos.geneEnd) + 1);

		return gsl;
	},

		genesetParse = function (text) {
			// Handle carriage return. Strip comment lines. Allow implicit comma at newline. Strip whitespace.
			var list = unicode.normalize(text).replace(/\r/g, '\n').replace(/#[^\n]*/g, "").replace(/^\s+/, '').replace(/\s+$/, '').split(/[\s,]+/);
			return _(list).without('');
		},

		genomicPositionError = function (msg) {
			var e = new Error(msg);
			e.name = 'genomicPositionError';
			return e;
		};

/*
		},
		
		GenomicPosition = Backbone.PersistingModel.extend({
			defaults: {
				ntList: [],
				ntActive: [],
				genesetsPos: null
			},
			ajax: function () {
				if (this.get('mode') === 'chrom') {
					return {
						hgh2_type: 'chrom',
						hgh2_chromStart: _.template('<%= chromStart %>:<%= baseStart %>', this.get('chromPos')),
						hgh2_chromEnd: _.template('<%= chromEnd %>:<%= baseEnd %>', this.get('chromPos'))
					};
				} else {
					var ret = {
						hgh2_type: 'geneset',
						hgh2_userGeneset_0: "set=" + _(this.genesetsVisible).chain().pluck('genes')
							.reduce(function (a, b) { return a.concat(b); }, [])
							.value().join(',')
					};

					return ret;
				}
			},
			assembly: function (a) {
				if (a && !_(this._assembly).isEqual(a)) {
					this._assembly = a;
				}
				return this._assembly;
			},
			clipChromPosition: function () {
				var cs, ce, chromInfo,
					assembly = this.assembly(),
					chromPos = this.get('chromPos'),
					newPos,
					set = GenomicPosition.__super__.set;

				if (!chromPos) { // Set default position
					if (!assembly) {
						return;
					}
					chromInfo = assembly.chromInfo;
					cs = 0;
					ce = chromInfo.length - 1;
					set.call(this, 'chromPos', {
						chromStart : chromInfo[cs].name,
						baseStart: 0,
						chromEnd: chromInfo[ce].name,
						baseEnd: chromInfo[ce].size
					}, { silent: true });
					return;
				}

				if (assembly) {
					chromInfo = assembly.chromInfo;
					newPos = _(chromPos).clone();

					// clip coords
					cs = _.pluck(chromInfo, 'name').indexOf(chromPos.chromStart);
					if (cs === -1) { // XXX unit test test
						throw genomicPositionError("Invalid start chromosome");
					}

					ce = _.pluck(chromInfo, 'name').indexOf(chromPos.chromEnd);
					if (ce === -1 || ce < cs) { // XXX unit test test
						throw genomicPositionError("Invalid end chromosome");
					}

					if (!newPos.baseStart || newPos.baseStart < 0) {
						newPos.baseStart = 0;
					}
					newPos.baseStart = Math.min(newPos.baseStart, chromInfo[cs].size - 1);

					if (!newPos.baseEnd || newPos.baseEnd > chromInfo[ce].size) {
						newPos.baseEnd = chromInfo[ce].size;
					}
					newPos.baseEnd = Math.max(newPos.baseEnd, 1);

					if (cs === ce && newPos.baseEnd <= newPos.baseStart) {
						throw genomicPositionError("Invalid end base");
					}

					if (!_(chromPos).isEqual(newPos)) {
						set.call(this, 'chromPos', newPos, { silent: true });
					}
				}
			},
			defaultGenesetsPosition: function () {
				var genesetsPos = this.get('genesetsPos'),
					genesets = this.genesetsParsed,
					set = GenomicPosition.__super__.set;

				if (genesets && genesets.length) {
					set.call(this, 'genesetsPos', {
						genesetStart: genesets[0].name,
						geneStart: genesets[0].genes[0],
						genesetEnd: _(genesets).last().name,
						geneEnd: _(_(genesets).last().genes).last()
					}, { silent: true});
				}
			},
			genesetsVisibleSet: function () {
				this.genesetsVisible = genesetVisibleSlice(this.genesetsParsed, this.get('genesetsPos'));
			},
			genesetsPosValid: function () {
				var pos = this.get('genesetsPos');
				return _(this.genesetsParsed).find(function (gs) { return gs.name === pos.genesetStart; })
					&& _(this.genesetsParsed).find(function (gs) { return gs.name === pos.genesetEnd; });
			},
			genesetsParse: function () {
				var genesets = this.get('ntList');
				this.genesetsParsed = _(this.get('ntActive')).map(function (name) {
					var gs = _(genesets).find(function (gs) { return gs.name === name; });
					return {
						name: name,
						genes: genesetParse(gs.text)
					};
				});
			},
			chromZoomed: function () {
				var chromPos = this.get('chromPos'),
					assembly = this.assembly();

				return chromPos && !(chromPos.chromStart === assembly.chromInfo[0].name &&
						chromPos.baseStart === 0 &&
						chromPos.chromEnd === _(assembly.chromInfo).last().name &&
						chromPos.baseEnd === _(assembly.chromInfo).last().size);
			},
			genesetsZoomed: function () {
				var p = this.get('genesetsPos'),
					gslist = this.genesetsParsed;

				return gslist && gslist.length && p && !(p.genesetStart === gslist[0].name &&
						p.geneStart === gslist[0].genes[0] &&
						p.genesetEnd === _(gslist).last().name &&
						p.geneEnd === _(_(gslist).last().genes).last());
			},
			zoomed: function () {
				if (this.get('mode') === 'genesets') {
					return this.genesetsZoomed();
				}
				return this.chromZoomed();
			},
			set: function (key, value, options) {
				var changed,
					zoomed = this.genesetsZoomed(),
					attrs;

				// Handle both `"key", value` and `{key: value}` -style arguments.
				if (_.isObject(key) || key === null) {
					attrs = key;
					options = value;
				} else {
					attrs = {};
					attrs[key] = value;
				}
				// XXX User might accidentally override 'silent'
				GenomicPosition.__super__.set.call(this, attrs, _({silent: true}).extend(options || {}));
				this.clipChromPosition();
				changed = _(this.changedAttributes());
				if (changed.has('ntList') || changed.has('ntActive')) {
					this.genesetsParse();
				}
				if (this.get('genesetsPos') === null
						|| !this.genesetsPosValid()
						|| (!zoomed && !changed.has('genesetsPos'))) {
					this.defaultGenesetsPosition();
				}
				if (changed.has('ntList') || changed.has('ntActive') || changed.has('genesetsPos')) {
					this.genesetsVisibleSet();
				}
				if (!options || !options.silent) {
					this.change();
				}
				return this;
			}
		});
*/

	return {
/*
		factory : function (options) {
			return new GenomicPosition(null, options);
		},
*/
		genesetParse : genesetParse
	};

});
