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
var classNames = require('classnames');
var React = require('react');
import {AppBar as RTBAppBar} from 'react-toolbox/lib/app_bar';
var _ = require('../underscore_ext');

// Styles
var compStyles = require('./Stepper.module.css');

class Stepper extends React.Component {
	render() {
		const { steps, stateIndex, mode, flat, wideStep } = this.props;

		let getStepClassName = (index) => {
			return classNames({
				[compStyles.step]: true,
				[compStyles.wideStep]: wideStep,
				[compStyles.completed]: index < stateIndex[mode],
				[compStyles.active]: index === stateIndex[mode]
			});
		};
		return (
			<RTBAppBar flat={flat}>
				<ul className={compStyles.Stepper}>
					{_.map(steps, (step, index) =>
						<li className={getStepClassName(index)} key={index}>
							<div className={compStyles.stepperCircle}>{index + 1}</div>
							<div className={compStyles.stepperText}>{step.label}</div>
						</li>)}
				</ul>
			</RTBAppBar>
		);
	}
}

module.exports = { Stepper };
