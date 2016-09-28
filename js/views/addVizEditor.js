/*globals require: false, module: false */
'use strict';
var React = require('react');
var VizSettings = require('./VizSettings');
// XXX move ColumnEdit2 to views?
var _ = require('../underscore_ext');

var vizSettingsState = ['defaultNormalization', 'colorClass', 'vizSettings', 'valueType'];
function vizSettingsSelector(appState, columnId) {
	return _.pick(_.getIn(appState, ['columns', columnId]), vizSettingsState);
}

function addVizEditor(Component) {
	return React.createClass({
		displayName: 'SpreadsheetVizSettings',
		onHideViz: function () {
			this.props.onOpenVizSettings(null);
		},
		render() {
			// XXX appState?
			var {onVizSettings, ...componentProps} = this.props,
				{appState} = componentProps,
				{openVizSettings} = appState;
			return (
				<Component {...componentProps}>
					{this.props.children}
					{openVizSettings ?
						<VizSettings
							id={openVizSettings}
							onRequestHide={this.onHideViz}
							onVizSettings={onVizSettings}
							{...vizSettingsSelector(appState, openVizSettings)}/> :
						null}
				</Component>);
		}
	});
}

module.exports = addVizEditor;
