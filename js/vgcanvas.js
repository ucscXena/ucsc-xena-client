/*eslint-env browser */
/*global require: false, module: false  */

"use strict";

var _ = require('./underscore_ext');

var style = function (c) {
	if (_.isArray(c)) {
		return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
	}
	return c;
};

// The browsers want to smooth our images, which messes them up. We avoid
// certain scaling operations to prevent this.
// If there are more values than pixels, draw at one-pixel-per-value
// to avoid sub-pixel aliasing, then scale down to the final size with
// drawImage(). If there are more pixels than values, draw at an integer
// scale per-value, giving us an image larger than the final size, then scale
// down to avoid blurring.
// We can ditch this complexity when all the browsers allow us to disable
// smoothing.
// index & count are floating point.
function pickScale(index, count, height) {
	var first = Math.floor(index),
		last  = Math.ceil(index + count),
		length = last - first,
		scale = (height >= length) ? Math.ceil(height / length) : 1,
		scaledHeight = length * scale || 1, // need min 1 px to draw gray when no data
		sy =  (index - first) * scale,
		sh = scale * count;

	return {
		scale,              // chosen scale that avoids blurring
		height: scaledHeight,
		sy,                 // pixels off-screen at top of buffer
		sh                  // pixels on-screen in buffer
	};
}

var scratch;

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

		drawPoly = function (pts, color, fill) {
			ctx.beginPath();
			ctx.fillStyle = style(color);
			ctx.moveTo(pts[0][0], pts[0][1]);
			_(pts.slice(1)).each(function (p) { ctx.lineTo(p[0], p[1]); });
			ctx.closePath();
			if (fill) {
				ctx.fill();
			} else {
				ctx.stroke();
			}
		},

		// See comment above pickScale. This method draws a view over
		// rows, avoiding blurring. The view is defined by the index
		// and count, which can be floating-point, e.g. show 3.5 rows,
		// starting at row 1.3, or index = 1.3, count = 3.5.
		// height and width are the size of the viewport.
		// drawBackground should take a width and height, rendering a
		// background color.
		// drawRows takes a row width and row height, and draws all rows.
		drawSharpRows = function (vg, index, count, height,
					width, drawBackground, drawRows) {

			var s = pickScale(index, count, height);
			scratch.height(s.height);
			drawBackground(scratch, 1, s.height);
			// width of row. height of row.
			scratch.scale(1, s.scale, () => drawRows(scratch, 1, 1));
			vg.drawImage(scratch.element(), 0, s.sy, 1, s.sh, 0, 0, width, height);
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
		drawSharpRows
	};
};

scratch = vgcanvas(document.createElement('canvas'), 1, 1); // scratch buffer

module.exports = vgcanvas;
