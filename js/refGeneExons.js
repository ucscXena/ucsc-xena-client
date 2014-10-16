/*jslint nomen:true, browser: true */
/*global define: false */

define(['crosshairs', 'tooltip', 'util', 'lib/d3', 'jquery', 'lib/select2', 'lib/underscore'
	// non-object dependencies
	], function (crosshairs, tooltip, util, d3, $, select2, _) {
	'use strict';

	var TEST = true,
		shade1 = '#cccccc',
		shade2 = '#999999',
		labels = {
			coding: "CDS, exon ",
			fiveUtr: "5' UTR, exon ",
			threeUtr: "3' UTR, exon ",
			fiveSplice: "splice site, exon ",
			threeSplice: "splice site, exon ",
		},
		spLen = 2, // splice site base pairs
		clone = _.clone,
		each = _.each,
		filter = _.filter,
		find = _.find,
		map = _.map,
		reduce = _.reduce,
		toNumber = _.toNumber,
		uniqueId = _.uniqueId,
		widgets = {},
		refGeneWidget = {

			destroy: function () {
				this.crosshairs.destroy();
				this.d3select.remove();
				delete widgets[this.id];
			},

			error: function (message) {
				console.log(message);
			},

			mapChromPosToX: function (chromPos) {
				var self = this,
					positiveChromPos = (this.data.strand === '-') ? this.flip(chromPos, true) : chromPos, // TODO test this flip
					offset,
					splexon = find(this.splexons, function (s, i) {
						var start = s.x + s.exonXoffset,
							end = start + (s.exonEnd + 1 - s.exonStart) + (spLen * 2);
						if (i > 0 && i < self.splexons.length - 1) { // not first or last
							end += spLen;
						}
						return (positiveChromPos >= start && positiveChromPos <= end);
					});
				if (splexon) {
					return positiveChromPos - splexon.exonXoffset;
				} else {
					console.log('mutation at ' + chromPos + ' not on an exon or splice site');
					return -1;
				}
			},

/* splexons broken:
			mapXtoChromPos: function (elementX) {
				var self = this,
					x = elementX / this.scaleX,
					splexon,
					val,
					node = find(this.nodes, function (n, i) {
						var s = self.splexons[n.splexonI],
							endX = (i === (self.nodes.length - 1))
								? s.exonX + (s.exonEnd + 1 - s.exonStart) // TODO adjust exonX?
								//? s.exonX + (s.exonEnd - s.exonStart) // TODO adjust exonX?
								: self.nodes[i + 1].x;
						return (x >= n.x && x < endX);

					});
				if (node) {
					splexon = this.splexons[node.splexonI];
					if (node.type === 'fiveSplice') {
						val = (node.splexonI).toString() + '-' + (node.splexonI + 1).toString() + ' splice site';
					} else if (node.type === 'threeSplice') {
						val = (node.splexonI + 1).toString() + '-' + (node.splexonI + 2).toString() + ' splice site';
					} else {
						val = (node.splexonI + 1).toString();
					}
					val += ' of composite transcript';
					return {
						start: Math.round(splexon.exonXoffset + x),
						end: Math.round(splexon.exonXoffset + x),
						vals: [{label: 'Exon', val: val }]
					};
				} else {
					return {chromPos: 'N/A', value: 'N/A'};
				}
			},

			mousing: function (ev) {
				if (TEST) {
					var pos = {},
						rows = [],
						offsetX = ev.offsetX;
					if (tooltip.frozen()) {
						return;
					}
					if (ev.type === 'mouseleave') {
						tooltip.hide();
						return;
					}
					if (offsetX === undefined) {
						offsetX = util.eventOffset(ev).x;
					}
					offsetX -= this.radius;
					pos = this.mapXtoChromPos(offsetX);
					rows.push({ label: 'gene', val: this.data.name2 });
					rows.push({ label: 'splexon start', val: pos.start });
					rows.push({ label: 'splexon end', val: pos.end });
					rows = rows.concat(pos.vals);
					tooltip.mousing({
						ev: ev,
						el: '#nav',
						my: 'top',
						at: 'top',
						rows: rows
					});
				}
			},
*/
			flip: function (val, start) {
				if (start) {
					return (this.data.txEnd - val) + this.data.txStart;
				} else {
					return this.data.txEnd - (val - this.data.txStart);
				}
			},

			flipNegativeStrand: function () {
				var self = this,
					data = this.data,
					neg = {
						cdsStart: data.cdsStart,
						cdsEnd: data.cdsEnd,
						exonStarts: data.exonStarts,
						exonEnds: data.exonEnds
					};
				data.cdsStart = this.flip(neg.cdsEnd, true);
				data.cdsEnd = this.flip(neg.cdsStart);
				data.exonStarts = map(neg.exonEnds, function (e, i) {
					return self.flip(e, true);
				});
				data.exonStarts.reverse();
				data.exonEnds = map(neg.exonStarts, function (e, i) {
					return self.flip(e);
				});
				data.exonEnds.reverse();
			},

			receiveData: function (data) {
				if (!data.gene) {
					this.error('gene not found');
					return;
				}
				this.data = data.gene;

				if (this.data.strand === '-') {
					this.flipNegativeStrand();
				}
				this.render();
			},

			drawTestSplexon: function (n, width) {
				var x = this.x(n.x) + this.radius / this.scaleX,
					y = this.y(5);
				this.d2.moveTo(x, (y / 2) + 1);
				this.d2.fillStyle = (n.shade) ? 'Orchid' : 'Orange';
				this.d2.fillRect(x, y, width, 5);
			},

			drawTestSplexons: function (lastNodeEndX) {
				var self = this,
					data = this.data,
					x,
					y,
					prevSplexon;
				each(this.splexons, function (n) {
					if (prevSplexon) {
						self.drawTestSplexon(prevSplexon, n.x - prevSplexon.x);
					}
					prevSplexon = n;
				});
				this.drawTestSplexon(prevSplexon, lastNodeEndX + 1 - prevSplexon.x);

				// red bars on top of cds end-points:
				if (data.cdsEnd + 1 !== data.cdsStart) {
					x = this.x(this.cdsStartX) + this.radius / this.scaleX;
					y = this.y(this.codingHeight);
					this.d2.moveTo(x, (y / 2) + 1);
					this.d2.fillStyle = 'red';
					this.d2.fillRect(x, y, 1, 2);

					x = this.x(this.cdsEndX) + this.radius / this.scaleX;
					y = this.y(this.codingHeight);
					this.d2.moveTo(x, (y / 2) + 1);
					this.d2.fillStyle = 'red';
					this.d2.fillRect(x, y, 1, 2);
				}
			},

			draw: function () {
				var self = this,
					x,
					y,
					lastNodeEndX;
				this.d2.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
				this.d2.beginPath();
				this.d2.scale(this.scaleX, 1);
				each(this.nodes, function (n) {
					x = self.x(n.x) + self.radius / self.scaleX;
					y = self.y(n.y);
					self.d2.moveTo(x, y);
					if (TEST) {
						if (n.type === 'fiveSplice') {
							self.d2.fillStyle = 'DeepSkyBlue';
						} else if (n.type === 'threeSplice') {
							self.d2.fillStyle = 'GreenYellow ';
						} else {
							self.d2.fillStyle = n.shade ? shade1 : shade2;
						}
					} else {
						self.d2.fillStyle = n.shade ? shade1 : shade2;
					}
					self.d2.fillRect(x, y, n.width, n.height);
					lastNodeEndX = n.x + n.width - 1;
				});
				if (TEST) { this.drawTestSplexons(lastNodeEndX); }
				this.d2.scale(1 / this.scaleX, 1);
				this.d2.font = "12px Verdana";
				this.d2.strokeText("5'", 5, this.canvasHeight - 2);
				this.d2.strokeText("3'", this.canvasWidth - 15, this.canvasHeight - 2);
			},

		    loadExons: function () {
				// prepare data using absolute chromosomal coordinates
				// coordinate system is one-based, closed;
				// the start & end coords are included in the range.
				var self = this,
					shade = true,
					exonXoffset = this.data.txStart - 1, // offset of exon with introns removed
					prevExonEnd = this.data.txStart - 1,
					exons = map(this.data.exonStarts, function (exonStart, i) {
						var exonEnd = self.data.exonEnds[i],
							exon;
						exonXoffset += exonStart - prevExonEnd - 1;
						exon = {
							exonStart: exonStart, // for finding CDS & UTRs
							exonEnd: exonEnd, // for finding CDS & UTRs & width
							exonX: exonStart - exonXoffset - 1,
							exonXoffset: exonXoffset,
							shade: shade,
						};
						shade = !shade;
						prevExonEnd = exonEnd;
						return exon;
					});
				return exons;
			},

			insertSpliceSites: function (exonsIn) {
				// a "splexon" is an exon plus its splice sites
				var self = this,
					exons = exonsIn,
					xOffset = -spLen, // additional offset to be applied due to addition of splice sites
					nodes = [],
					splexons = map(exons, function (e, i) {
						var s = clone(e);
						if (i === 0) {
							s.x = s.exonX;
						} else {
							xOffset += spLen * 2;
							s.x = e.exonX + xOffset;
							s.exonX = s.x + spLen;
							s.exonXoffset -= (xOffset + spLen);
						}
						return s;
					});

				// build the first set of nodes
				each(splexons, function (s, i) {
					var a,
						n = {
							x: s.x,
							splexonI: i,
						};
					if (i === 0) {
						n.type = 'coding'; // could be utr, but coding for color here
						nodes.push(n);

					} else {
						n.type = 'fiveSplice';
						nodes.push(n);

						a = clone(n);
						a.x = s.x + spLen;
						a.type = 'coding'; // could be utr, but coding for color here
						nodes.push(a);
					}
					if (i !== self.data.exonCount - 1) { // not the last node
						a = clone(n);
						a.x = splexons[i + 1].x - spLen;
						a.type = 'threeSplice';
						nodes.push(a);
					}
				});
				this.nodes = nodes;
				return splexons;
			},

			offsetCds: function () {
				var self = this,
					data = this.data,
					index,
					splexon = find(this.splexons, function (s, i) {
						index = i;
						return (s.exonStart <= data.cdsStart && data.cdsStart <= s.exonEnd);
					});
				if (!splexon) {
					this.error('cdsStart is not on an exon');
					return false;
				}
				this.cdsStartX = data.cdsStart - splexon.exonXoffset - 1;

				splexon = find(this.splexons, function (n, i) {
					index = i;
					return (n.exonStart <= data.cdsEnd && data.cdsEnd <= n.exonEnd);
				});
				if (!splexon) {
					this.error('cdsEnd is not on an exon');
					return false;
				}
				this.cdsEndX = data.cdsEnd - splexon.exonXoffset - 1;
			},

			pushNode: function (nodes, node, codingChangeTo) {
				if (codingChangeTo && node.type === 'coding') {
					node.type = codingChangeTo;
				}
				nodes.push(node);
			},

			findUtrs: function (nodes) {
				var self = this,
					startNodes = [],
					newNodes = [],
					lastNode,
					cStartX = this.cdsStartX,
					cEndX = this.cdsEndX;

				// mark the 5'UTR nodes
				each(nodes, function (node, i) {
					var n = clone(node);
					if (n.x < cStartX) {
						self.pushNode(startNodes, n, 'fiveUtr');
						lastNode = node;
					} else if (n.x === cStartX) {
						startNodes.push(n);
						lastNode = undefined;
					} else { // n.x > cStartX
						if (lastNode && lastNode.type === 'coding') {
							lastNode = clone(lastNode);
							lastNode.x = cStartX;
							startNodes.push(lastNode);
						}
						lastNode = undefined;
						startNodes.push(n);
					}
				});
				if (lastNode && lastNode.type === 'coding') {
					lastNode.x = cStartX;
					startNodes.push(lastNode);
				}

				// mark the 3'UTR nodes
				lastNode = undefined;
				each(startNodes, function (node, i) {
					var n = clone(node);
					if (n.x <= cEndX) {
						newNodes.push(n);
						lastNode = node;
					} else if (n.x === cEndX + 1) {
						if (lastNode && lastNode.type === 'coding') {
							lastNode = clone(lastNode);
							lastNode.x = cEndX + 1;
							self.pushNode(newNodes, lastNode, 'threeUtr');
						}
						lastNode = undefined;
						self.pushNode(newNodes, n, 'threeUtr');
					} else { // n.x > cEndX
						self.pushNode(newNodes, n, 'threeUtr');
					}
				});
				if (lastNode && lastNode.type === 'coding') {
					lastNode.x = cEndX + 1;
					self.pushNode(newNodes, lastNode, 'threeUtr');
				}

				return newNodes;
			},

			makeNodesDrawable: function (nodes) {
				var self = this,
					utrY = this.codingHeight - 2,
					utrHeight = this.codingHeight - 4,
					spliceY = TEST ? utrY : this.codingHeight / 2,
					spliceHeight = TEST ? utrHeight : 1,
					splexons = this.splexons,
					prevSplexonI = -1,
					s,
					exonXend,
					newNodes = map(nodes, function (node, j) {
						var n = clone(node);
						if (n.splexonI !== prevSplexonI) {
							s = splexons[n.splexonI];
							prevSplexonI = n.splexonI;
							if (n.splexonI === splexons.length - 1) { // last splexon
								exonXend = s.exonX + (s.exonEnd + 1 - s.exonStart);
							}
						}
						if (n.type === 'coding') {
							n.y = n.height = self.codingHeight;
						} else if (n.type === 'fiveSplice') {
							n.y = spliceY;
							n.height = spliceHeight;
						} else if (n.type === 'threeSplice') {
							n.y = spliceY;
							n.height = spliceHeight;
						} else {
							n.y = utrY;
							n.height = utrHeight;
						}
						if (j === nodes.length - 1) { // last node
							n.width = exonXend - n.x;
						} else {
							n.width = nodes[j + 1].x - n.x;
						}
						n.shade = s.shade;
						return n;
					});
				return newNodes;
			},

			findScale: function (nodes) {
				var lastNode = this.nodes[this.nodes.length - 1],
					preScaleWidth = lastNode.x + lastNode.width;
				return this.drawWidth / preScaleWidth;
			},

			getGeneInfo: function () {
				return {
					name: this.data.name2,
					scaleX: this.scaleX,
					txStart: this.data.txStart,
					txEnd: this.data.txEnd,
					strand: this.data.strand
				};
			},

			render: function () {
				var exons, nodes, rc = true;
				this.d2.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

				// load exons and collapse introns
				exons = this.loadExons();

				// insert splice sites between exons
				this.splexons = this.insertSpliceSites(exons);

				// offset the coding DNA sequence start & end since collapsing the introns
				rc = this.offsetCds(this.splexons);
				if (rc === false) { return; }

				this.nodes = this.findUtrs(this.nodes);
				this.nodes = this.makeNodesDrawable(this.nodes);
				this.scaleX = this.findScale();
				this.draw();
			},

			initialize: function (options) {
				var self = this,
					name2SelectId = uniqueId();
				_.bindAll.apply(_, [this].concat(_.functions(this)));

				this.codingHeight = options.refHeight;
				this.canvasWidth = options && options.width ? options.width : 960;
				this.radius = options.radius;
				this.drawWidth = this.canvasWidth - this.radius * 2;
				this.canvasHeight = this.codingHeight;
				this.$sidebarAnchor = options.$sidebarAnchor;

				this.crosshairs = crosshairs.create('exonRefGene-' + this.id, {
					$anchor: $(options.plotAnchor)
				});
				/*
				if (TEST) {
					this.sub = this.crosshairs.mousingStream.subscribe(this.mousing);
				}
				*/
				this.x = d3.scale.linear()
					.domain([0, this.canvasWidth])
					.range([0, this.canvasWidth]);
				this.y = d3.scale.linear()
					.domain([0, this.canvasHeight])
					.range([this.canvasHeight, 0]);
				this.d3select = d3.select(options.plotAnchor).append('canvas');
				this.d2 = this.d3select
					.attr('width', this.canvasWidth)
					.attr('height', this.canvasHeight)
					.node().getContext('2d');

				$(options.plotAnchor + ' canvas')
					.addClass('refGeneCanvas');

				this.receiveData(options.data);
			}
		};

	function create(id, options) {
		var w = Object.create(refGeneWidget);
		w.id = id;
		w.initialize(options);
		return w;
	}

	return {
		show: function (id, options) {
			if (widgets[id]) {
				widgets[id].destroy();
			}
			widgets[id] = create(id, options);
			return widgets[id];
		},

		get: function (id) {
			return widgets[id];
		}
	};
});
