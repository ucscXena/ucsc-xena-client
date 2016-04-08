/*global require: false, module: false */
'use strict';

var React = require('react');
var {Button, Modal} = require('react-bootstrap/lib');
var _ = require('./underscore_ext');
var uuid = require('./uuid');
require('./ColumnEdit.css');

var ColumnFilter = React.createClass({
	getInitialState: () => ({}),
	onSelect: function (dsID) {
		//var {callback, appState: {datasets}} = this.props,
		//	meta = _.get(datasets, dsID),
		//	hasGenes = _.get(meta, 'probeMap');
		//
		//this.setState({dataset: dsID, editor: {hasGenes, genes: hasGenes}});
		//callback(['edit-dataset', dsID, meta]);
	},
	render: function () {
		var {appState, callback, onHide} = this.props;

		return (
			<Modal onHide={onHide} show={true} className='columnEdit container'>
				<Modal.Header closeButton>
					<Modal.Title>Column Filter</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					Testing the filter...
				</Modal.Body>
			</Modal>
		);
	}
});

module.exports = ColumnFilter;
