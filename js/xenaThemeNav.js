import {createTheme} from '@material-ui/core';
import {xenaTheme} from "./xenaTheme";

export const xenaNavTheme = createTheme(xenaTheme, {
	overrides: {
		MuiButton: {
			text: {
				...xenaTheme.typography.body1,
			},
			textSecondary: {
				backgroundColor: 'transparent',
				'&:hover': {
					backgroundColor: 'rgba(76,201,192,0.04)',
				},
			},
		},
		MuiDivider: {
			root: {
				margin: '12px 0',
			},
		},
	},
});
