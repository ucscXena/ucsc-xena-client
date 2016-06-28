/*globals require: false, module: false */
'use strict';
var React = require('react');
// XXX move ColumnEdit2 to views?
var ColumnEdit = require('../ColumnEdit2');
var Button = require('react-bootstrap/lib/Button');

function addColumnAddButton(Component) {
	return React.createClass({
		displayName: 'SpreadsheetColumnAdd',
		getInitialState() {
			return {
				openColumnEdit: !this.props.appState.cohort[0] && !this.props.appState.loadPending,
			};
		},
		componentWillReceiveProps: function(newProps) {
			if (!this.state.openColumnEdit && !newProps.appState.cohort[0]) {
				this.setState({openColumnEdit: true});
			}
		},
		onShow() {
			this.setState({openColumnEdit: true});
		},
		onHide() {
			this.setState({openColumnEdit: false});
		},
		render() {
			// XXX appState?
			var {appState} = this.props,
				{cohort, zoom: {height}} = appState,
				{openColumnEdit} = this.state;
			return (
				<Component {...this.props}>
					{this.props.children}
					<div style={{height: height}}
						className='addColumn Column'>

						{cohort ?
							<Button
								bsStyle= "primary"
								onClick={this.onShow}
								className='Column-add-button'
								title='Add a column'>
								+ Data
							</Button> : null}
					</div>
					{openColumnEdit ?
						<ColumnEdit
							{...this.props}
							onHide={this.onHide}/> : null}
				</Component>);
		}
	});
}

module.exports = addColumnAddButton;
