import {createTheme} from '@material-ui/core';
import {xenaColor} from './xenaColor';

const theme = createTheme({
	palette: {
		action: {
			disabled: xenaColor.BLACK_12,
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
		MuiButton: {
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
					whiteSpace: 'normal', /* overriding whitespace from .Columns class */ /* TODO(cc) confirm required */
				},
			},
		},
		MuiCardHeader: {
			action: {
				alignSelf: 'center',
				display: 'flex',
				marginRight: 0,
				marginTop: 0,
			},
			avatar: {
				marginRight: 0,
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
		MuiCssBaseline: {
			'@global': {
				html: {
					fontSize: '62.5%',
					WebkitFontSmoothing: 'antialiased',
				},
				body: {
					fontSize: '1.6rem',
					fontWeight: 400,
				},
				a: {
					cursor: 'pointer', /* TODO(cc) check we want this - check Mui Link specification */
					fontWeight: 400,
					textDecoration: 'none',
					transition: 'border-bottom 0.35s',
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
				lineHeight: '18px',
				minWidth: 0,
				paddingLeft: 16,
			},
			root: {
				display: 'flex',
				marginLeft: undefined,
				marginRight: undefined,
				marginTop: 16,
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
				color: theme.palette.text.primary,
				lineHeight: undefined,
				padding: undefined,
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
					borderBottom: `1px solid ${xenaColor.BLACK_12}`,
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
		MuiLink: {
			root: {
				color: theme.palette.secondary.main,
				cursor: 'pointer',
				transition: 'color 0.35s',
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
			}
		},
		MuiPaper: {
			rounded: {
				borderRadius: 2,
			}
		},
		MuiRadio: {
			root: {
				color: xenaColor.BLACK_38,
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
		MuiButton: {
			color: 'secondary',
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
	},
});
