"use strict";

// XXX Warning: opacity other than 1 is not interpreted correctly.
var style = function (c) {
	return c.match(/^rgba?\(/)  ?
			c.match(/rgba?\(([0-9]+), ([0-9]+), ([0-9]+)(, 1)?\)/).slice(1, 4) : c;
};

module.exports = function (doc, vgw, vgh) {
	var fontFamily = 'Helvetica',

		notImplemented = () => console.log('Not implemented'),
		// setting font is expensive, so cache it.
		setfont = (family, size) => doc.font(family).fontSize(size),

		scale = function (x, y, cb) {
			doc.save();
			doc.scale(x, y, {});
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

		// getting a bit weird, here. Writing mock 2d canvas ctx in order to
		// support img data in pdf. Should probably improve the vg API, instead.
		context = () => {
			var el = document.createElement('canvas'),
				ctx = el.getContext('2d');

			el.width = vgw;
			el.height = vgh;

			return {
				createImageData: (w, h) => {
					el.width = w;
					el.height = h;
					return ctx.createImageData(w, h);
				},
				putImageData: (img, x, y) => {
					ctx.putImageData(img, x, y);
					doc.image(el.toDataURL(), 0, 0);
				}
			};
		},

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
		textCenteredPushRight = function (x, y, w, h, c, fontHeight, val) {
			// See https://github.com/devongovett/pdfkit/issues/351 for y correction.
			setfont(fontFamily, fontHeight);
			var opts = {width: w, height: h, align: 'center'},
//				adj = doc._font.ascender / 1000 * fontHeight,
				txt = String(val),
				th = doc.heightOfString(txt, opts),
				// pdfkit places text by upper-left corner, which is the same as
				// the coord we are passed. Here we center it vertically, if there's
				// space. Otherwise we use the passed y coordinate so the 1st line
				// is visible. The +2 fudge is determined emperically, and should
				// probably be based on line spacing, font height, or something.
				ty = (th > h ? y  : y + h / 2 - th / 2) + 2;

			doc.fill(style(c));
			doc.text(txt, x, ty, opts);
			// There was an infinite loop with 'lineBreak' if text was placed
			// outside the page margin. We disabled it for that reason. Enabling
			// it now, because we want text to wrap. So far, the bug has not
			// reappeared, but any lock-up with 100% cpu is likely due to
			// hitting this bug, again.
//			doc.text(txt, tx, ty, {lineBreak: false}); // lineBreak is broken; disable it.
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
		};

	return {
		alpha,
		box,
		circle,
		clear,
		clip,
		clipRect,
		clipReset,
		context,
		drawImage,
		drawPoly,
		drawRectangles,
		element,
		height,
		labels,
		makeColorGradient,
		scale,
		smoothing,
		text,
		textCentered,
		textCenteredPushRight,
		textRight,
		textWidth,
		translate,
		verticalTextRight,
		width
	};
};
