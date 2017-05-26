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
		var style = {textAlign: 'center'},
			labels = this.labelCtx.map(([x, y, w, h, c, f, t]) => (
				<div className='ColumnLabels'
					style={{
						left: x,
						top: y,
						width: w,
						color: c,
						lineHeight: `${1.2 * f}px`,
						fontSize: `${f}px`,
						// XXX set height to an integer multiple of line height, to avoid
						// partial lines?
						height: h}}>

					<p className='ColumnLabel'>
						{'' + t}
					</p>
				</div>));
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
