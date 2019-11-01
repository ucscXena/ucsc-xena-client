var React = require('react');
var VizSettings = require('../views/VizSettings');
var _ = require('../underscore_ext');

var vizSettingsState = ['defaultNormalization', 'colorClass', 'vizSettings', 'valueType', 'fieldType'];
function vizSettingsSelector(appState, columnId) {
	return _.pick(_.getIn(appState, ['columns', columnId]), vizSettingsState);
}

function addVizEditor(Component) {
	return class extends React.Component {
	    static displayName = 'SpreadsheetVizSettings';

	    onHideViz = () => {
			this.props.onOpenVizSettings(null);
		};

	    render() {
			// XXX appState?

			var {onVizSettings, ...componentProps} = this.props,
				{appState} = componentProps,
				{openVizSettings} = appState,
				data = appState.data[openVizSettings],
				column = appState.columns[openVizSettings],
				units = appState.columns[openVizSettings] && appState.columns[openVizSettings].units;

			return (
				<Component {...componentProps}>
					{this.props.children}
					{openVizSettings ?
						<VizSettings
							id={openVizSettings}
							onRequestHide={this.onHideViz}
							onVizSettings={onVizSettings}
							data={data}
							column={column}
							units={units}
							{...vizSettingsSelector(appState, openVizSettings)}/> :
						null}
				</Component>);
		}
	};
}

module.exports = addVizEditor;
