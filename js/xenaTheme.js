import {createTheme} from '@material-ui/core';
import {xenaColor} from './xenaColor';
import XAutocompletePopper from './views/XAutocompletePopper';

const theme = createTheme({
	palette: {
		action: {
			disabled: xenaColor.BLACK_12,
		},
		error: {
			main: xenaColor.ERROR,
		},
		primary: {
			main: xenaColor.PRIMARY,
			contrastText: xenaColor.WHITE,
		},
		secondary: {
			main: xenaColor.ACCENT,
		},
		text: {
			disabled: xenaColor.BLACK_38,
			hint: xenaColor.BLACK_38,
			primary: xenaColor.BLACK_87,
			secondary: xenaColor.BLACK_54,
		},
		warning: {
			main: xenaColor.WARNING,
		},
	},
	spacing: 4,
	typography: {
		allVariants: {
			fontFamily: "'Roboto', sans-serif",
		},
		fontFamily: "'Roboto', sans-serif",
		h1: {
			fontSize: '3.400rem',
			fontWeight: 400,
			letterSpacing: 'normal',
			lineHeight: '4rem',
		},
		h2: {
			fontSize: '2.400rem',
			fontWeight: 400,
			letterSpacing: 'normal',
			lineHeight: '3.2rem',
		},
		h3: {
			fontSize: '2.000rem',
			fontWeight: 500,
			letterSpacing: '0.005em',
		},
		h4: {
			fontSize: '1.600rem',
			fontWeight: 400,
			letterSpacing: '0.010em',
			lineHeight: '2.4rem',
		},
		subtitle1: {
			fontSize: 20,
			fontWeight: 500,
			letterSpacing: '.005em',
			lineHeight: undefined,
		},
		subtitle2: {
			fontSize: 16,
			fontWeight: 400,
			letterSpacing: '.01em',
			lineHeight: '24px',
		},
		body1: {
			fontSize: 14,
			fontWeight: 400,
			letterSpacing: '.01em',
			lineHeight: '20px',
		},
		body2: {
			fontSize: 14,
			fontWeight: 500,
			letterSpacing: '.01em',
			lineHeight: '24px',
		},
		caption: {
			fontSize: 12,
			letterSpacing: '.02em',
			lineHeight: '16px',
		},
		overline: {
			fontSize: 10,
			fontWeight: 500,
			letterSpacing: '1.5px',
			lineHeight: '16px',
			textTransform: 'uppercase',
		},
	},
});

