"use strict";

// XXX Warning: opacity other than 1 is not interpreted correctly.
var style = function (c) {
	return c.match(/^rgba?\(/)  ?
			c.match(/rgba?\(([0-9]+), ([0-9]+), ([0-9]+)(, 1)?\)/).slice(1, 4) : c;
};

module.exports = function (doc/*, vgw, vgh*/) {
	var fontFamily = 'Helvetica',

		notImplemented = () => console.log('Not implemented'),
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

		alpha = notImplemented,

		box = function (x, y, w, h, c) {
			doc.rect(x, y, w, h).fill(style(c));
		},

		clear = notImplemented,

		circle = notImplemented,

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

		width = notImplemented,

		height = notImplemented,

		element = notImplemented,

		context = notImplemented,

		text = function (x, cy, c, fontHeight, txt) {
			// See https://github.com/devongovett/pdfkit/issues/351 for y correction.
			var y = cy - doc._font.ascender / 1000 * fontHeight;
			setfont(fontFamily, fontHeight);
			doc.fill(style(c));
			doc.text(txt, x, y, {lineBreak: false}); // lineBreak is broken; disable it.

//			setfont(fontFamily, font);
//			ctx.fillStyle = style(c);
//			ctx.fillText(txt, x, y);
		},

		textWidth = function (font, txt) {
			doc.font(fontFamily).fontSize(font);
			return doc.widthOfString(txt);
		},

		textCentered = notImplemented,

		// Center text if there's room. If the box is too narrow, push
		// right so the left-most (first) characters are visible.
		textCenteredPushRight = function (x, cy, w, h, c, fontHeight, val) {
			// See https://github.com/devongovett/pdfkit/issues/351 for y correction.
			var y = cy - doc._font.ascender / 1000 * fontHeight,
				txt = String(val),
				th = fontHeight,
				tw = textWidth(fontHeight, txt),
				tx = Math.max(x, x + w / 2 - tw / 2),
				ty = y + h / 2 + th / 2;

			setfont(fontFamily, fontHeight);
			doc.fill(style(c));
			doc.text(txt, tx, ty, {lineBreak: false}); // lineBreak is broken; disable it.
		},

		textRight = notImplemented,

		verticalTextRight = notImplemented,

		makeColorGradient = notImplemented,

		drawImage = notImplemented,

		smoothing = () => {},
		labels = cb => cb(),

		drawPoly = function (pts, {fillStyle, strokeStyle, lineWidth}) {
			pts.forEach(([mtx, mty, ltx, lty]) => {
				if (ltx === undefined) {
					doc.lineTo(mtx, mty);
				} else {
					doc.moveTo(mtx, mty);
					doc.lineTo(ltx, lty);
				}
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
		};

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
		labels,
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
