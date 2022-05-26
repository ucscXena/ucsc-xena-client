/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena checkbox group, with UI/UX based on Material Design's full-width inputs.
 *
 * State
 * -----
 * label - checkbox group field name.
 * additionalAction - display text of additional action.
 * options - array of checkbox option objects in format, {label?, options: [{label, value}]}. If top-level label is
 *           specified, nested options array is grouped under that label (for advanced view functionality).
 *
 * Actions
 * -------
 * onAdditionalAction - called when additional action link is clicked.
 * onChange - called when a checkbox value is changed.
 */


// Core dependencies, components
import {
	Box,
	Checkbox,
	Divider,
	FormControlLabel,
	FormGroup,
	FormLabel,
	Typography
} from '@material-ui/core';
import PureComponent from '../PureComponent';

var React = require('react');

var _ = require('../underscore_ext').default;
import {xenaColor} from '../xenaColor';
import XFormControl from './XFormControl';
var XInputToolbar = require('./XInputToolbar');

// Styles
var sxAssembly = {
	display: 'block',
	fontSize: 11,
	fontWeight: 500,
	marginTop: -4,
};
var sxControlLabel = {
	textOverflow: 'ellipsis',
	overflow: 'hidden',
	whiteSpace: 'nowrap',
	'&:hover': {
		overflow: 'visible',
	},
};
var sxFormLabel = {
	'&.MuiFormLabel-root': {
		color: xenaColor.BLACK_87,
		display: 'block',
		fontSize: 14,
		lineHeight: '20px',
		overflow: 'hidden',
		padding: '32px 0 8px 0',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		width: '100%', /* required for ellipsis */
		'&.Mui-focused': {
			color: xenaColor.BLACK_87,
		},
		'&:hover': {
			overflow: 'visible',
		},
		'&:first-of-type': {
			paddingTop: 8,
		},
	}
};

class XCheckboxGroup extends PureComponent {
	onChange = (ev, isOn) => {
		var value = ev.target.value;
		this.props.onChange(value, isOn);
	};

	/**
	 * Returns form control label with associated assembly badge (if badge is not hidden).
	 * @param label
	 * @param badge
	 * @param hideBadge
	 * @returns {JSX.Element}
	 */
	renderFormControlLabel = (label, badge, hideBadge) => {
		const showBadge = !hideBadge && badge;
		return (
			<Box sx={{marginBottom: showBadge ? -12 : undefined}}>
				<Box component='span' display='block' sx={sxControlLabel}>{label}</Box>
				{showBadge &&
				<Typography variant='caption'>
					<Box component='span' sx={{...sxAssembly, ...badge.style}}>{badge.label}</Box>
				</Typography>}
			</Box>
		);
	}

	render() {
		var {additionalAction, label, onAdditionalAction, options, hideBadge} = this.props;
		return (
			<>
			<XFormControl>
				<XInputToolbar label={label} additionalAction={additionalAction} onAdditionalAction={onAdditionalAction}/>
				<FormGroup>
					{_.map(options, group => [
						group.label ?
							<React.Fragment key={group.label}>
								<Box component={FormLabel} sx={sxFormLabel}>
									<Box fontWeight={700}>{group.label}</Box>
								</Box>
								<Divider light/>
							</React.Fragment> : null,
						_.map(group.options, o => (
						<FormControlLabel
								control={<Checkbox checked={o.checked || false} onChange={this.onChange} value={o.value}/>}
								key={o.label}
								label={this.renderFormControlLabel(o.label, o.badge, hideBadge)}/>))
					])}
				</FormGroup>
			</XFormControl>
			<Divider/>
			</>
		);
	}
}

module.exports = XCheckboxGroup;
