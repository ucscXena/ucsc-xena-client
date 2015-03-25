/*jslint nomen:true, browser: true */
/*global define: false, console: false */

define(['crosshairs', 'tooltip', 'util', 'd3', 'jquery', 'select2', 'underscore'
	// non-object dependencies
	], function (crosshairs, tooltip, util, d3, $, select2, _) {
	'use strict';

	var shade1 = '#cccccc',
		shade2 = '#999999',
		spLen = 2, // splice site base pairs
		utrY = 10,
		utrHeight = 8,
		cdsY = 12,
		cdsHeight = 12,
		clone = _.clone,
		each = _.each,
		find = _.find,
		map = _.map,
		widgets = {},
		refGeneWidget = {

			destroy: function () {
				this.crosshairs.destroy();
				this.d3select.remove();
				delete widgets[this.id];
			},

			error: function (message) {
				if (console) {
					console.log(message);
				}
			},

			mapChromPosToX: function (chromPos) {
				var posChromPos = (this.data.strand === '-') ? this.flip(chromPos) : chromPos,
					splexon = find(this.splexons, function (s, i) {
						return (posChromPos >= s.start && posChromPos <= s.end);
					});
				if (splexon) {
					return splexon.x + (posChromPos - splexon.start) + 0.5;
				} else {
					console.log('mutation at ' + chromPos + ' not on an exon or splice site');
					return -1;
				}
			},

/* tooltip is inactive here:
			mapXtoChromPos: function (elementX) {
				TBD if we ever want a tooltip on refGene
			},

			mousing: function (ev) {
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
			},
*/
			flip: function (ES) {
				var C = this.data.txEnd - this.data.txStart + 1;
				return C - ES + 1;
				// from http://genomewiki.ucsc.edu/index.php/Visualizing_Coordinates
				// if you use one-based closed coordinates then the picture
				// looks like this:  coord range both strands: [1,chromSize]
				// <pre>
				//                           e     s                ...321  (neg strand coords)
				//  eziSmorhc=C              YYYYYYY
				//            nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn
				//            pppppppppppppppppppppppppppppppppppppppppppp
				//                           XXXXXXX                     C=chromSize
				//            123...         S     E                        (pos strand coords)
				//
				// s = C - E + 1
				// e = C - S + 1
				//
				// So in these coordinates, there is usually some extra +1 or -1 that is needed
				// in coordinate calculations.
			},

			flipNegativeStrand: function () {
				// RefGene data in general, and in our database are stored in
				// positive strand coordinates, however, we want to view them in
				// order of transcription. So we flip any negative strand genes
				// into order-of-transcription coordinates. 5'utr is always on
				// the left in our view, and indicates the start of transcription
				var self = this,
					data = this.data,
					neg = {
						cdsStart: data.cdsStart,
						cdsEnd: data.cdsEnd,
						exonStarts: data.exonStarts,
						exonEnds: data.exonEnds
					};
				data.cdsStart = this.flip(neg.cdsEnd);
				data.cdsEnd = this.flip(neg.cdsStart);
				data.exonStarts = map(neg.exonEnds, function (e, i) {
					return self.flip(e);
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
				this.data = Object.create(data.gene);

				if (this.data.strand === '-') {
					this.flipNegativeStrand();
				}
				this.render();
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
					self.d2.fillStyle = n.shade ? shade1 : shade2;
					self.d2.fillRect(x, y, n.width, n.height);
					lastNodeEndX = n.x + n.width - 1;
				});
				this.d2.scale(1 / this.scaleX, 1);
				this.d2.font = "12px Verdana";
				this.d2.strokeText("5'", 5, this.canvasHeight - 2);
				this.d2.strokeText("3'", this.canvasWidth - 15, this.canvasHeight - 2);
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

			makeSplexons: function () {
				// A splexon is the exon plus its splice sites,
				// since we want to show mutations on splice sites as well as on exons.
				var self = this,
					shade = true,
					offset, // drawing offset for splexon start
					lastExon = this.data.exonStarts.length - 1,
					splexons = map(this.data.exonStarts, function (exonStart, i) {
						var s = {
							exonStart: self.data.exonStarts[i],
							exonEnd: self.data.exonEnds[i],
							start: self.data.exonStarts[i] - spLen,
							end: self.data.exonEnds[i] + spLen,
							shade: shade
						};
						if (i === 0) {
							s.exonX = s.x = 0;
							s.start += spLen;
						} else {
							s.x = offset;
							s.exonX = s.x + spLen;
							if (i === lastExon) {
								s.end = s.exonEnd;
							}
						}
						offset = s.x + s.end - s.start + 1;
						shade = !shade;
						return s;
					});
				this.splexons = splexons;
			},

			makeNodes: function () {
				// Nodes are used to draw the refGene.
				// Splice sites are not drawn and are represented as spaces between exons
				var nodes = [],
					cdsStart = this.data.cdsStart,
					cdsEnd = this.data.cdsEnd,
					cdsStartHit,
					cdsEndHit;
				if (cdsStart === cdsEnd + 1) {
					cdsStartHit = cdsEndHit = true;
				}
				_.each(this.splexons, function (s, i) {
					var n = { x: s.exonX, splexon: i };
					if (!cdsStartHit) {
						if (s.exonStart === cdsStart) {
							cdsStartHit = true;
							n.y = cdsY;
							if (s.exonEnd <= cdsEnd) {
								n.width = s.exonEnd - s.exonStart + 1;
								nodes.push(n); // cds
								cdsEndHit = (s.exonEnd === cdsEnd);
							} else { // s.exonEnd > cdsEnd
								cdsEndHit = true;
								n.width = cdsEnd - s.exonStart + 1;
								nodes.push(n); // cds
								n = clone(n);
								n.y = utrY;
								n.x += n.width;
								n.width = s.exonEnd - cdsEnd;
								nodes.push(n); // 3'utr
							}
						} else { // exonStart < cdsStart
							n.y = utrY;
							if (s.exonEnd < cdsStart) {
								n.width = s.exonEnd - s.exonStart + 1;
								nodes.push(n); // 5'utr
							} else { // exonEnd >= cdsStart
								cdsStartHit = true;
								n.width = cdsStart - s.exonStart;
								nodes.push(n); // 5'utr
								n = clone(n);
								n.y = cdsY;
								n.x += n.width;
								if (s.exonEnd <= cdsEnd) {
									n.width = s.exonEnd - cdsStart + 1;
									nodes.push(n); // cds
									cdsEndHit = (s.exonEnd === cdsEnd);
								} else { // exonEnd > cdsEnd
									cdsEndHit = true;
									n.width = cdsEnd - cdsStart + 1;
									nodes.push(n); // cds
									n = clone(n);
									n.y = utrY;
									n.x += n.width;
									n.width = s.exonEnd - cdsEnd;
									nodes.push(n); // 3'utr
								}
							}
						}
					} else if (!cdsEndHit) {
						n.y = cdsY;
						if (s.exonEnd <= cdsEnd) {
							n.width = s.exonEnd - s.exonStart + 1;
							nodes.push(n); // cds
							cdsEndHit = (s.exonEnd === cdsEnd);
						} else { // exonEnd > cdsEnd
							cdsEndHit = true;
							n.width = cdsEnd - s.exonStart + 1;
							nodes.push(n); // cds
							n = clone(n);
							n.y = utrY;
							n.x += n.width;
							n.width = s.exonEnd - cdsEnd;
							nodes.push(n); // 3'utr
						}
					} else { // cdsStartHit && cdsEndHit
						n.y = utrY;
						n.width = s.exonEnd - s.exonStart + 1;
						nodes.push(n); // utr
					}
				});
				this.nodes = nodes;
			},

			makeNodesDrawable: function () {
				var self = this,
					nodes = _.map(this.nodes, function (old) {
						var n = Object.create(old);
						n.height = (n.y === utrY) ? utrHeight : cdsHeight;
						n.shade = self.splexons[n.splexon].shade;
						return n;
					});
				this.nodes = nodes;
			},

			render: function () {
				this.d2.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
				this.makeSplexons();
				this.makeNodes();
				this.makeNodesDrawable();
				this.scaleX = this.findScale();
				this.draw();
			},

			initialize: function (options) {
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
				//this.sub = this.crosshairs.mousingStream.subscribe(this.mousing);
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
