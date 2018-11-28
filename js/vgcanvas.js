"use strict";

var _ = require('./underscore_ext');

var style = function (c) {
	if (_.isArray(c)) {
		return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
	}
	return c;
};

function vgcanvas(el, vgw, vgh) {
	var fontFamily = 'Verdana,Arial,sans-serif',
		ctx = el.getContext('2d'),
		currentFont,

		// setting font is expensive, so cache it.
		setfont = function (font) {
			if (font !== currentFont) {
				currentFont = font;
				ctx.font = font;
			}
		},

		scale = function (x, y, cb) {
			ctx.save();
			ctx.scale(x, y);
			cb.apply(this);
			ctx.restore();
		},

		translate = function (x, y, cb) {
			ctx.save();
			ctx.translate(x, y);
			cb.apply(this);
			ctx.restore();
		},

		alpha = function (a, fn) {
			var old = a;
			ctx.globalAlpha = a;
			fn.call(this);
			ctx.globalAlpha = old;
		},

		box = function (x, y, w, h, c) {
			ctx.fillStyle = style(c);
			ctx.fillRect(x, y, w, h);
		},

		clear = function (x, y, w, h) {
			ctx.clearRect(x, y, w, h);
		},

		circle = function (x, y, r, c, noFill) {
			ctx.beginPath();
			ctx.arc(x, y, r, 0, 2 * Math.PI);
			if (noFill) {
				ctx.strokeStyle = c;
				ctx.stroke();
			} else {
				ctx.fillStyle = c;
				ctx.fill();
			}
		},

		clipRect = function (x, y, w, h) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(x, y, w, h);
			ctx.clip();
		},

		clipReset = function () {
			ctx.restore();
		},

		clip = function (x, y, w, h, fn) {
			clipRect(x, y, w, h);
			fn.apply(this);
			clipReset();
		},

		dashedLine = function(x, y, mtx, mty, c) {
			ctx.setLineDash([2, 2, 4, 4]);
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(mtx, mty);
			ctx.strokeStyle = c;
			ctx.stroke();
			ctx.setLineDash([]);
		},

		width = function (w) {
			if (_.isNumber(w)) {
				el.width = w;
				// Resizing loses the font setting
				ctx.font = currentFont;
			}
			return el.width;
		},

		height = function (h) {
			if (_.isNumber(h)) {
				el.height = h;
				// Resizing loses the font setting
				ctx.font = currentFont;
			}
			return el.height;
		},

		element = function () {
			return el;
		},

		context = function () {
			return ctx;
		},

		text = function (x, y, c, font, txt) {
			setfont(font + "px " + fontFamily);
			ctx.fillStyle = style(c);
			ctx.fillText(txt, x, y);
		},

		textWidth = function (font, txt) {
			setfont(font + "px " + fontFamily);
			return ctx.measureText(txt).width;
		},

		textCentered = function (x, y, w, h, c, fontHeight, txt) {
			var th = fontHeight,
				tw = textWidth(fontHeight, txt),
				tx = x + w / 2 - tw / 2,
				ty = y + h / 2 + th / 2;
			setfont(fontHeight + "px " + fontFamily);
			ctx.fillStyle = style(c);
			ctx.fillText(txt, tx, ty);
		},

		// Center text if there's room. If the box is too narrow, push
		// right so the left-most (first) characters are visible.
		textCenteredPushRight = function (x, y, w, h, c, fontHeight, txt) {
			var th = fontHeight,
				tw = textWidth(fontHeight, txt),
				tx = Math.max(x, x + w / 2 - tw / 2),
				ty = y + h / 2 + th / 2;
			setfont(fontHeight + "px " + fontFamily);
			ctx.fillStyle = style(c);
			ctx.fillText(txt, tx, ty);
		},

		textRight = function (x, y, width, height, c, fHeight, txt) {
			var fWidth, xoff, yoff;
			fWidth = textWidth(fHeight, txt);
			xoff = x + width - fWidth - 1;
			yoff = y + (height + fHeight) / 2 - 1;
			text(xoff, yoff, c, fHeight, txt);
		},

		cutLine = function (text, font, width) {
			var words = text.split(' ');
			return _(words).reduce(function (acc, w) {
				var line = acc[acc.length - 1];
				if (line && textWidth(font, line + " " + w) < width) {
					acc[acc.length - 1] += " " + w;
				} else {
					acc.push(w);
				}
				return acc;
			}, []);
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
			var lines = cutLine(txt, font, height),
				H = width, // available height
				h = font,  // font height
				s = Math.ceil(0.2 * font),
				maxLines = (height + s) / (font + s), // n*f+(n-1)*s=t, n=(t+s)/(f+s)
				n = Math.min(lines.length, maxLines),
				off = Math.round((H - (n * h + n * s - s)) / 2);
			if (testOverflow) {
				return (off < 0);
			}
			ctx.save();
			ctx.translate(x, y + height);
			ctx.rotate(-Math.PI / 2);
			_(lines).each(function (line, i) {
				text(height - textWidth(font, line) - 1, off + i * h + h + i * s - s, c, font, line);
			});
			ctx.restore();
		},

		makeRange = function (start, end, count) {
			var d = (end - start) / (count - 1);
			return _(0).chain()
				.range(count)
				.map(function (i) { return Math.round(start + d * i); })
				.value();
		},

		makeColorGradient = function (start, end, count) {
			var r = makeRange(start[0], end[0], count),
				g = makeRange(start[1], end[1], count),
				b = makeRange(start[2], end[2], count);
			return _.zip(r, g, b);
		},

		drawImage = function (/* c, sx, sy, sw, sh, dx, dy, dw, dh */) {
			ctx.drawImage.apply(ctx, arguments);
		},

		smoothing = function (s) {
			ctx.imageSmoothingEnabled = s;
			ctx.mozImageSmoothingEnabled = s;
			ctx.webkitImageSmoothingEnabled = s;
		},

		// This needs to be performant on large arrays.
		drawPoly = function (pts, {fillStyle, strokeStyle, lineWidth}) {
			ctx.beginPath();

			pts.forEach(([mtx, mty, ltx, lty]) => {
				ctx.moveTo(mtx, mty);
				ctx.lineTo(ltx, lty);
			});

			if (fillStyle) {
				ctx.fillStyle = style(fillStyle);
				ctx.fill();
			}
			if (strokeStyle) {
				ctx.lineWidth = lineWidth;
				ctx.strokeStyle = style(strokeStyle);
				ctx.stroke();
			}
		},

		drawRectangles = function (rects, {fillStyle, strokeStyle, lineWidth}) {
			ctx.beginPath();
			rects.forEach(([x, y, w, h]) => ctx.rect(x, y, w, h));

			if (fillStyle) {
				ctx.fillStyle = style(fillStyle);
				ctx.fill();
			}
			if (strokeStyle) {
				ctx.lineWidth = lineWidth;
				ctx.strokeStyle = style(strokeStyle);
				ctx.stroke();
			}
		};


	el.width = vgw;
	el.height = vgh;

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
		dashedLine,
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
		drawRectangles
	};
};

module.exports = vgcanvas;
