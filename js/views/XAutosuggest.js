/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena autosuggest, with UI/UX based on Material Design's full-width inputs. Light wrapper around
 * react-autosuggest package.
 *
 * All props with the exception of the state and actions specified below, are passed directly to Autosuggest.
 *
 * State
 * -----
 * value - Current selected value.
 *
 * Actions
 * -------
 * onClear - Called on click of clear (X) button.
 */

'use strict';

// Core dependencies, components
import React from 'react';
import Autosuggest from 'react-autosuggest';

// Styles
import autosuggestTheme from './AutosuggestTheme.module.css';
import compStyles from './XAutosuggest.module.css';

class XAutosuggest extends React.Component {
	callInputRef = autosuggest => {
		var {inputRef} = this.props;
		if (inputRef) {
			inputRef(autosuggest && autosuggest.input);
		}
	}

	render() {
		var {value, onClear, ...autoProps} = this.props;
		return (
			<div className={compStyles.XAutosuggest}>
				<Autosuggest {...autoProps} ref={this.callInputRef} theme={autosuggestTheme}/>
				{value ? <i className='material-icons' onClick={onClear}>close</i> : null}
			</div>
		);
	}
}

export default XAutosuggest;
