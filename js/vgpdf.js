/*global require: false, module: false  */

/*eslint-disable no-unused-vars */
"use strict";

var _ = require('./underscore_ext');

// XXX Warning: opacity other than 1 is not interpreted correctly.
var style = function (c) {
	return c.match(/^rgba?\(/)  ?
			c.match(/rgba?\(([0-9]+), ([0-9]+), ([0-9]+)(, 1)?\)/).slice(1, 4) : c;
};

module.exports = function (doc/*, vgw, vgh*/) {
	var fontFamily = 'Helvetica',

		// setting font is expensive, so cache it.
		setfont = (family, size) => doc.font(family).fontSize(size),

		scale = function (x, y, cb) {
			doc.save();
			doc.scale(x, y);
			cb.apply(this);
			doc.restore();
		},

		translate = function (x, y, cb) {
			doc.save();
			doc.translate(x, y);
			cb.apply(this);
			doc.restore();
		},

		alpha = function (a, fn) {
//			var old = a;
//			ctx.globalAlpha = a;
//			fn.call(this);
//			ctx.globalAlpha = old;
		},

		box = function (x, y, w, h, c) {
			doc.rect(x, y, w, h).fill(style(c));
		},

		clear = function (x, y, w, h) {
//			ctx.clearRect(x, y, w, h);
		},

		circle = function (x, y, r, c, noFill) {
//			ctx.beginPath();
//			ctx.arc(x, y, r, 0, 2 * Math.PI);
//			if (noFill) {
//				ctx.strokeStyle = c;
//				ctx.stroke();
//			} else {
//				ctx.fillStyle = c;
//				ctx.fill();
//			}
		},

		clipRect = function (x, y, w, h) {
			doc.save();
			doc.rect(x, y, w, h).clip();
		},

		clipReset = function () {
			doc.restore();
		},

		clip = function (x, y, w, h, fn) {
			clipRect(x, y, w, h);
			fn.apply(this);
			clipReset();
		},

		width = function (w) {
//			if (_.isNumber(w)) {
//				el.width = w;
//				// Resizing loses the font setting
//				ctx.font = currentFont;
//			}
//			return el.width;
		},

		height = function (h) {
//			if (_.isNumber(h)) {
//				el.height = h;
//				// Resizing loses the font setting
//				ctx.font = currentFont;
//			}
//			return el.height;
		},

		element = function () {
//			return el;
		},

		context = function () {
//			return ctx;
		},

		text = function (x, y, c, font, txt) {
//			setfont(fontFamily, font);
//			ctx.fillStyle = style(c);
//			ctx.fillText(txt, x, y);
		},

		textWidth = function (font, txt) {
			doc.font(fontFamily).fontSize(font);
			return doc.widthOfString(txt);
		},

		textCentered = function (x, y, w, h, c, fontHeight, txt) {
//			var th = fontHeight,
//				tw = textWidth(fontHeight, txt),
//				tx = x + w / 2 - tw / 2,
//				ty = y + h / 2 + th / 2;
//			setfont(fontFamily, fontHeight);
//			ctx.fillStyle = style(c);
//			ctx.fillText(txt, tx, ty);
		},

		// Center text if there's room. If the box is too narrow, push
		// right so the left-most (first) characters are visible.
		textCenteredPushRight = function (x, cy, w, h, c, fontHeight, val) {
			// See https://github.com/devongovett/pdfkit/issues/351 for y correction.
			var y = cy - doc._font.ascender / 1000 * fontHeight,
				txt = val.toString(),
				th = fontHeight,
				tw = textWidth(fontHeight, txt),
				tx = Math.max(x, x + w / 2 - tw / 2),
				ty = y + h / 2 + th / 2;

			setfont(fontFamily, fontHeight);
			doc.fill(style(c));
			doc.text(txt, tx, ty, {lineBreak: false});
		},

		textRight = function (x, y, width, height, c, fHeight, txt) {
//			var fWidth, xoff, yoff;
//			fWidth = textWidth(fHeight, txt);
//			xoff = x + width - fWidth - 1;
//			yoff = y + (height + fHeight) / 2 - 1;
//			text(xoff, yoff, c, fHeight, txt);
		},

		cutLine = function (text, font, width) {
//			var words = text.split(' ');
//			return _(words).reduce(function (acc, w) {
//				var line = acc[acc.length - 1];
//				if (line && textWidth(font, line + " " + w) < width) {
//					acc[acc.length - 1] += " " + w;
//				} else {
//					acc.push(w);
//				}
//				return acc;
//			}, []);
		},

		// Draw text vertically and right-aligned, wrapping if needed to fit
		// in the given area height.
		// Parameters:
		//		...
		//		testOverflow: only test for label overflow of available area
		// Returns:
		//		if testOverflow, true on overflow, false on no overflow
		//		if not testOverflow, returns nothing
		verticalTextRight = function (x, y, width, height, c, font, txt, testOverflow) {
//			var lines = cutLine(txt, font, height),
//				H = width, // available height
//				h = font,  // font height
//				s = Math.ceil(0.2 * font),
//				maxLines = (height + s) / (font + s), // n*f+(n-1)*s=t, n=(t+s)/(f+s)
//				n = Math.min(lines.length, maxLines),
//				off = Math.round((H - (n * h + n * s - s)) / 2);
//			if (testOverflow) {
//				return (off < 0);
//			}
//			ctx.save();
//			ctx.translate(x, y + height);
//			ctx.rotate(-Math.PI / 2);
//			_(lines).each(function (line, i) {
//				text(height - textWidth(font, line) - 1, off + i * h + h + i * s - s, c, font, line);
//			});
//			ctx.restore();
		},

		makeRange = function (start, end, count) {
//			var d = (end - start) / (count - 1);
//			return _(0).chain()
//				.range(count)
//				.map(function (i) { return Math.round(start + d * i); })
//				.value();
		},

		makeColorGradient = function (start, end, count) {
//			var r = makeRange(start[0], end[0], count),
//				g = makeRange(start[1], end[1], count),
//				b = makeRange(start[2], end[2], count);
//			return _.zip(r, g, b);
		},

		drawImage = function (/* c, sx, sy, sw, sh, dx, dy, dw, dh */) {
//			ctx.drawImage.apply(ctx, arguments);
		},

		smoothing = () => {},

		drawPoly = function (pts, {fillStyle, strokeStyle, lineWidth}) {
			pts.forEach(([mtx, mty, ltx, lty]) => {
				doc.moveTo(mtx, mty);
				doc.lineTo(ltx, lty);
			});

			if (fillStyle && strokeStyle) {
				// This oddity is required by pdf.
				doc.lineWidth(lineWidth);
				doc.fillAndStroke(fillStyle, strokeStyle);
			} else {
				if (fillStyle) {
					doc.fill(style(fillStyle));
				}
				if (strokeStyle) {
					doc.lineWidth(lineWidth);
					doc.stroke(style(strokeStyle));
				}
			}
		},

		drawRectangles = function (rects, {fillStyle, strokeStyle, lineWidth}) {
			rects.forEach(([x, y, w, h]) => doc.rect(x, y, w, h));

			if (fillStyle && strokeStyle) {
				// This oddity is required by pdf.
				doc.lineWidth(lineWidth);
				doc.fillAndStroke(fillStyle, strokeStyle);
			} else {
				if (fillStyle) {
					doc.fill(style(fillStyle));
				}
				if (strokeStyle) {
					doc.lineWidth(lineWidth);
					doc.stroke(style(strokeStyle));
				}
			}
		},

		drawSharpRows = function (vg, index, count, height,
					width, drawBackground, drawRows) {

			drawBackground(vg, width, height);
			drawRows(vg, width, height / count);
//			scratch.scale(1, s.scale, () => drawRows(scratch, 1, 1));
		};

//	el.width = vgw;
//	el.height = vgh;

	return {
		box,
		circle,
		clear,
		context,
		width,
		height,
		clipRect,
		clipReset,
		clip,
		text,
		textCentered,
		textCenteredPushRight,
		textWidth,
		textRight,
		verticalTextRight,
		makeColorGradient,
		drawImage,
		drawPoly,
		smoothing,
		element,
		alpha,
		scale,
		translate,
		drawSharpRows,
		drawRectangles
	};
};
