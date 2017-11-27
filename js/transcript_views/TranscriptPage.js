'use strict';
var _ = require('../underscore_ext');
const React = require('react');
const NameColumn = require('./NameColumn');
// const {Exons} = require('./Exons');
const ExonsOnly = require('./ExonsOnly');
var {DensityPlot, bottomColor, topColor, plotWidth} = require('./DensityPlot');
const GeneSuggest = require('../views/GeneSuggest');
var {linearTicks} = require('../scale');
var nav = require('../nav');
var styles = require('./TranscriptPage.module.css');

/*
var defaultGene = 'KRAS';
	defaultStudyA = 'tcga',
	defaultStudyB = 'gtex',
	defaultSubtypeA  = 'TCGA Lung Adenocarcinoma',
	defaultSubtypeB  = 'GTEX Lung',
	defaultUnit = 'tpm';
	*/

// Placeholder component. I'm expecting the real top-level view
// will be in a separate file, and imported above.
var Transcripts = React.createClass({
	getInitialState() {
		return {
			input: _.getIn(this.props.state, ['transcripts', 'gene']), // XXX this is outside the selector
			scaleZoom: false,
			updateButton: false
		};
	},

	componentDidMount () {
		var {onImport, props: {getState, state: {isPublic}}} = this;

		// nested render to different DOM tree
		nav({isPublic, getState, onImport, onNavigate: this.onNavigate, activeLink: 'transcripts'});
	},

	onLoadData() {
		var [studyA, subtypeA] = this.refs.A.value.split(/\|/);
		var [studyB, subtypeB] = this.refs.B.value.split(/\|/);
		var unit = this.refs.unit.value;
		var gene = this.state.input;

		this.setState({
			scaleZoom: false,
			updateButton: false
		});

		// Invoke action 'loadGene', which will load transcripts and
		// expression data.
		this.props.callback(['loadGene', gene, studyA, subtypeA, studyB, subtypeB, unit]);
	},

	onZoom(name) {
		this.props.callback(['zoom', name]);
	},

	scaleZoom() {
		this.setState({
			scaleZoom: !this.state.scaleZoom,
		});
	},

	onNavigate(page) {
		this.props.callback(['navigate', page]);
	},

	onImport(state) {
		this.props.callback(['import', state]);
	},

	render() {
		var {state} = this.props,
			{subtypes, studyA, subtypeA, studyB, subtypeB, unit, zoom = {}} = state.transcripts || {};
		if (!subtypes) {
			return <h4>Loading available subtypes...</h4>;
		}
		var subtypesTcga = _.sortBy(subtypes.tcga),
			subtypesGtex = _.sortBy(subtypes.gtex),
			valueA = studyA && subtypeA ? `${studyA}|${subtypeA}` : `tcga|${subtypesTcga[0]}`,
			valueB = studyB && subtypeB ? `${studyB}|${subtypeB}` : `gtex|${subtypesGtex[0]}`,
			options = _.concat(
				subtypesTcga.map(name => <option value = {"tcga|" + name}>{name}</option>),
				subtypesGtex.map(name => <option value = {"gtex|" + name}>{name}</option>)),
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
			return _.sum(_.mmap(gtranscript.exonStarts, gtranscript.exonEnds, (exonStarts, exonEnds) => {
				return exonStarts - exonEnds; // start - end to sort in descending order
			})); }).map(t => _.assoc(t, 'zoom', zoom[t.name]));
		//for the name column
		var transcriptNameData = _.map(genetranscriptsSorted, t => _.pick(t, 'name', 'exonCount', 'zoom'));

		//for the exon-intron visualization
		var transcriptExonData = _.map(genetranscriptsSorted, t => _.omit(t, ['chrom', 'expA', 'expB']));

		// for the density plot
		var transcriptDensityData = {
			studyA: _.map(genetranscriptsSorted, t => _.pick(t, 'expA')),
			studyB: _.map(genetranscriptsSorted, t => _.pick(t, 'expB')),
			nameAndZoom: _.map(genetranscriptsSorted, t => _.pick(t, 'name', 'zoom')),
		};

		//calculation of max and min same as in DensityPlot.js and passing max, min as parameters to linearTicks
		var max = Math.max.apply(Math, _.flatten(_.pluck(transcriptDensityData.studyA, "expA").concat(_.pluck(transcriptDensityData.studyB, "expB"))));
		var min = Math.min.apply(Math, _.flatten(_.pluck(transcriptDensityData.studyA, "expA").concat(_.pluck(transcriptDensityData.studyB, "expB"))));
		var densityplotAxisLabel = isFinite(max) && isFinite(min) ? linearTicks(min, max) : [];
		var range = max - min;
		var hasPlots = genetranscripts && ! _.isEmpty(genetranscripts);
		var dropdownBackgroundColorTop = hasPlots ? topColor : "white";
		var dropdownBackgroundColorBottom = hasPlots ? bottomColor : "white";
		var dropdownColor = hasPlots ? "white" : "black";

		return (
				<div className={styles.main}>
					<a className={styles.selectors} style={{fontSize: "0.85em"}} href="http://xena.ucsc.edu/transcript-view-help/">Help with transcripts</a>
					<div className={styles.selectors} style={{width: "1200px", height: "80px"}}>
						<div className={styles.geneBox} style={{float: "left", width: "300px"}}>
							<GeneSuggest label="Add Gene (e.g. KRAS)" value={this.state.input}
								onChange={ value => {this.setState({input: value, updateButton: true});} }/>
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
							<div className={styles["densityplot--label-div-zero"]}>
								<label className={styles["densityplot--label-zero"]}>no expression</label>
							</div>
							<div className={styles["densityplot--label-div--zoom"]} onClick={this.scaleZoom}>
								<label style={{fontSize: "0.85em", width: plotWidth}}>{unitLabels[unit].axis}</label>
								<div>
									{ densityplotAxisLabel.map((label, i) => {
										return (
											<div>
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
					<NameColumn
						data={transcriptNameData}
						gene={state.transcripts.gene}
						/>
					{/* <Exons
						data={transcriptExonData}
					/> */}
					<DensityPlot
						data={transcriptDensityData}
						type="density"
						unit={unit}
						getNameZoom={this.onZoom}
						/>
						{ (genetranscripts && ! _.isEmpty(genetranscripts)) ?
							<label className={styles["densityplot--label-y"]}>density</label> : null
						}
					<ExonsOnly
						data={transcriptExonData}
						getNameZoom={this.onZoom}
					/>
					<div style={{clear: 'both'}}></div>
					{/* <DensityPlot
						data={transcriptDensityData}
						type="histogram"
						unit={unit}
						getNameZoom={this.onZoom}
						/> */}
				</div>
		);
	}
});

var TranscriptsContainer = React.createClass({
	getState() {
		return _.pick(this.props.state, 'version', 'page', 'transcripts');
	},
	render() {
		var {state, selector, ...props} = this.props;
		return <Transcripts {...{...props, state: selector(state)}} getState={this.getState}/>;
	}
});

module.exports = TranscriptsContainer;
