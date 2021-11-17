var _ = require('../underscore_ext').default;
const React = require('react');
const NameColumn = require('./NameColumn');
// const {Exons} = require('./Exons');
const ExonsOnly = require('./ExonsOnly');
var {DensityPlot, bottomColor, topColor, plotWidth} = require('./DensityPlot');
const GeneSuggest = require('../views/GeneSuggest');
var {linearTicks} = require('../scale');
import nav from '../nav';
var styles = require('./TranscriptPage.module.css');
var {StateError} = require('../StateError');
var {schemaCheckThrow} = require('../schemaCheck');
import spinner from '../ajax-loader.gif';

function getStatusView(status, onReload) {
	if (status === 'loading') {
		return (
			<div data-xena='loading' className={styles.status}>
				<img style={{textAlign: 'center'}} src={spinner}/>
			</div>);
	}
	if (status === 'error') {
		return (
			<div className={styles.status}>
				<i onClick={onReload}
				   title='Error loading data. Click to reload.'
				   aria-hidden='true'
				   className={`material-icons ${styles.errorIcon}`}>warning</i>
			</div>);
	}
	return null;
}

class Transcripts extends React.Component {
	state = {
	    input: _.getIn(this.props.state, ['transcripts', 'gene']), // XXX this is outside the selector
	    scaleZoom: false,
	    updateButton: false
	};

	UNSAFE_componentWillReceiveProps(props) {//eslint-disable-line camelcase
		var newGene = _.getIn(props.state, ['transcripts', 'gene']);
		if (newGene) {
			this.setState({input: newGene});
		}
	}

	componentDidMount() {
		var {onImport, props: {getState}} = this;

		// nested render to different DOM tree
		nav({isPublic: true, getState, onImport, onNavigate: this.onNavigate, activeLink: 'transcripts'});
	}

	onLoadData = () => {
		var subtypeA = this.refs.A.value;
		var subtypeB = this.refs.B.value;
		var unit = this.refs.unit.value;
		var gene = this.state.input;

		this.setState({
			scaleZoom: false,
			updateButton: false
		});

		// Invoke action 'loadGene', which will load transcripts and
		// expression data.
		this.props.callback(['loadGene', gene, subtypeA, subtypeB, unit]);
	};

	onZoom = (name) => {
		this.props.callback(['transcriptZoom', name]);
	};

	scaleZoom = () => {
		this.setState({
			scaleZoom: !this.state.scaleZoom,
		});
	};

	onNavigate = (page, params) => {
		this.props.callback(['navigate', page, params]);
	};

	onImport = (content) => {
		try {
			this.props.callback(['import', schemaCheckThrow(JSON.parse(content))]);
		} catch(err) {
			this.props.callback(['import-error']);
		}
	};

	onHideError = () => {
		this.props.callback(['stateError', undefined]);
	};

