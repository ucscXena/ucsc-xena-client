import {createTheme} from '@material-ui/core';
import {xenaColor} from './xenaColor';

const theme = createTheme({
	palette: {
		primary: {
			main: xenaColor.PRIMARY,
			contrastText: xenaColor.WHITE,
		},
		secondary: {
			main: xenaColor.ACCENT,
		},
		text: {
			primary: xenaColor.BLACK_87,
		},
	},
	spacing: 4,
	typography: {
		allVariants: {
			color: xenaColor.BLACK_87,
			fontFamily: "'Roboto', sans-serif",
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
			MuiIcon: {
				root: {
					fontSize: 16,
					height: 16,
					width: 16,
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
					padding: '4px 6px',
				}
			},
		},
		props: {
			MuiLink: {
				underline: 'none',
			}
		}
	}, theme
);

export default xenaTheme;
