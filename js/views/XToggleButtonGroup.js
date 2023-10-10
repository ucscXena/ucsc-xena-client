/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena toggle button group component, providing customization to the Mui ToggleButtonGroup component.
 */

// Core dependencies, components
import {ToggleButton, ToggleButtonGroup} from '@material-ui/lab';
import React, {useState} from 'react';

// Returns the selected toggle button.
var getSelectedToggleButtonAction = (toggleButtons, toggleValue) =>
	toggleButtons.find(({value}) => value === toggleValue)?.onToggle;

// Initializes the toggle button group with the selected toggle button value.
var initToggleButtonValue = (toggleButtons) => toggleButtons.find(({selected}) => selected).value;

export default function XToggleButtonGroup({className, toggleButtons}) {
	const [toggleValue, setToggleValue] = useState(initToggleButtonValue(toggleButtons));

	/**
	 * Callback fired when toggle button value changes.
	 * - Sets state toggleValue to selected value.
	 * - Executes onToggle action as defined by selected toggle button.
	 * @param mouseEvent - The event source of the callback.
	 * @param newToggleValue - The value of the selected toggle button.
	 * @param onToggleFn - The selected toggle button action.
	 */
	const onChangeToggleButton = (mouseEvent, newToggleValue, onToggleFn) => {
		if (newToggleValue) {
			setToggleValue(newToggleValue);
			onToggleFn && onToggleFn(newToggleValue);
		}
	};

	return (
		<ToggleButtonGroup
			className={className}
			exclusive
			onChange={(e, value) => onChangeToggleButton(e, value, getSelectedToggleButtonAction(toggleButtons, value))}
			value={toggleValue}>
			{toggleButtons.map(({value}) => (
				<ToggleButton key={value} value={value}>
					{value}
				</ToggleButton>
			))}
		</ToggleButtonGroup>
	);
};
