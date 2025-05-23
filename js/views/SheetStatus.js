/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena spreadsheet status indicator. Displays label with state and,
 * additional actions to delete state.
 *
 */


// Core dependencies, components
import {Box, Typography} from '@material-ui/core';
import React from 'react';

// App dependencies
import {xenaColor} from '../xenaColor';

// Styles
import classNames from 'classnames';

import compStyles from "./SheetStatus.module.css";

class SheetStatus extends React.Component {

	render() {
		var {className, disabled, label, sheetState, ...statusProps} = this.props;
		return (
			<Box
				className={classNames(className, compStyles.status, {[compStyles.disabled]: disabled}, {[compStyles.zoomAnimation]: sheetState !== 'None'})}
				bgcolor={xenaColor.BLACK_3}
				{...statusProps}>
				{label ? <Typography className={compStyles.label} variant='caption'>{label}</Typography> : null}
				<Typography className={compStyles.state} variant='caption'>{sheetState}</Typography>
			</Box>
		);
	}
}

export default SheetStatus;
