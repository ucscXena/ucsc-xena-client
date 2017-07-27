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
	RTAppBar: require('./views/RTAppBarTheme.module.css'),
	RTCheckbox: require('./views/RTCheckboxTheme.module.css'),
	RTInput: require('./views/RTInputTheme.module.css'),
	RTRadio: require('./views/XRadioGroupTheme.module.css')
};
