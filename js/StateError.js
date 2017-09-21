'use strict';

require('./StateError.css');
var React = require('react');
var Modal = require('react-bootstrap/lib/Modal');
var {deepPureRenderMixin} = require('./react-utils');

var StateError = React.createClass({
	mixins: [deepPureRenderMixin],

	render: function () {
		var {error, onHide} = this.props;
		return (
			<div className='StateErrorContainer'>
				<Modal autoFocus={false} enforceFocus={false} container={this} show={true} bsSize='large' className='kmDialog' onHide={onHide}>
					<Modal.Header closeButton className="container-fluid">
						<span className="col-md-2">
							<Modal.Title>Whoops...</Modal.Title>
						</span>
					</Modal.Header>
					<Modal.Body className="container-fluid">
						<p>We were unable to restore the view from your {error}, possibly due to software updates. Sorry about that!</p>
					</Modal.Body>
				</Modal>
			</div>
		);
	}
});

module.exports = StateError;
