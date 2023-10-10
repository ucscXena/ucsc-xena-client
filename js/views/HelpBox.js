/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena help box, hand-rolled outside of RTB as we may require more than one help box (ie dialog) open
 * at a time, and we want to be able to control the overlay or lack thereof. RTB currently does not allow multiple
 * dialogs open at the same time, or theming to control overlay styles.
 *
 * There are two possible formats of help boxes.
 * 1. A help box positioned to the right of the item being highlighted. The help box is drawn with a triangle on the
 *   left-hand side of the help box dialog, and a dotted line is drawn from the left-hand side of the viewport to the
 *   triangle.
 * 2. A help box positioned below the item being highlighted. The help box is drawn with a triangle on the top side of
 *    dialog help box.
 *
 * State
 * -----
 * - w: Width of help box.
 * - o: Orientation of help box (to determine where to place/point help box triangle), 'Right' or 'Below'.
 *
 * Actions
 * -------
 * - onClose: Called when "GOT IT" button clicked to hide help box.
 *
 * Children should be in the format:
 * <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
 *
 * For example,
 * <HelpBox w={280} o={'Right'}><p>Each row contains data from a single sample.</p><p>Row order is determined by sorting the rows by their column values.</p></HelpBox>
 */


// Core dependencies, components
import {Button, Typography} from '@material-ui/core';
var React = require('react');
var classNames = require('classnames');

// Styles
var compStyles = require('./HelpBox.module.css');

// XXX move this comment
// Setup for help box displayed to right of item being highlighted (with row marker). 27.5 used in width calculations
// of marker comes from 16px margin (standard MD width) plus 11.5px for triangle. This smaller width creates the
// necessary break between the marker and the right triangle.

var boxStyle = {
	Right: compStyles.helpRight,
	Below: compStyles.helpBelow,
	Above: compStyles.helpAbove
};

// Setup for help box displayed below item being highlighted.
var Box = props => {
	var {w, o, children} = props;
	return (
		<div style={{width: w}} className={classNames(compStyles.HelpBox, boxStyle[o])}>
			{children}
		</div>
	);
};

class HelpBox extends React.Component {
	onClose = () => {
		this.props.onClose();
	};

	render() {
		var {children, ...boxProps} = this.props;
		return (
			<Box {...boxProps}>
				<Typography className={compStyles.helpBoxContent} color='textSecondary' component='div' variant='subtitle2'>
					{children}
				</Typography>
				<div className={compStyles.buttonContainer}>
					<Button onClick={this.onClose}>GOT IT</Button>
				</div>
			</Box>
		);
	}
}

module.exports = HelpBox;