export const xenaTheme = createTheme(theme, {
	overrides: {
		MuiAppBar: {
			colorDefault: {
				backgroundColor: theme.palette.common.white,
				color: theme.palette.text.primary,
			},
		},
		MuiAutocomplete: {
			clearIndicator: {
				color: xenaColor.GRAY_DARKEST,
				marginRight: -4,
			},
			endAdornment: {
				right: '12px !important',
				top: '50%',
				transform: 'translateY(-50%)',
			},
			groupLabel: {
				...theme.typography.body2,
				color: theme.palette.text.primary,
				fontWeight: 600, // Mimics Roboto font weight 500 specification.
				padding: '12px 16px',
			},
			inputRoot: {
				padding: '0 !important',
				'&.Mui-error': {
					'& .MuiAutocomplete-popupIndicator': {
						color: theme.palette.error.main,
					},
				},
			},
			listbox: {
				maxHeight: 264, /* Displays max of 5.5 results, where each result is 48px tall */
				padding: 0,
			},
			option: {
				paddingBottom: 14,
				paddingTop: 14,
			},
			paper: {
				...theme.typography.body1,
				border: `1px solid ${xenaColor.GRAY_DARK}`,
				borderRadius: 4,
				boxShadow: '0 5px 5px 0 rgba(0, 0, 0, 0.2), 0 3px 14px 0 rgba(0, 0, 0, 0.12), 0 8px 10px 0 rgba(0, 0, 0, 0.14)',
				fontSize: 16,
				letterSpacing: 'normal',
				margin: '8px 0',
			},
			popupIndicator: {
				color: xenaColor.GRAY_DARKEST,
			},
			popupIndicatorOpen: {
				transform: 'none',
			},
		},
		MuiButton: {
			contained: {
				...theme.typography.body2,
				backgroundColor: xenaColor.GRAY_LIGHT,
				letterSpacing: '0.5px',
				padding: '0 12px',
				'&$disabled': {
					backgroundColor: xenaColor.GRAY_LIGHT,
					color: xenaColor.BLACK_26,
				},
				'&:hover': {
					backgroundColor: xenaColor.BLACK_12,
				},
			},
			containedSecondary: {
				color: xenaColor.WHITE,
				'&$disabled': {
					backgroundColor: xenaColor.GRAY_DARK,
					color: xenaColor.WHITE,
				},
			},
			root: {
				borderRadius: 2,
				fontWeight: 500,
				height: 36,
				minWidth: 90,
				whiteSpace: 'nowrap',
				'&$disabled': {
					color: xenaColor.BLACK_26,
				},
			},
			text: {
				...theme.typography.body2,
				letterSpacing: '0.5px',
				padding: '0 12px',
			},
			textSecondary: {
				backgroundColor: xenaColor.GRAY_LIGHT,
				'&:hover': {
					backgroundColor: 'rgba(76,201,192,.2)',
				},
			},
		},
		MuiButtonBase: {
			root: {
				fontFamily: theme.typography.fontFamily,
			},
		},
		MuiCard: {
			root: {
				overflow: 'visible',
			},
		},
		MuiCardActions: {
			root: {
				justifyContent: 'flex-end',
				padding: '16px 8px 8px',
				'& .MuiButton-text': {
					minWidth: 0,
					padding: '0 8px',
				},
			},
		},
		MuiCardContent: {
			root: {
				padding: '24px 16px',
				'& p': {
					...theme.typography.body1,
					letterSpacing: 0,
					margin: 0,
				},
			},
		},
		MuiCardHeader: {
			content: {
				minWidth: 0,
			},
			action: {
				alignSelf: 'center',
				display: 'flex',
				marginRight: 0,
				marginTop: 0,
			},
			avatar: {
				marginRight: 0,
				pointerEvents: 'none',
			},
			root: {
				padding: '8px 16px',
			},
			subheader: {
				...theme.typography.body2,
				color: xenaColor.BLACK_54,
				marginBottom: 0,
				marginTop: -4,
				'&.MuiTypography-colorError': {
					color: xenaColor.ERROR,
					fontSize: 12,
					lineHeight: '12px',
				},
			},
			title: {
				...theme.typography.body2,
				margin: 0,
			},
		},
		MuiCheckbox: {
			root: {
				color: xenaColor.BLACK_38,
				height: 18,
				padding: 0,
				width: 18,
				'& svg': {
					fontSize: 24,
				},
			},
		},
		MuiChip: {
			deleteIcon: {
				color: xenaColor.GRAY_DARKEST,
				fontSize: '20px !important',
				margin: 0,
			},
			label: {
				paddingLeft: 0,
				paddingRight: 0,
			},
			root: {
				...theme.typography.body1,
				backgroundColor: xenaColor.GRAY_AVATAR,
				color: theme.palette.common.black,
				gap: 8,
				letterSpacing: 'normal',
				minWidth: 0,
				padding: '6px 12px',
			},
		},
		MuiCssBaseline: {
			'@global': {
				html: {
					fontSize: '62.5%',
					WebkitFontSmoothing: 'antialiased',
				},
				body: {
					fontFamily: "'Roboto', sans-serif",
					fontSize: '1.6rem',
					fontWeight: 400,
				},
				'*, *:before, *:after': {
					border: 0,
					margin: 0,
					outline: 0,
					padding: 0,
					WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',
				},
				a: {
					cursor: 'pointer',
					fontWeight: 400,
					textDecoration: 'none',
					transition: 'border-bottom 0.35s',
					WebkitTransition: 'border-bottom 0.35s',
				},
				'h1, h2, h3, h4, h5, h6': {
					marginBottom: '1rem',
					marginTop: '1rem',
				},
				h1: {
					...theme.typography.h1,
				},
				h2: {
					...theme.typography.h2,
				},
				h3: {
					...theme.typography.h3,
				},
				h4: {
					...theme.typography.h4,
				},
				p: {
					fontSize: '1.600rem',
					fontWeight: 400,
					letterSpacing: '0.010em',
					lineHeight: '1.6em',
					margin: '0.8em 0 1.6em',
				},
				strong: {
					fontWeight: 500,
				},
				'h1, h2, h3, h4, h5, h6, label, p, button, abbr, a, span, small': {
					textSizeAdjust: '100%',
				},
				'input:not([type="checkbox"]):not([type="radio"]), button': {
					appearance: 'none',
					WebkitTouchCallout: 'none',
				},
				'input[required]:-moz-ui-invalid': {
					boxShadow: 'none', /* Remove firefox default style for required inputs */
				}
			},
		},
		MuiDialogActions: {
			root: {
				'& .MuiButton-text': {
					minWidth: 0,
					padding: '0 8px',
				},
			},
		},
		MuiDialogContentText: {
			root: {
				fontSize: 16,
				marginTop: 0,
			},
		},
		MuiDivider: {
			light: {
				backgroundColor: xenaColor.BLACK_6,
			},
			root: {
				backgroundColor: xenaColor.BLACK_12,
			},
		},
		MuiFormControlLabel: {
			label: {
				fontSize: 16,
				letterSpacing: 'normal',
				lineHeight: '24px',
				minWidth: 0,
				paddingLeft: 14,
			},
			root: {
				display: 'flex',
				marginLeft: undefined,
				marginRight: undefined,
				marginTop: 10,
				width: '100%',
			},
		},
		MuiFormHelperText: {
			root: {
				color: theme.palette.text.hint,
				marginTop: 0,
				overflow: 'hidden',
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap',
			},
		},
		MuiFormLabel: {
			root: {
				...theme.typography.subtitle2,
				color: theme.palette.text.hint,
				padding: undefined,
				'&$focused': {
					color: theme.palette.text.hint,
				},
			},
		},
		MuiIcon: {
			fontSizeSmall: {
				fontSize: 16,
			},
			root: {
				fontSize: 24,
			},
		},
		MuiIconButton: {
			colorInherit: {
				'&.Mui-disabled': {
					color: 'inherit',
					opacity: 0.54,
				},
			},
			edgeEnd: {
				marginRight: -6,
			},
			root: {
				color: xenaColor.BLACK_87,
				padding: 6,
				'&:hover': {
					backgroundColor: 'transparent',
				},
				'&$disabled': {
					color: theme.palette.action.disabled,
					cursor: 'default',
					pointerEvents: 'none',
				},
			},
			sizeSmall: {
				padding: 4,
				'&.MuiIconButton-edgeStart': {
					marginLeft: -4,
				},
			},
		},
		MuiInput: {
			root: {
				fontSize: theme.typography.subtitle2.fontSize,
				letterSpacing: theme.typography.subtitle2.letterSpacing,
				lineHeight: theme.typography.subtitle2.lineHeight,
			},
			underline: {
				'&:after': {
					borderBottom: 'none',
				},
				'&:before': {
					borderBottom: `1px solid ${xenaColor.BLACK_12}`,
				},
				'&:hover:not($disabled):before': {
					[theme.breakpoints.between('xs', 'xl')]: {
						borderBottom: `1px solid ${xenaColor.BLACK_12}`,
					},
				},
			},
		},
		MuiInputBase: {
			input: {
				height: 'unset',
				padding: '6px 0',
				textOverflow: 'ellipsis',
				'&::placeholder': {
					color: theme.palette.text.secondary,
					opacity: 1,
				},
			},
		},
		MuiInputLabel: {
			outlined: {
				transform: 'translate(14px, 50%) scale(1)',
			},
			root: {
				color: theme.palette.text.hint,
			},
		},
		MuiLink: {
			root: {
				color: theme.palette.secondary.main,
				cursor: 'pointer',
				transition: 'color 0.35s',
				WebkitTransition: 'color 0.35s',
				'&:hover': {
					color: xenaColor.PRIMARY_CONTRAST,
				},
			},
		},
		MuiListItem: {
			divider: {
				borderBottom: `1px solid ${xenaColor.BLACK_6}`,
			},
		},
		MuiMenuItem: {
			root: {
				fontSize: 16,
				paddingBottom: 0,
				paddingTop: 0,
				whiteSpace: 'normal',
				'&:hover': {
					backgroundColor: xenaColor.GRAY,
				},
				[theme.breakpoints.up('sm')]: {
					minHeight: undefined, /* Maintains min height specification at default 48px */
				},
			},
			dense: {
				...theme.typography.body1,
				display: 'block',
				lineHeight: '32px',
				overflow: 'hidden',
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap',
			},
		},
		MuiOutlinedInput: {
			input: {
				'&.Mui-disabled': {
					opacity: 0.38,
				},
				'&::placeholder': {
					color: xenaColor.GRAY_DARKEST,
					opacity: 1,
				},
			},
			inputAdornedEnd: {
				padding: '12px 48px 12px 12px !important',
			},
			root: {
				...theme.typography.subtitle2,
				borderColor: xenaColor.GRAY_DARKEST,
				borderRadius: 3,
				'&.Mui-error': {
					borderColor: theme.palette.error.main,
				},
				'&.Mui-focus': {
					borderColor: xenaColor.GRAY_DARKEST,
				},
				'& .MuiOutlinedInput-notchedOutline': {
					borderColor: 'inherit !important',
					borderWidth: '1px !important',
				},
			},
			notchedOutline: {
				borderColor: xenaColor.GRAY_DARKEST,
				borderRadius: 3,
			},
		},
		MuiPaper: {
			root: {
				transition: undefined,
			},
			rounded: {
				borderRadius: 2,
			},
		},
		MuiRadio: {
			root: {
				color: xenaColor.GRAY_DARKEST,
				height: 20,
				padding: 0,
				width: 20,
				'& svg': {
					fontSize: 24,
				},
			},
		},
		MuiSelect: {
			icon: {
				color: theme.palette.text.hint,
				fontSize: 24,
			},
			select: {
				'&:focus': {
					backgroundColor: undefined,
				},
			}
		},
		MuiStep: {
			horizontal: {
				paddingLeft: 0,
				paddingRight: 0,
			},
		},
		MuiStepIcon: {
			root: {
				color: xenaColor.BLACK_38,
				fontSize: 24,
				'&$active': {
					color: theme.palette.secondary.main,
				},
				'&$completed': {
					color: theme.palette.secondary.main,
				},
			},
		},
		MuiStepLabel: {
			label: {
				color: theme.palette.text.hint,
				fontWeight: theme.typography.body1.fontWeight,
				'&$active': {
					fontWeight: theme.typography.body1.fontWeight,
				},
				'&$completed': {
					color: theme.palette.text.hint,
					fontWeight: theme.typography.body1.fontWeight,
				}
			},
		},
		MuiStepper: {
			root: {
				padding: 0,
				width: '100%',
			},
		},
		MuiSvgIcon: {
			fontSizeLarge: {
				fontSize: 24,
			},
		},
		MuiToggleButton: {
			root: {
				...theme.typography.subtitle2,
				backgroundColor: 'inherit',
				border: 'none',
				borderRadius: 4,
				color: theme.palette.text.secondary,
				flex: 1,
				letterSpacing: 'normal',
				padding: '6px 12px',
				textTransform: 'capitalize',
				'&:hover': {
					backgroundColor: xenaColor.GRAY_LIGHT,
				},
				'&.Mui-selected': {
					backgroundColor: theme.palette.common.white,
					color: theme.palette.text.primary,
					'&&:hover': {
						backgroundColor: theme.palette.common.white,
					},
				},
			},
		},
		MuiToggleButtonGroup: {
			grouped: {
				border: 'none !important', // Overrides 'grouped' css selector specificity.
				borderRadius: '4px !important', // Overrides 'grouped' css selector specificity.
				margin: '0 !important', // Overrides 'grouped' css selector specificity.
			},
			root: {
				backgroundColor: xenaColor.GRAY_DARK,
				borderRadius: 6,
				display: 'grid',
				gridAutoColumns: '1fr',
				gridAutoFlow: 'column',
				padding: 2,
			},
		},
		MuiTooltip: {
			tooltip: {
				borderRadius: 2,
				fontSize: 10,
				lineHeight: '14px',
				padding: '4px 6px',
			}
		},
		MuiTypography: {
			colorError: {
				color: xenaColor.ERROR,
			},
			root: {
				margin: undefined,
			},
		},
	},
	props: {
		MuiAppBar: {
			color: 'default',
			elevation: 0,
			position: 'relative',
		},
		MuiAutocomplete: {
			autoHighlight: true,
			blurOnSelect: true,
			fullWidth: true,
			openOnFocus: true,
			PopperComponent: XAutocompletePopper,
		},
		MuiButton: {
			color: 'secondary',
			disableRipple: true,
			disableTouchRipple: true,
		},
		MuiIconButton: {
			disableRipple: true,
		},
		MuiLink: {
			underline: 'none',
		},
		MuiMenu: {
			elevation: 2,
		},
		MuiToggleButton: {
			disableRipple: true,
		},
	},
});
