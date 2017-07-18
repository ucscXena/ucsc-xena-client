/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * React Toolbox theme, applied to top-level components. Uses component keys (eg RTAppBar) as specified by React Toolbox
 * docs (eg http://react-toolbox.com/#/components/app_bar) to globally apply themes.
 *
 * See https://github.com/react-toolbox/react-toolbox#customizing-all-instances-of-a-component-type for details.
 */

'use strict';

module.exports = {
	RTCheckbox: require('./views/XCheckboxGroupTheme.module.css'),
	RTRadio: require('./views/XRadioGroupTheme.module.css')
};
