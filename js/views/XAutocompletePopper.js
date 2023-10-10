/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Xena autocomplete popper component.
 */

// Core dependencies, components
import {Popper} from '@material-ui/core';
import React from 'react';

const popperModifiers =
	{
		flip: {
			enabled: false,
		},
		preventOverflow: {
			enabled: false,
			boundariesElement: 'scrollParent',
		},
		arrow: {
			enabled: false,
		},
	};

export default function XAutocompletePopper({...props}) {
	return (
		<Popper modifiers={popperModifiers} placement="bottom" {...props}/>
	);
}
