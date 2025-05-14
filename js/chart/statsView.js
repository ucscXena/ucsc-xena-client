import PureComponent from '../PureComponent';
import * as _ from '../underscore_ext.js';
import {el} from './react-hyper';
import {Button, Typography } from '@material-ui/core';
var button = el(Button);
var typography = el(Typography);
import compStyles from "./chart.module.css"; // XXX prune this for stats

export default el(class extends PureComponent {
	state = {};
	onClick = () => {
		this.setState({deferred: this.props.stats()});
	};
	componentDidUpdate(prev) {
		if (this.props.stats !== prev.stats) {
			this.setState({deferred: null}); //eslint-disable-line react/no-did-update-set-state
		}
	}
	render() {
		var {state: {deferred}, props: {stats}, onClick} = this,
			text = deferred || !_.isFunction(stats) && stats;
		return text ?
			typography({component: 'div',
			            className: compStyles.stats, variant: 'caption'}, text) :
			button({onClick}, 'Run Stats');
	}
});
