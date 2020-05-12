
var React = require('react');
var _ = require('./underscore_ext');

// Styles
var compStyles = require('./ChartView.module.css');

class ChartView extends React.Component {
	shouldComponentUpdate() {
		return false;
	}

	componentDidMount() {
		this.chartRender(this.props);
		window.addEventListener('resize', this.setSize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.setSize);
		if (this.destroy) {
			this.destroy();
		}
	}

	componentWillReceiveProps(newProps) {
		// Updating this way is clumsy. Need to refactor chart view.
		if (!_.isEqual(_.omit(this.props.appState, 'chartState'),
				_.omit(newProps.appState, 'chartState'))) {
			this.chartRender(newProps);
		}
	}

	setSize = () => {
		if (this.chart) {
			let height = this.chart.chartHeight(),
				width = this.chart.chartWidth();
			document.getElementById("myChart").style.height = height;
			document.getElementById("myChart").style.width = width;
			document.getElementById("controlPanel").style.width = width;
		}
	};

	chartRender = (props) => {
		var {appState, callback} = props,
			{root} = this.refs;
		require.ensure(['./chart'], () => {
			this.chart = require('./chart');
			root.innerHTML = '';
			this.destroy = this.chart.render(root, callback, {xena: appState});
		});
	};

	render() {
		return <div ref='root' className={compStyles.ChartView}/>;
	}
}

module.exports = ChartView;
