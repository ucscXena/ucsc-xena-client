/*jslint nomen:true, browser: true */
/*global define: false */

define(['crosshairs', 'tooltip', 'util', 'vgcanvas', 'd3', 'jquery', 'underscore_ext','annotationColor','metadataStub'
	// non-object dependencies
	], function (crosshairs, tooltip, util, vgcanvas, d3, $, _, annotationColor, metadataStub) {
	'use strict';

	var unknownEffect = 0,
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
			af: {r: 255, g: 0, b: 0, a: 0},
			grey: {r: 128, g:128, b:128, a:1}
		},
		clone = _.clone,
		each = _.each,
		reduce = _.reduce,
		sortBy = _.sortBy,
		widgets = {},
		aWidget = {

			destroy: function () {
				this.sub.dispose();
				delete widgets[this.id];
			},

			drawCenter: function (d) {
				var r = this.point;
				this.vg.box (d.xStart -r,
					d.y - d.pixPerRow/4, //-r,
					d.xEnd- d.xStart+r*2,
					d.pixPerRow/2, //r*2,
					'black');
			},

			drawHalo: function (d) {
				this.vg.box(d.xStart-d.r,
					d.y- d.pixPerRow/2, //d.y - d.r,
					d.xEnd - d.xStart + d.r*2,
					d.pixPerRow, //d.r*2,
					d.rgba );
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
					self.drawCenter(d);
				});
			},

			closestNode: function (x, y) {
				var cutoff = this.radius,
					min = Number.POSITIVE_INFINITY,
					distance;

				return reduce(this.nodes, function (closest, n) {
					if ( (Math.abs(y-n.y) < cutoff) && (x > n.xStart -cutoff) && (x<n.xEnd +cutoff)) {
						distance = Math.pow( (y-n.y), 2) + Math.pow( (x - (n.xStart+n.xEnd)/2.0), 2);
						if (distance < min) {
							min = distance;
							return n;
						} else {
							return closest;
						}
					}
					else {
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
				var pos,posText, posURL,
					ga4ghVarURL,
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
					pos = node.data.chr + ':' +
						util.addCommas(node.data.start) + '-' +
						util.addCommas(node.data.end);
					dnaAf = this.formatAf(node.data.dna_vaf);
					rnaAf = this.formatAf(node.data.rna_vaf);
					posURL = "http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position="+encodeURIComponent(pos); // hg19 is hard coded, we do not check
					posText = 'hg19 ' + pos;  // hg19 is hard coded, we do not check

					// ga4gh BRCA1 and BRCA2 hard-coded section here
					if (this.gene.name ==="BRCA1" || this.gene.name === "BRCA2"){
						ga4ghVarURL = "../datapages/?ga4gh=1&referenceName="+
							node.data.chr.substring(3, node.data.chr.length)+
							"&start="+node.data.start+"&end="+ node.data.end +
							"&ref="+node.data.reference +
							"&alt="+node.data.alt;
					}
					rows = [
						[ { val: node.data.effect +", " +
							this.gene.name +  (node.data.amino_acid? ' (' + node.data.amino_acid + ')':'')}],
						[ { val: posText, url: posURL},
							{ val: node.data.reference + ' to ' + node.data.alt}]
					];
					if (dnaAf !== "NA"){
						rows.push([{ label: 'DNA variant allele freq',  val: dnaAf}]);
					}
					if (rnaAf !== "NA"){
						rows.push([{ label: 'RNA variant allele freq', val: rnaAf}]);
					}
					if (ga4ghVarURL){
						rows.push([{ val: 'GA4GH Annotations', url: ga4ghVarURL}]);
					}
					tip.sampleID = node.data.sample;
					tip.rows = rows;
				} else {
					sampleIndex = Math.floor((coords.y * ws.zoomCount / ws.height) + ws.zoomIndex);
					tip.sampleID = ev.data.plotData.samples[sampleIndex];
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
				} else if (this.annValues[this.feature]){ //the feature is ga4gh annotation data, i.e. not part of the xena data
					var widget = this.feature.split("__")[0],
						feature = this.feature.split("__").pop(),
						id = [val.chr, val.start, val.end, val.reference, val.alt].join("__"),
						value= this.annValues[this.feature][id];
					if (value && annotationColor.colorSettings[widget][feature].filter.indexOf(value)!==-1){
						var color = annotationColor.colorSettings[widget][feature].color;
						return color(value);
					} else {
						return 'grey';
					}
				} else if (_.isUndefined(val[this.feature])) { // NA value _VAF
					return 'grey';
				} else if (this.feature ==="dna_vaf" || this.feature ==="rna_vaf") {  // _VAF, but not NA
					c = clone(colors.af);
					c.a = val[this.feature];
				} else {
					return 'grey';
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
			},

			receiveAnnData: function (annData){
				var annValues={};
				Object.keys(annData).map(function (key){
					var field = key.split("__").pop(),
						feature = key.split("__").slice(1).join("__"),
						[,widget, dataset, keyValue]= key.split("__"),
						order = annotationColor.colorSettings[widget][keyValue].order;

					annValues[feature]={};
					if (annData[key].length){
						annData[key].map(function (val){
							if (val.info[field] && val.info[field].length>0){
								var values = val.info[field][0].split(/[,]/);
								val.alternateBases.map(function (alt,i){
									var chrom = val.referenceName.substring(0,3)==="chr"? val.referenceName: "chr"+ val.referenceName,
										id = [chrom, val.start+1, val.end, val.referenceBases, alt].join("__"),
										value;
									if (val.alternateBases.length === values.length){
										value = _.max(values[i].split(/[|-]/), f=> order[f]);
									} else {
										value = _.max(_.flatten(values.map(v=> v.split(/[|-]/))), f => order[f]);
									}
									annValues[feature][id]= value;
								});
							}
						});
					}
				});
				this.annValues = annValues;
			},

			findNonNaRows: function () {
				var self = this,
					nonNaRows = _.map(_.filter(self.values, function (r) {
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
						var {start, end} = self.refGene.mapChromPosToX(val);

						if (start >= 0 && end >= 0) {
							start = start + self.sparsePad;
							end = end + self.sparsePad;
							nodes.push({
								xStart: start,
								xEnd: end,
								y: y,
								r: self.radius,
								pixPerRow: Math.max(self.pixPerRow,2),
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
					labels,
					groups,
					align,
					topBorderIndex;
				if (this.feature === 'impact') {
					myColors = _.map(colors[this.color], function (c) {
						return 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
					});
					groups = _.groupBy(_.pairs(impact), ([key, imp]) => imp);
					labels = _.map(_.range(_.keys(groups).length), i => _.pluck(groups[i], 0).join(', '));

					align = 'left';
				} else if (this.feature ==="dna_vaf" || this.feature ==="rna_vaf") { // feature is one of allele frequencies
					c= colors.af;
					rgba = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',';
					myColors = [
						rgba + '0)',
						rgba + '0.5)',
						rgba + '1)'
					];
					labels = ['0%', '50%', '100%'];
					align = 'center';
					topBorderIndex = 3;
				} else {
					var [widget, dataset, feature] = this.feature.split("__"),
						md = _.find(metadataStub.variantSets, ds => ds.id === dataset).metadata,
						info = _.find(md, ds => ds.key === ('INFO.'+feature)).info,
						colorFn = annotationColor.colorSettings[widget][feature].color;

					labels = annotationColor.colorSettings[widget][feature].filter.map(value => info[value]);
					myColors = annotationColor.colorSettings[widget][feature].filter.map(value=>colorFn(value));
				}
				myColors.unshift('rgb(255,255,255)');
				labels.unshift('no mutation');
				this.columnUi.drawLegend(myColors, labels, align, '', 'mutationVector', topBorderIndex);
			},

			render: function () {
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
				this.receiveAnnData(options.annData);
				this.render();
			}
		};


	function create(id, options) {
		var w = Object.create(aWidget);
		w.id = id;
		w.initialize(options);
		return w;
	}

	function evalMut(refGene, mut) {
		var geneInfo = refGene[mut.gene];
		return {
			impact: getImpact(mut.effect),
			right: (geneInfo.strand === '+') ?
		            mut.start - geneInfo.txStart :
		            geneInfo.txStart - mut.start
		};
	}

	function cmpMut(mut1, mut2) {
		if (mut1.impact !== mut2.impact) {
			return mut2.impact - mut1.impact; // high impact sorts first
		}

		return mut1.right - mut2.right;       // low coord sorts first
	}

	return {
		mupitClick: function (id) {
			if (widgets[id]) {
				widgets[id].mupitClick();
			}
		},

		rowOrder: function (row1, row2, refGene) {
			var row1a, row2a;
			if (!row1.length && !row2.length) {
				return 0;
			}
			if (!row1.length) {                   // has mutations sorts first
				return 1;
			}
			if (!row2.length) {
				return -1;                        // has mutations sorts first
			}
			row1a = _.map(row1, _.partial(evalMut, refGene));
			row2a = _.map(row2, _.partial(evalMut, refGene));

			return cmpMut(_.maxWith(row1a, cmpMut), _.maxWith(row2a, cmpMut));
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
