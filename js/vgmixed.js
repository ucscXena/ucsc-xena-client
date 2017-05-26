"use strict";

// This is a mixed-mode vg renderer, using canvas for paint directives, and DOM
// for labels. It is *very* simplistic, and doesn't expose a coherent interface,
// due to the complexity, and lack of need for something so sophisticated.
//
// In particular, it makes the following assumptions:
// vg.textCenteredPushRight is never called following translate or scale. I.e. units
//   are relative to the canvas target.
// vg.clip is only used for clipping text, and here is redundant due to clipping of
//   the label itself, via overflow 'hidden'.
//
// We introduce a new 'labels' call that allocates a context for a set of textCenteredPushRight
// calls, and render via React when the context exits.
var vgcanvas = require('./vgcanvas');
var React = require('react');
var ReactDOM = require('react-dom');

module.exports = (el, vgw, vgh, labelEl) => ({
	...vgcanvas(el, vgw, vgh),
	clip(x, y, width, height, cb) {
		cb();
	},
	labels(cb) {
		this.labelCtx = [];
		cb();
		// Below, we set 'hyphens' to 'none' if there's no room for a 2nd line, so we can fit more
		// of the text on-screen (instead of hyphenating & wrapping to the 2nd line that we can't see).
		//
		// Also, we clip the height to an integer multiple of lineHeight, so we don't, for example, render
		// the top pixel of the 2nd line, which looks distracting.
		var style = {textAlign: 'center'},
			labels = this.labelCtx.map(([left, top, width, h, color, f, txt]) => {
				var lineHeight = 1.2 * f,
					hyphens = h < 2 * lineHeight ? 'none' : 'auto', // Don't hyphenate on a single line
					height = Math.floor(h / lineHeight) * lineHeight; // Render integer number of lines
				return (
					<div className='ColumnLabels'
						style={{
							left,
							top,
							width,
							color,
							lineHeight: `${lineHeight}px`,
							fontSize: `${f}px`,
							// XXX set height to an integer multiple of line height, to avoid
							// partial lines?
							height}}>

						<p className='ColumnLabel' style={{width, hyphens}}>
							{'' + txt}
						</p>
					</div>);
			});
		ReactDOM.render(<div style={style}>{labels}</div>, labelEl);
		this.labelCtx = undefined;
	},
	textCenteredPushRight(...args) {
		if (this.labelCtx === undefined) {
			console.trace('textCenteredPushRight');
			return;
		}
		this.labelCtx.push(args);
	}
});
