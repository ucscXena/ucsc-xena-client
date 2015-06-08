/*jslint nomen:true, browser: true */
/*global define: false */

define(['crosshairs', 'tooltip', 'util', 'vgcanvas', 'd3', 'jquery', 'underscore_ext', 'static-interval-tree', 'annotationColor', 'metadataStub', 'layoutPlot'
	], function (crosshairs, tooltip, util, vgcanvas, d3, $, _, intervalTree, annotationColor, metadataStub, layoutPlot) {
	'use strict';

	var {pxTransformFlatmap} = layoutPlot;
	var annotationFeatures = _.object(_.flatmap(annotationColor.colorSettings, (feats, dsID) =>
		_.map(feats, ({color}, feature) => [`${dsID}__${feature}`, {
			color: color,
			get: (a, v) => _.get_in(a, [`${dsID}__${feature}`, [v.chr, v.start, v.end, v.reference, v.alt].join('__')])
		}])
	 ));

	// Group by consecutive matches, perserving order.
	function groupByConsec(sortedArray, prop, ctx) {
		var cb = _.iteratee(prop, ctx);
		var last = {}, current; // init 'last' with a sentinel, !== to everything
		return _.reduce(sortedArray, (acc, el) => {
			var key = cb(el);
			if (key !== last) {
				current = [];
				last = key;
				acc.push(current);
			}
			current.push(el);
			return acc;
		}, []);
	}

	// Group by, returning groups in sorted order. Scales O(n) vs.
	// sort's O(n log n), if the number of values is much smaller than
	// the number of elements.
	function sortByGroup(arr, keyfn) {
		var grouped = _.groupBy(arr, keyfn);
		return _.map(_.sortBy(_.keys(grouped), _.identity),
				k => grouped[k]);
	}

	function drawImpactPx(vg, width, pixPerRow, radius, color, variants) {
		var ctx = vg.context(),
			varByImp = groupByConsec(variants, v => v.group);

		_.each(varByImp, vars => {
			ctx.beginPath(); // halos
			_.each(vars, v => {
				ctx.moveTo(v.xStart - radius, v.y);
				ctx.lineTo(v.xEnd + radius, v.y);
			});
			ctx.lineWidth = pixPerRow;
			ctx.strokeStyle = color(vars[0].group);
			ctx.stroke();

			ctx.beginPath(); // centers
			_.each(vars, v => {
				ctx.moveTo(v.xStart, v.y);
				ctx.lineTo(v.xEnd, v.y);
			});
			ctx.lineWidth = pixPerRow / 2;
			ctx.strokeStyle = 'black';
			ctx.stroke();
		});
	}

	function push(arr, v) {
		arr.push(v);
		return arr;
	}

	function drawBackground(vg, width, height, sparsePad, pixPerRow, values) {
		var ctx = vg.context(),
			drawWidth = width - sparsePad * 2,
			[stripes] = _.reduce(
				groupByConsec(values, v => !!v.vals),
				([acc, sum], g) =>
					[g[0].vals ? acc : push(acc, [sum, g.length]), sum + g.length],
				[[], 0]);

		vg.smoothing(false);
		vg.box(0, 0, width, height, 'white'); // white background

		ctx.beginPath();                      // grey for missing data
		each(stripes, ([offset, len]) =>
			ctx.rect(
				sparsePad,
				(offset * pixPerRow) + sparsePad,
				drawWidth,
				pixPerRow * len
		));
		ctx.fillStyle = 'grey';
		ctx.fill();
	}

	var colorStr = c =>
		'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + c.a.toString() + ')';

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
		round = Math.round,
		saveUndef = f => v => v === undefined ? v : f(v),
		decimateFreq = saveUndef(v => round(v * 31) / 32), // reduce to 32 vals
		colors = {
			category_25: [
				{r: 255, g: 127, b: 14, a: 1},  // orange #ff7f0e
				{r: 44, g: 160, b: 44, a: 1},  // green #2ca02c
				{r: 31, g: 119, b: 180, a: 1}, // blue #1f77b4
				{r: 214, g: 39, b: 40, a: 1}  // red #d62728
			],
			af: {r: 255, g: 0, b: 0},
			grey: {r: 128, g:128, b:128, a:1}
		},
		features = _.merge(annotationFeatures, {
			impact: {
				get: (a, v) => impact[v.effect] || unknownEffect,
				color: v => colorStr(colors.category_25[v])
			},
			dna_vaf: {
				get: (a, v) => decimateFreq(v.dna_vaf),
				color: v => colorStr(_.isUndefined(v) ? colors.grey :
					_.assoc(colors.af, 'a', v))
			},
			rna_vaf: {
				get: (a, v) => decimateFreq(v.rna_vaf),
				color: v => colorStr(_.isUndefined(v) ? colors.grey :
					_.assoc(colors.af, 'a', v))
			}
		}),
		each = _.each,
		reduce = _.reduce,
		widgets = {},
		aWidget = {

			destroy: function () {
				this.sub.dispose();
				delete widgets[this.id];
			},

			draw: function (vg) {
				var {radius, pixPerRow, canvasWidth, canvasHeight,
						values, sparsePad, feature} = this,
					minppr = Math.max(pixPerRow, 2);

				drawBackground(vg, canvasWidth, canvasHeight, sparsePad, pixPerRow, values);
				drawImpactPx(vg, canvasWidth, minppr,
						radius, features[feature].color, this.nodes);
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
					if (this.gene ==="BRCA1" || this.gene === "BRCA2"){
						ga4ghVarURL = "../datapages/?ga4gh=1&referenceName="+
							node.data.chr.substring(3, node.data.chr.length)+
							"&start="+node.data.start+"&end="+ node.data.end +
							"&ref="+node.data.reference +
							"&alt="+node.data.alt +
							"&gene="+ this.gene.name;
					}
					rows = [
						[ { val: node.data.effect +", " +
							this.gene +  (node.data.amino_acid? ' (' + node.data.amino_acid + ')':'')}],
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

			receiveData: function (data) {
				// XXX It's not clear if this.values is useful. We no longer draw by iterating over
				// the variants indexed by sample. It's currently used to draw background, do tooltip,
				// and maybe more. Should deprecated it if we don't need it.
				var drawValues = data.slice(this.zoomIndex, this.zoomIndex + this.zoomCount);
				this.values = _.map(drawValues, (obj, i) => _.assoc(obj, 'index', i));
				this.render();
			},

			receiveAnnData: function (annData){
				var annValues={};
				Object.keys(annData).map(function (key){
					var [,dataset, field]= key.split("__"),
						feature = [dataset, field].join("__"),
						order = annotationColor.colorSettings[dataset][field].order;

					annValues[feature]={};
					if (annData[key].length){
						annData[key].map(function (val){
							if (val.info[field] && val.info[field].length>0){
								var values = val.info[field][0].split(/[,]/);
								val.alternateBases.map(function (alt,i){
									var chrom = val.referenceName.substring(0,3)==="chr"? val.referenceName: "chr"+ val.referenceName,
										id = [chrom, val.start, val.end, val.referenceBases, alt].join("__"),
										value;
									if (val.alternateBases.length === values.length){
										value = _.max(values[i].split(/[|-]/), f=> order[f]);
									} else {
										value = _.max(_.flatten(values.map(v=> v.split(/[|-]/))), f => order[f]);
									}
									if (annValues[feature][id]){
										annValues[feature][id] = _.max([value, annValues[feature][id]], f=>order[f]);
									} else {
										annValues[feature][id] = value;
									}
								});
							}
						});
					}
				});
				this.annValues = annValues;
			},

			findNodes: function () {
				var {layout, index, samples} = this.options,
					{pixPerRow, sparsePad, zoomIndex, zoomCount, feature, annValues} = this,
					sindex = _.object(samples.slice(zoomIndex, zoomIndex + zoomCount),
								_.range(samples.length)),
					group = features[feature].get,
					minSize = ([s, e]) => [s, e - s < 1 ? s + 1 : e],
					// sortfn is about 2x faster than sortBy, for large sets of variants
					sortfn = (coll, keyfn) => _.flatten(sortByGroup(coll, keyfn), true);
				return sortfn(pxTransformFlatmap(layout, (toPx, [start, end]) => {
					var variants = _.filter(
						intervalTree.matches(index, {start: start, end: end}),
						v => _.has(sindex, v.sample));
					return _.map(variants, v => {
						var [pstart, pend] = minSize(toPx([v.start, v.end]));
						return {
							xStart: pstart,
							xEnd: pend,
							y: sindex[v.sample] * pixPerRow + (pixPerRow / 2) + sparsePad,
						   group: group(annValues, v),                                   // needed for sort, before drawing.
						   data: v
						};
					});
				}), v => v.group);
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
					var [dataset, feature] = this.feature.split("__"),
						md = _.find(metadataStub.variantSets, ds => ds.id === dataset).metadata,
						info = _.find(md, ds => ds.key === ('INFO.'+feature)).info,
						colorFn = annotationColor.colorSettings[dataset][feature].color;

					labels = annotationColor.colorSettings[dataset][feature].filter.map(value => info[value]);
					myColors = annotationColor.colorSettings[dataset][feature].filter.map(value=>colorFn(value));
				}
				myColors.unshift('rgb(255,255,255)');
				labels.unshift('no mutation');
				this.columnUi.drawLegend(myColors, labels, align, '', 'mutationVector', topBorderIndex);
			},

			render: function () {
//				var start = performance.now();
				this.pixPerRow = (this.height - (this.sparsePad * 2))  / this.values.length;
				this.canvasHeight = this.height; // TODO init elsewhere
				this.d2 = this.vg.context();
				this.nodes = this.findNodes();
				this.drawLegend();

				this.draw(this.vg);
//				var end = performance.now();
//				console.log('full run', end - start);
			},

			initialize: function (options) {
				var self = this;

				_.bindAll.apply(_, [this].concat(_.functions(this)));
				//_(this).bindAll();
				this.vg = options.vg;
				this.columnUi = options.columnUi;
				this.dataset = options.dataset;
				this.gene = options.gene;
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
				this.options = options;

				var {baseLen, pxLen} = options.layout;
				// XXX There's something wrong here. E.g. if the exons have
				// 1px spacing, this would be off. pxLen is the wrong metric.
				this.offset = (_.get_in(this, ['options', 'xzoom', 'index']) || 0) *
					pxLen / baseLen;

				// bindings
				this.sub = this.columnUi.crosshairs.mousingStream.subscribe(function (ev) {
					ev.data = { plotData: self.columnUi.plotData };
					self.mousing(ev);
				});

				this.receiveAnnData(options.annData);
				this.receiveData(options.data);
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
			impact: features.impact.get(null, mut),
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
