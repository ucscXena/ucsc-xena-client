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

/*
 * Unfortunate behaviors of react-autosuggest
 * ghost suggestions
 *   https://github.com/moroshko/react-autosuggest/issues/596
 * escape clears input
 *   This is part of ARIA specification, but react-autosuggest implements it
 *   at variance with the spec (an editable autosuggest should clear the
 *   suggested text, not all text), and in practice the prescribed AIRA
 *   behavior is not usable, because escape also closes suggestions, making
 *   it very common to lose input accidentally.
 *
 */



// Core dependencies, components
import {Box, Icon, IconButton} from '@material-ui/core';
import React from 'react';
import Autosuggest from 'react-autosuggest';
import {xenaColor} from '../xenaColor';

// Styles
import autosuggestTheme from './AutosuggestTheme.module.css';
import compStyles from './XAutosuggest.module.css';
var sxClearButton = {
	color: xenaColor.BLACK_38,
	position: 'absolute',
	right: 10,
	top: '50%',
	transform: 'translateY(-50%)'
};

class XAutosuggest extends React.Component {
	callInputRef = autosuggest => {
		var {inputRef, autosuggestRef} = this.props;
		if (inputRef) {
			inputRef(autosuggest && autosuggest.input);
		}
		if (autosuggestRef) {
			autosuggestRef(autosuggest);
		}
	}

	render() {
		var {value, onClear, ...autoProps} = this.props;
		return (
			<div className={compStyles.XAutosuggest}>
				<Autosuggest {...autoProps} ref={this.callInputRef} theme={autosuggestTheme}/>
				{value ? <Box component={IconButton} color='inherit' onClick={onClear} sx={sxClearButton}><Icon>close</Icon></Box> : null}
			</div>
		);
	}
}

export default XAutosuggest;
