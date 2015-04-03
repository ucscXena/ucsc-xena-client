/*global require: false, module: false */
'use strict';
var _ = require('underscore_ext');
var L = require('./lenses/lens');
var Rx = require('rx.ext');

function propsStream(comp) {
	var methods = {
		render: function () {
			this.propsStream.onNext(L.view(this.props.lens));
			return comp.render.call(this);
		},
		componentWillMount: function () {
			this.propsStream = new Rx.Subject();
			comp.componentWillMount.call(this);
		},
		componentWillUnMount: function () {
			this.propsStream.onCompleted();
			comp.componentWillUnMount.call(this);
		}
	};
	return _.extend({}, comp, methods);
}

module.exports = {
    propsStream: propsStream
};
