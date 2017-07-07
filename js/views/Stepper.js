/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Stepper component, displayed initially when user is in "set up" mode. Component displays label and completed
 * indicator for the three core steps required for Xena setup.
 *
 * View-only component, that is, there are no outputs or callbacks invoked from this component.
 *
 * Takes a single input, mode, which is used to highlight the step that is currently in progress. mode
 * can be one of "COHORT", "FIRST_COLUMN", "SECOND_COLUMN" or "DONE".
 *
 * Steps to the left of the active step are considered complete. Steps to the right of the active step are considered
 * to do.
 *
 * Displayed initially when user is in "set up" mode.
 */

'use strict';

// Core dependencies, components
var React = require('react');
import { AppBar as RTBAppBar } from 'react-toolbox/lib/app_bar';
var _ = require('../underscore_ext');

// Styles
require('./Stepper.css');

// Locals
var steps = [
	{label: "Select a Study to Explore"},
	{label: "Select Your First Variable"},
	{label: "Select Your Second Variable"}
];

var stateIndex = {
	"COHORT": 0,
	"FIRST_COLUMN": 1,
	"SECOND_COLUMN": 2
};

var Stepper = React.createClass({
	render() {
		let {mode} = this.props;
		let getClassName = (index) => {
			if (index < stateIndex[mode]) {
				return "completed";
			}
			if (index === stateIndex[mode]) {
				return "active";
			}
			return "";
		};
		return (
			<RTBAppBar>
				<ul className="Stepper">
					{_.map(steps, (step, index) =>
						<li className={getClassName(index)}>
							<div className="stepperCircle md-caption">{index + 1}</div>
							<div className="stepperText md-body-1">{step.label}</div>
						</li>)}
				</ul>
			</RTBAppBar>
		);
	}
});

module.exports = Stepper;