	render() {
		var {state} = this.props,
			{loadPending, stateError} = state,
			{status, subtypes, subtypeA, subtypeB, unit, zoom = {}} = state.transcripts || {};
		if (loadPending) {
			return <p style={{margin: 10}}>Loading your view...</p>;
		}
		if (!subtypes) {
			return <h4>Loading available subtypes...</h4>;
		}

		var valueA = subtypeA ? subtypeA : subtypes[0],
			valueB = subtypeB ? subtypeB : subtypes[subtypes.length - 1],
			options = subtypes.map(name => <option key={name} value={name}>{name}</option>),
			unitLabels = {
				tpm: {
					dropdown: "TPM",
					axis: "log2 (TPM)"
				},
				isoformPercentage: {
					dropdown: "Isoform Percentage",
					axis: "Isoform Percentage"
				}
			};

		var {genetranscripts} = state.transcripts || [];
		var genetranscriptsSorted = _.sortBy(genetranscripts, function(gtranscript) {
			// sort by start of transcript in transcript direction left to right
			// known issue: tie break
			return gtranscript.strand === '+' ? gtranscript.exonStarts[0] :
				- (gtranscript.exonEnds[gtranscript.exonCount - 1]);
			/*return _.sum(_.mmap(gtranscript.exonStarts, gtranscript.exonEnds, (exonStarts, exonEnds) => {
				return exonStarts - exonEnds;
			}));*/ // sort by transcript size large to small
			}).map(t => _.assoc(t, 'zoom', zoom[t.name]));

		//for the name column
		var transcriptNameData = _.map(genetranscriptsSorted, t => _.pick(t, 'name', 'exonCount', 'zoom'));

		//for the exon-intron visualization
		var transcriptExonData = _.map(genetranscriptsSorted, t => _.omit(t, ['chrom', 'expA', 'expB']));

		// for the density plot
		var transcriptDensityData = {
			studyA: _.map(genetranscriptsSorted, t => {
				return {'expA': t.expA.filter(x => !isNaN(x))};
			}),
			studyB: _.map(genetranscriptsSorted, t => {
				return {'expB': t.expB.filter(x => !isNaN(x))};
			}),
			nameAndZoom: _.map(genetranscriptsSorted, t => _.pick(t, 'name', 'zoom')),
		};

		//calculation of max and min same as in DensityPlot.js and passing max, min as parameters to linearTicks
		var allData = _.flatten(_.pluck(transcriptDensityData.studyA, "expA").concat(_.pluck(transcriptDensityData.studyB, "expB")));
		var max = Math.max(...allData);
		var min = Math.min(...allData);
		var densityplotAxisLabel = isFinite(max) && isFinite(min) ? linearTicks(min, max) : [];
		var range = max - min;
		var hasPlots = genetranscripts && ! _.isEmpty(genetranscripts);
		var dropdownBackgroundColorTop = hasPlots ? topColor : "white";
		var dropdownBackgroundColorBottom = hasPlots ? bottomColor : "white";
		var dropdownColor = hasPlots ? "white" : "black";

		return (
				<div className={styles.main}>
					{stateError ? <StateError onHide={this.onHideError} error={stateError}/> : null}
					<a className={styles.selectorsLink} style={{fontSize: "0.85em"}}
						href="https://ucsc-xena.gitbook.io/project/overview-of-features/transcript-view/">Help with transcripts</a>
					<div className={styles.selectors} style={{width: "1200px", height: "80px"}}>
						<div className={styles.geneBox} style={{float: "left", width: "300px"}}>
							<GeneSuggest assembly='hg38' label="Add Gene (e.g. KRAS)" value={this.state.input}
								onChange={ value => {this.setState({input: value.trim(), updateButton: true});} }/>
						</div>
						{this.state.updateButton ?
							<button className={styles.horizontalSegmentButton} onClick={this.onLoadData}>Update Gene</button> : null
						}
					</div>
					<div style={{width: "1200px", marginBottom: "40px"}}>
						<div style={{marginBottom: "10px"}}>
							<span className={styles.selectors}>Study A</span>
							<select ref="A" onChange={this.onLoadData} value={valueA}
								style={{color: dropdownColor, backgroundColor: dropdownBackgroundColorTop}}>
								{options}
							</select>
							<span className={styles.selectors}>Study B</span>
							<select ref="B" onChange={this.onLoadData} value={valueB}
								style={{color: dropdownColor, backgroundColor: dropdownBackgroundColorBottom}}>
								{options}
							</select>
						</div>
						<div>
							<span className={styles.selectors}>Expression Unit</span>
							<select ref="unit" onChange={this.onLoadData} value={unit}>
								<option value="tpm">{unitLabels.tpm.dropdown}</option>
								<option value="isoformPercentage">{unitLabels.isoformPercentage.dropdown}</option>
							</select>
						</div>
					</div>

					{ hasPlots ?
						<div>
							<div className={styles["densityplot--label-div--zoom"]} onClick={this.scaleZoom}>
								<label style={{fontSize: "0.85em", width: plotWidth}}>{unitLabels[unit].axis}</label>
								<div>
									{ densityplotAxisLabel.map((label, i) => {
										return (
											<div key={i}>
												<label className={styles["densityplot--label-x"]} style={{left: `${(label - min) * plotWidth / range}px`}}>{label}{(unit === "isoformPercentage" && i === densityplotAxisLabel.length - 1) ? "%" : "" }</label>
												<div className={styles["densityplot--label-vertical-tick"]} style={{left: `${(label - min) * plotWidth / range}px`}}/>
											</div>);
										})
									}
								</div>
								<div className={styles["densityplot--label--axis-x"]}/>
							</div>
							<div style={{width: "100%", height: "35px"}}></div>
						</div> : null
					}
					<div style={{position: 'relative'}}>
						{getStatusView(status, this.onLoadData)}
						<div className={`${styles[status || 'loaded']} ${styles.loadStatus}` }>
							<NameColumn
								data={transcriptNameData}
								gene={state.transcripts.gene}
								/>
							{ (genetranscripts && ! _.isEmpty(genetranscripts)) ?
								<label className={styles["densityplot--label-y"]}>density</label> : null
							}
							<DensityPlot
								data={transcriptDensityData}
								getNameZoom={this.onZoom}
								max = {max}
								min = {min}
								/>
							<ExonsOnly
								data={transcriptExonData}
								getNameZoom={this.onZoom}
							/>
						</div>
					</div>
					<div style={{clear: 'both'}}></div>
				</div>
		);
	}
}

class TranscriptsContainer extends React.Component {
	getState = () => {
		return _.pick(this.props.state, 'version', 'page', 'transcripts');
	};

	render() {
		var {state, selector, ...props} = this.props;
		return <Transcripts {...{...props, state: selector(state)}} getState={this.getState}/>;
	}
}

export default TranscriptsContainer;
