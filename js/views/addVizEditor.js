/*globals require: false, module: false */
'use strict';
var React = require('react');
var VizSettings = require('../VizSettings');
// XXX move ColumnEdit2 to views?
var _ = require('../underscore_ext');

var vizSettingsState = ['defaultNormalization', 'vizSettings', 'fieldType'];
function vizSettingsSelector(appState, columnId) {
	return _.pick(_.getIn(appState, ['columns', columnId]), vizSettingsState);
}

function addVizEditor(Component) {
	return React.createClass({
		getInitialState() {
			return {
				openVizSettings: null
			};
		},
		onShowViz: function (id) {
			this.setState({openVizSettings: id});
		},
		onHideViz: function () {
			this.setState({openVizSettings: null});
		},
		render() {
			// XXX callback doesn't belong here. Fix VizSettings.
			// XXX appState?
			var {appState, callback, columnProps, ...otherProps} = this.props,
				compProps = _.assocIn(this.props,
					['columnProps', 'onViz'], this.onShowViz),
				{openVizSettings} = this.state;
			return (
				<Component {...compProps}>
					{this.props.children}
					{openVizSettings ?
						<VizSettings
							id={openVizSettings}
							onRequestHide={this.onHideViz}
							callback={callback}
							{...vizSettingsSelector(appState, openVizSettings)}/> :
						null}
				</Component>);
		}
	});
}

module.exports = addVizEditor;
