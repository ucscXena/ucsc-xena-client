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
			lineHeight: 1.15,
		},
		subtitle1: {
			fontSize: 20,
			fontWeight: 500,
			letterSpacing: '.005em',
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
		caption: {
			fontSize: 12,
			letterSpacing: '.02em',
			lineHeight: '16px',
		},
	},
});

const xenaTheme = createTheme({
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
				whiteSpace: 'nowrap',
			},
		},
		MuiDivider: {
			root: {
				backgroundColor: xenaColor.GRAY,
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
		MuiIcon: {
			fontSizeLarge: {
				fontSize: 24,
				height: 24,
				width: 24,
			},
			root: {
				fontSize: 16,
				height: 16,
				width: 16,
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
				WebkitFontSmoothing: 'antialiased', // TODO(cc) review
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
			root: {
				WebkitFontSmoothing: 'antialiased',
			},
		},
		MuiMenuItem: {
			root: {
				fontSize: 16,
				paddingBottom: 0,
				paddingTop: 0,
				WebkitFontSmoothing: 'antialiased',
				'&:hover': {
					backgroundColor: xenaColor.GRAY,
				},
				[theme.breakpoints.up('sm')]: {
					minHeight: undefined, /* Maintains min height specification at default 48px */
				},
			},
			dense: {
				display: 'block',
				fontSize: theme.typography.body1.fontSize,
				letterSpacing: theme.typography.body1.letterSpacing,
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
		MuiTooltip: {
			tooltip: {
				borderRadius: 2,
				fontSize: 10,
				lineHeight: '14px',
				maxWidth: 200,
				padding: '4px 6px',
			}
		},
	},
	props: {
		MuiAppBar: {
			elevation: 0,
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
}, theme);

export default xenaTheme;
