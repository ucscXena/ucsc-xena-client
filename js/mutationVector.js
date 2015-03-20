/*jslint nomen:true, browser: true */
/*global define: false */

define(['crosshairs', 'tooltip', 'util', 'vgcanvas', 'd3', 'jquery', 'underscore'
	// non-object dependencies
	], function (crosshairs, tooltip, util, vgcanvas, d3, $, _) {
	'use strict';

	var impactMax = 4,
		unknownEffect = 0,
		highlightRgba = 'rgba(0, 0, 0, 1)',
		impact = {
			Nonsense_Mutation: 3,
			frameshift_variant: 3,
			stop_gained: 3,
			splice_acceptor_variant: 3,
			splice_donor_variant: 3,
			Splice_Site: 3,
			splice_region_variant: 3,
			Frame_Shift_Del: 3,
			Frame_Shift_Ins: 3,

			missense: 2,
			non_coding_exon_variant: 2,
			missense_variant: 2,
			Missense_Mutation: 2,
			exon_variant: 2,
			RNA: 2,
			Indel: 2,//
			start_lost: 2,
			start_gained: 2,
			De_novo_Start_OutOfFrame: 2,
			Translation_Start_Site: 2,
			De_novo_Start_InFrame: 2,
			stop_lost: 2,
			Nonstop_Mutation: 2,
			initiator_codon_variant: 2,
			"5_prime_UTR_premature_start_codon_gain_variant": 2,
			disruptive_inframe_deletion: 2,
			inframe_deletion: 2,
			inframe_insertion: 2,
			In_Frame_Del: 2,
			In_Frame_Ins: 2,

			synonymous_variant: 1,
			"5_prime_UTR_variant": 1,
			"3_prime_UTR_variant": 1,
			"5'Flank": 1,
			"3'Flank": 1,
			"3'UTR": 1,
			"5'UTR": 1,
			Silent: 1,
			stop_retained_variant: 1,
			upstream_gene_variant: 1,
			downstream_gene_variant: 1,
			intron_variant: 1,
			Intron: 1,
			intergenic_region: 1,
			IGR: 1,

			"others or unannotated":0
		},
		getImpact = function (eff) { return impact[eff] || unknownEffect; },
		colors = {
			category_25: [
				{r: 255, g: 127, b: 14, a: 1},  // orange #ff7f0e
				{r: 44, g: 160, b: 44, a: 1},  // green #2ca02c
				{r: 31, g: 119, b: 180, a: 1}, // blue #1f77b4
				{r: 214, g: 39, b: 40, a: 1}  // red #d62728
			],
			af: [
				{r: 228, g: 26, b: 28, a: 0},
				{r: 228, g: 26, b: 28, a: 0.5},
				{r: 228, g: 26, b: 28, a: 1}
			]
		},
		refGeneInfo = {},
		clone = _.clone,
		each = _.each,
		filter = _.filter,
		find = _.find,
		map = _.map,
		reduce = _.reduce,
		sortBy = _.sortBy,
		toNumber = _.toNumber,
		uniqueId = _.uniqueId,
		widgets = {},
		aWidget = {

			destroy: function () {
				this.sub.dispose();
				delete widgets[this.id];
			},

			drawCenter: function (d, highlight) {
				var r = highlight ? this.point * 2 : this.point;
				this.vg.circle(d.x, d.y, r, 'black');
			},

			drawHalo: function (d) {
				this.vg.circle(d.x, d.y, d.r, d.rgba);
			},

			draw: function () {
				var self = this,
					buffWidth = this.canvasWidth - (this.sparsePad * 2),
					buff = vgcanvas(buffWidth, 1);
				this.vg.smoothing(false);
				this.vg.clear(0, 0, this.canvasWidth, this.canvasHeight);

				// draw each of the rows either grey for NA or white for sample examined for mutations
				// more crisp lines if both white and grey are drawn, rather than a background of one
				each(this.values, function (r, i) {
					var color = (r.vals) ? 'white' : 'grey';
					buff.box(0, 0, buffWidth, 1, color);
					self.vg.drawImage(
						buff.element(),
						self.sparsePad,
						(i * self.pixPerRow) + self.sparsePad,
						buffWidth,
						self.pixPerRow
					);
				});

				// draw the mutations
				each(this.nodes, function (d) {
					self.drawHalo(d);
				});
				each(this.nodes, function (d) { // draw black dots on top
					self.drawCenter(d);
				});
			},

			highlight: function (d) {
				this.highlightOn = true;
				this.draw(); // remove any previous highlights
				this.vg.circle(d.x, d.y, d.r, highlightRgba, true);
				this.drawHalo(d); // to bring this node's color to the top
				this.drawCenter(d, true);
			},

			closestNode: function (x, y) {
				var min = this.radius;
				return reduce(this.nodes, function (closest, n) {
					var distance = Math.sqrt(Math.pow((x - n.x), 2) + Math.pow((y - n.y), 2));
					if (distance < min) {
						min = distance;
						return n;
					} else {
						return closest;
					}
				}, undefined);
			},

			formatAf: function (af) {
				if (af === 'NA' || af === '' || af === undefined) {
					return 'NA';
				} else {
					return Math.round(af * 100) + '%';
				}
			},

			plotCoords: function (ev) {
				var offset,
					x = ev.offsetX,
					y = ev.offsetY;
				if (x === undefined) { // fix up for firefox
					offset = util.eventOffset(ev);
					x = offset.x;
					y = offset.y;
				}
				return { x: x, y: y };
			},

			mousing: function (ev) {
				var pos,
					node,
					coords,
					rows = [],
					mode = 'genesets',
					dnaAf,
					rnaAf,
					sampleIndex,
					ws = ev.data.plotData.ws,
					tip = {
						ev: ev,
						el: '#nav',
						my: 'top',
						at: 'top',
						mode: mode,
						valWidth: '22em'
					};
				if (tooltip.frozen()) {
					return;
				}
				coords = this.plotCoords(ev);
				node = this.closestNode(coords.x, coords.y);
				if (node) {
					// TODO this is slow mousing when a node is involved
					this.highlight(node);
					pos = node.data.chr + ':' +
						util.addCommas(node.data.start) + '-' +
						util.addCommas(node.data.end);
					dnaAf = this.formatAf(node.data.dna_vaf);
					rnaAf = this.formatAf(node.data.rna_vaf);
					rows = [
						{ val: node.data.effect},
						{ val: 'hg19 ' + pos + ' ' + node.data.reference + '>' + node.data.alt },
						{ val: this.gene.name + ' (' + node.data.amino_acid + ')' },
						{ val: 'DNA / RNA variant allele freq: ' + dnaAf + ' / ' + rnaAf }
					];
					tip.sampleID = node.data.sample;
					tip.rows = rows;
				} else {
					sampleIndex = Math.floor((coords.y * ws.zoomCount / ws.height) + ws.zoomIndex);
					tip.sampleID = ev.data.plotData.samples[sampleIndex];
					if (this.highlightOn) {
						this.draw();
						this.highlightOn = false;
					}
				}
				tooltip.mousing(tip);
			},

			mupitClick: function () {
				var positions = _.unique(_.map(this.nodes, function (n, i) {
						return n.data.chr + ':' + (n.data.start).toString();
					})).join(','),
					url ="http://mupit.icm.jhu.edu/?gm="+positions;

				window.open(url);
			},

			findRgba: function (val) {
				var imp,
					c;
				if (this.feature === 'impact') {
					imp = getImpact(val.effect);
					c = colors[this.color][imp];
				} else if (_.isUndefined(val[this.feature])) { // _VAF with NA value
					c = colors.af[0];
				} else {  // _VAF, but not NA
					c = clone(colors.af[1]);
					c.a = val[this.feature];
				}
				return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + c.a.toString() + ')';
			},

			receiveData: function (data) {
				var drawValues = data.slice(this.zoomIndex, this.zoomIndex + this.zoomCount);
				this.values = _.map(drawValues, function (v, i) {
					var row = $.extend(true, [], v);
					row.index = i;
					return row;
				});
				this.render();
			},

			findNonNaRows: function () {
				var self = this,
					nonNaRows = _.map(filter(self.values, function (r) {
						return r.vals;
					}), function (r) {
						return {
							x: self.sparsePad,
							y: r.index * self.pixPerRow + self.sparsePad
						};
					});
				return nonNaRows;
			},

			findNodes: function () {
				var self = this,
					nodes = [],
					nodeValues = _.filter(this.values, function (value) {
						return value.vals && value.vals.length;
					});
				_.each(nodeValues, function (value) {
					var y = (value.index * self.pixPerRow) + (self.pixPerRow / 2) + self.sparsePad;
					_.each(value.vals, function (val) {
						var x = self.refGene.mapChromPosToX(val.start);
						if (x >= 0) {
							x = x * self.gene.scaleX + self.sparsePad;
							nodes.push({
								x: x,
								y: y,
								r: self.radius,
								impact: getImpact(val.effect),
								rgba: self.findRgba(val),
								data: val
							});
						}
					});
				});

				// sort so most severe draw on top
				return sortBy(nodes, function (n) {
					return n.impact;
				});
			},

			drawLegend: function () {
				var myColors,
					c,
					rgba,
					labels=[[],[],[],[]],
					unknownEffects,
					align,
					topBorderIndex;
				if (this.feature === 'impact') {
					myColors = _.map(colors[this.color], function (c) {
						return 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
					});
					for (var key in impact){
						labels[getImpact(key)].push(key);
					}
					labels = labels.map(function(list){return list.join(", ");});
					align = 'left';
				} else { // feature is one of allele frequencies
					c = colors[this.color][2];
					rgba = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',';
					myColors = [
						rgba + '0)',
						rgba + '0.5)',
						rgba + '1)'
					];
					labels = ['0%', '50%', '100%'];
					align = 'center';
					topBorderIndex = 3;
				}
				myColors.unshift('rgb(255,255,255)');
				labels.unshift('no mutation');
				this.columnUi.drawLegend(myColors, labels, align, '', 'mutationVector', topBorderIndex);
			},

			render: function () {
				var self = this;
				this.pixPerRow = (this.height - (this.sparsePad * 2))  / this.values.length;
				this.canvasHeight = this.height; // TODO init elsewhere
				this.d2 = this.vg.context();

				this.nodes = this.findNodes();
				this.nonNaRows = this.findNonNaRows();
				this.drawLegend();
				this.draw();
			},

			initialize: function (options) {
				var self = this;

				_.bindAll.apply(_, [this].concat(_.functions(this)));
				//_(this).bindAll();
				this.vg = options.vg;
				this.columnUi = options.columnUi;
				this.refGene = options.refGene;
				this.dataset = options.dataset;
				this.gene = options.refGene.getGeneInfo();
				this.feature = options.feature;
				this.color = options.color;
				this.canvasWidth = options.width;
				this.height = options.height;
				this.zoomCount = options.zoomCount;
				this.zoomIndex = options.zoomIndex;
				this.sparsePad = options.sparsePad;
				this.radius = options.radius;
				this.point = options.point;
				this.refHeight = options.refHeight;
				this.columnUi.$sparsePad.height(0);

				// bindings
				this.sub = this.columnUi.crosshairs.mousingStream.subscribe(function (ev) {
					ev.data = { plotData: self.columnUi.plotData };
					self.mousing(ev);
				});

				this.receiveData(options.data);
			}
		};


	function create(id, options) {
		var w = Object.create(aWidget);
		w.id = id;
		w.initialize(options);
		return w;
	}

	return {
		mupitClick: function (id) {
			if (widgets[id]) {
				widgets[id].mupitClick();
			}
		},

		rowOrder: function (row, refGene) {
			var chrEnd = 10000000000,  // TODO some number larger than use max number of base pairs of longest genes
				mut,
				weight,
				refGeneInfo,
				rightness;
			if (row.length) {
				mut = _.max(row, function (mut) { return getImpact(mut.effect); });
				weight = impactMax - getImpact(mut.effect);
				refGeneInfo = refGene[mut.gene];
				rightness = (refGeneInfo.strand === '+')
					? mut.start - refGeneInfo.txStart
					: refGeneInfo.txStart - mut.start;
				return (weight * chrEnd) + rightness;
			} else {
				return (impactMax * chrEnd) + chrEnd + 1; // force mutation-less rows to the end
			}
		},

		show: function (id, options) {
			if (widgets[id]) {
				widgets[id].destroy();
			}
			widgets[id] = create(id, options);
			return widgets[id];
		}
	};
});
