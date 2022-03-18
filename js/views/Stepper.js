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


// Core dependencies, components
import {AppBar, Box, Step, StepConnector, StepLabel, Stepper as MuiStepper} from '@material-ui/core';
var React = require('react');
var _ = require('../underscore_ext').default;
import {xenaColor} from '../xenaColor';

// Styles
var sxStepperBar = {
	alignItems: 'center',
	borderBottom: `1px solid ${xenaColor.BLACK_12}`,
	display: 'flex',
	height: 64,
	padding: '0 24px',
};

class Stepper extends React.Component {
	render() {
		const { steps, stateIndex, mode, wideStep } = this.props;
		return (
			<AppBar>
				<Box sx={sxStepperBar}>
					<MuiStepper activeStep={stateIndex[mode]} connector={null}>
						{_.map(steps, (step, index) =>
							<Box component={Step} key={index} sx={{width: wideStep ? '33%' : '25%'}}>
								<StepLabel>{step.label}</StepLabel>
								<StepConnector/>
							</Box>)}
					</MuiStepper>
				</Box>
			</AppBar>
		);
	}
}

export {Stepper};
