/*globals require: false, module: false */

'use strict';

var React = require('react');
var Col = require('react-bootstrap/lib/Col');
var Row = require('react-bootstrap/lib/Row');
var _ = require('./underscore_ext');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

function m() {
	return _.extend.apply(null, [{}].concat(_.filter(arguments, _.isObject)));
}

var styles = {
	tooltip: {
		padding: '4px 6px',
		position: 'fixed',
		overflow: 'hidden',
		textAlign: 'left',
		zIndex: 1,
		'top': 0,
		left: '50%',
		width: '25%',
		backgroundColor: 'white',
		fontSize: '0.8em'

	}
};

var rowLayout = (row, i) => (
		<Row key={i}>
			<Col md={9}>{row.label}</Col>
			<Col md={3}>{row.val}</Col>
		</Row>);

var sampleLayout = (row) => (
		<Row>
			<Col mdOffset={1} md={11}>{row.val}</Col>
		</Row>);


var Tooltip = React.createClass({
	mixins: [PureRenderMixin],
	render: function () {
		var {data, open} = this.props,
			rows = _.getIn(data, ['rows']),
			sampleID = _.getIn(data, ['sampleID']);

		var rowsOut = _.map(rows, rowLayout);
		var sample = sampleID ? sampleLayout({val: sampleID}) : null;
		var display = open ? 'block' : 'none';
		return (
			<div className='Tooltip' style={m(styles.tooltip, {display: display})}>
				{sample}
				{rowsOut}
			</div>
		);
	}
});

module.exports = Tooltip;

//define(['haml/tooltip.haml', 'haml/tooltipClose.haml', "jquery", "defer", 'underscore'
//	], function (template, closeTemplate, $, defer, _) {
//	'use strict';
//
//	$('body').append($("<div id='tooltip'></div>"));
//	var freezeText = '(alt-click to freeze)',
//		thawText = '(alt-click on map to unfreeze)',
//		$tooltip = $('#tooltip'),
//		frozen,
//		hiding = true,
//
//		position = function (el, my, at) {
//			$tooltip.position({my: my, at: at, of: window, collision: 'none none'});
//
//		},
//
//		hide = function () {
//			$tooltip.stop().fadeOut('fast');
//			hiding = true;
//		},
//
//		show = function () {
//			if ($tooltip.css('opacity') !== 1) {
//				$tooltip.css({'opacity': 1}).stop().fadeIn('fast');
//			}
//			hiding = false;
//		},
//
//		freeze = function (freeze, hideTip) {
//			frozen = freeze;
//			if (frozen) {
//				$tooltip.find('tr:first').append($(closeTemplate()));
//				$tooltip.addClass('frozen');
//				$('#tooltipPrompt').text(thawText);
//			} else {
//				$tooltip.find('tr:first').empty();
//				if (hideTip) { hide(); }
//				$tooltip.removeClass('frozen');
//				$('#tooltipPrompt').text(freezeText);
//			}
//		},
//
//		mousing = function (t) {
//			if (frozen) {
//				show();
//				return;
//			} else if (t.ev.type === 'mouseleave') {
//				hide();
//				return;
//			}
//			show();
//			position(t.el, t.my, t.at);
//			$tooltip.html(template({
//				sampleID: t.sampleID || null,
//				rows: t.rows,
//			}));
//			$('#tooltipPrompt').text(freezeText);
//		};
//
//	$tooltip.on('click', '#tooltipClose', function () {
//		freeze(false, true);
//	});
//
//	return {
//		'mousing': mousing,
//
//		hide: function () {
//			if (!frozen) {
//				hide();
//			}
//		},
//
//		frozen: function () {
//			return frozen;
//		},
//
//		toggleFreeze: function (ev) {
//			ev.stopPropagation();
//			if (!hiding) {
//				freeze(!frozen);
//				if (!frozen) {
//					hide();
//				}
//			}
//		}
//	};
//});
