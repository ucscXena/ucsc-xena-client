'use strict';
import React from 'react';
import styles from './ImportPage.module.css';
import nav from "../nav";
import _ from "../underscore_ext";
import {
	Input, Button, Dropdown,
	ProgressBar, RadioGroup, RadioButton
} from 'react-toolbox/lib';
import DefaultServers from "../defaultServers";
const { servers: { localHub } } = DefaultServers;

import { dataTypeOptions, steps, NONE_STR } from './constants';

import { Stepper } from '../views/Stepper';
import WizardSection from './WizardSection';
import { DenseTable, ErrorPreview } from './staticComponents';
import CohortSuggest from '../views/CohortSuggest';

const pageStates = _.range(7);
const pageRanges = [0, ...Array(4).fill(1), 2, 3];
const pageStateIndex = _.object(pageStates, pageRanges);

const getDropdownOptions = strArr => strArr.map(val => ({ label: val, value: val }));
const getProbemapOptions = probes => [{label: "", value: ""}, ...probes, {label: NONE_STR, value: NONE_STR}];

//needs constants
const isPhenotypeData = dataType => dataType === 'phenotype';
const isMutationOrSegmentedData = dataType => dataType === 'mutation by position' || dataType === 'segmented copy number';

const getNextPageByDataType = (currIndex, forwards, dataType) => {
	let pages = [];
	switch(dataType) {
		case 'mutation by position':
		case 'segmented copy number':
			pages = [0, 1, 3, 5, 6];
			break;
		case 'phenotype':
			pages = [0, 1, 2, 3, 6];
			break;
		default:
			pages = [0, 1, 2, 3, 4, 6];
	}

	return pages[pages.indexOf(currIndex) + (forwards ? 1 : -1)];
};

const hasErrorsOrLoading = ({ errors, errorCheckInprogress, serverError }) =>
	(errorCheckInprogress === true || serverError || (errors && errors.length));
const hasWarnings = ({ warnings }) => (warnings && warnings.length);

const isImportSuccessful = (state) => !hasErrorsOrLoading(state) && !hasWarnings(state);

class ImportForm extends React.Component {
	constructor() {
		super();
		this.state = {
			probeSelect: null,
			//ui state
			fileReadInprogress: false,
			showMoreErrors: false,
			errorCheckInProgress: false
		};
	}

	render() {
		const { fileFormat, dataType, assembly, errorCheckInprogress } = this.props.state || {},
			{ file, wizardPage, fileName } = this.props,
			fileSelected = file && !!file.size;

		let wizardProps = {},
			component = null;

		switch(wizardPage) {
			case 0:
				wizardProps = { nextEnabled: fileSelected };
				component = this.fileSelectionPage(fileSelected, file);
				break;
			case 1:
				wizardProps = { nextEnabled: !!dataType, fileName };
				component = this.dataTypePage(fileSelected);
				break;
			case 2:
				wizardProps = { fileName, nextEnabled: !!fileFormat };
				component = this.denseOrientationPage();
				break;
			case 3:
				wizardProps = {
					fileName,
					onImport: isPhenotypeData(dataType) ? this.onImportClick : null,
					nextEnabled: this.isCohortPageNextEnabled()
				};
				component = this.studySelectionPage();
				break;
			case 4:
				wizardProps = {
					fileName,
					onImport: this.onImportClick,
					nextEnabled: this.isProbesNextPageEnabled()
				};
				component = this.probeSelectionPage();
				break;
			case 5:
				wizardProps = {
					fileName,
					onImport: this.onImportClick,
					nextEnabled: !!assembly
				};
				component = this.assemblySelectionPage();
				break;
			case 6:
				wizardProps = {
					fileName,
					showRetry: !errorCheckInprogress && !isImportSuccessful(this.props.state),
					showSuccess: isImportSuccessful(this.props.state),
					showLoadWithWarnings: hasWarnings(this.props.state) && !hasErrorsOrLoading(this.props.state),
					onRetryFile: this.onRetryFile,
					onRetryMetadata: this.onRetryMetadata,
					onImportMoreData: this.onImportMoreData,
					onLoadWithWarnings: this.onLoadWithWarnings,
					onFinish: this.onFinishClick,
					onViewData: this.onViewDataClick
				};
				component = this.importProgressPage();
				break;
			case 7:
				component = <div>Page 6</div>;
				wizardProps = { fileName, nextEnabled: !!fileFormat };
		};

		return (
			<WizardSection isFirst={wizardPage === 0} isLast={wizardPage === pageStates.length - 1}
				onNextPage={this.onWizardPageChange(wizardPage, true)}
				onPreviousPage={this.onWizardPageChange(wizardPage, false)}
				callback={this.props.callback}
				onCancelImport={this.onCancelImport}
				onFileReload={this.onFileChange('file')}
				{...wizardProps}
			>
				{component}
			</WizardSection>
		);
	}

	fileSelectionPage(fileSelected) {
		return (
			<div>
				<input type='file' id='file-input' style={{ display: 'none' }}
					onChange={this.onFileChange('file')}
				/>
				<label htmlFor='file-input' className={styles.importFileLabel}>Select Data File</label>

				{fileSelected && <b>Selected file: {this.props.fileName} </b>}

				<div style={{ marginTop: '1em' }}>
					<Button icon='help_outline' label='Help on data file formatting' accent flat={false}/>
				</div>
			</div>
		);
	}

	dataTypePage() {
		const dataType = _.getIn(this.props, ['state', 'dataType']);

		return (
			<div>
				<b style={{marginRight: '20px', fontSize: '1.1em'}}>Choose the type of data</b>
				<Dropdown onChange={this.onDataTypeChange}
					source={dataTypeOptions}
					value={dataType}
					className={[styles.field, styles.inline].join(' ')}
				/>
				<Button label="I don't see my data type" accent flat={false}/>

				<h4>File preview</h4>
				<DenseTable fileContent={this.props.fileContent} />
			</div>
		);
	}

	denseOrientationPage() {
		const { fileFormat } = this.props.state;
		return (
			<div>
				<RadioGroup value={fileFormat} onChange={this.onFileFormatChange}>
					<RadioButton label='The first column is sample IDs' value='clinicalMatrix' />
					<RadioButton label='The first row is sample IDs' value='genomicMatrix' />
				</RadioGroup>
				<DenseTable fileContent={this.props.fileContent}
					highlightRow={fileFormat === 'genomicMatrix'} highlightColumn={fileFormat === 'clinicalMatrix'}
				/>
			</div>
		);
	}

	studySelectionPage() {
		const { customCohort, cohortRadio, cohort, fileFormat } = this.props.state;
		return (
			<div>
				<RadioGroup value={cohortRadio} onChange={this.onCohortRadioChange}>
					<RadioButton label="These are the first data on these samples." value='newCohort' />
					{cohortRadio === 'newCohort' &&
						<Input label="Study name" type="text" className={styles.field}
							onChange={this.onCustomCohortChange} value={customCohort}
						/>}
					<RadioButton label="I have loaded other data on these samples and want to connect to it."
						value='existingOwnCohort' />
					{cohortRadio === 'existingOwnCohort' &&
						<Dropdown onChange={this.onCohortChange}
							source={getDropdownOptions(["", ...this.props.localCohorts])}
							value={cohort}
							label={"Study"}
							className={[styles.field, styles.inline].join(' ')}
						/>}
					<RadioButton label="There is other public data in Xena on these samples (e.g. TCGA) and want to connect to it."
						value='existingPublicCohort' />
					{cohortRadio === 'existingPublicCohort' &&
						<div className={styles.field}>
							<CohortSuggest cohort={cohort} cohorts={this.props.cohorts}
								onSelect={this.onCohortChange}
							/>
						</div>
					}
				</RadioGroup>
				<DenseTable fileContent={this.props.fileContent}
					highlightRow={fileFormat === 'genomicMatrix'} highlightColumn={fileFormat === 'clinicalMatrix'}
				/>
			</div>
		);
	}

	probeSelectionPage() {
		const probeSelect = this.state.probeSelect,
			{ genes, probes, fileFormat } = this.props.state;

		return (
			<div>
				<RadioGroup value={this.state.probeSelect} onChange={this.onProbeRadioChange}>
					<RadioButton label="My data uses gene or transcript names (e.g. TP53, ENST00000619485.4)" value='genes' />
					{this.renderDropdown(this.onGenesGhange, getProbemapOptions(_.getIn(this.props, ['probemaps', 'genes'])),
					genes, "Genes or transcripts", probeSelect === 'genes')
					}
					{this.renderMailto("Xena import missing gene", "genes",
						probeSelect === 'genes' && genes === NONE_STR)
					}
					<RadioButton label="My data uses probe names or other identifiers (e.g. 211300_s_at)" value='probes' />
					{this.renderDropdown(this.onProbesChange, getProbemapOptions(_.getIn(this.props, ['probemaps', 'probes'])),
						probes, "Probes", probeSelect === 'probes')
					}
					{this.renderMailto("Xena import missing probe", "probes",
						probeSelect === 'probes' && probes === NONE_STR)
					}
					<RadioButton label="Neither or I don't see my genes/transcripts/probes above" value='neither' />
					{this.renderMailto("Xena import missing identifiers", "identifiers", probeSelect === 'neither')}
				</RadioGroup>
				<DenseTable fileContent={this.props.fileContent}
					highlightRow={fileFormat === 'genomicMatrix'} highlightColumn={fileFormat === 'clinicalMatrix'}
				/>
			</div>
		);
	}

	assemblySelectionPage() {
		return (
			<div>
				<h4>Which reference genome was used to create this file?</h4>
				<RadioGroup value={this.props.state.assembly} onChange={this.onAssemblyChange}>
					<RadioButton label="hg18/GRCh36" value='hg18' />
					<RadioButton label="hg19/GRCh37" value='hg19' />
					<RadioButton label="hg38/GRCh38" value='hg38' />
				</RadioGroup>
				<DenseTable fileContent={this.props.fileContent} />
			</div>
		);
	}

	importProgressPage() {
		const { errors, warnings, errorCheckInprogress, serverError,
			errorSnippets } = this.props.state,
			hasErr = errors && !!errors.length;

		let errorText = null;

		if (hasErr) {
			errorText = <p>There was some errors found in the file:</p>;
		} else if (hasWarnings(this.props.state)) {
			errorText = <p>There was some warnings found in the file:</p>;
		}

		return (
			<div>
				{ errorCheckInprogress && <p>Loading file...</p> }

				{ errorText }

				<ErrorArea errors={hasErr ? errors : warnings}
					showMore={this.state.showMoreErrors}
					onShowMoreToggle={this.onShowMoreToggle}
					errorCheckInProgress={errorCheckInprogress}
					textClass={!hasErr ? styles.warningLine : styles.errorLine}
				/>

				{ serverError &&
				<div>
					<p style={{color: 'red'}}>Unexpected server error occured: {serverError}</p>
					<p>Please <a href={`mailto:genome-cancer@soe.ucsc.edu?subject="Xena import: java error"`}>contact</a> the
					 Xena team for help.</p>
				</div>
				}

				<ErrorPreview errorSnippets={errorSnippets} />

				{ isImportSuccessful(this.props.state) &&
				<div>
					<p>Success!</p>

					<p>Note that when visualizing your data
						you will need to enter [Ensembl IDs, HUGO gene names, the identifiers in your file].
					</p>
				</div>
				}
			</div>
		);
	}

	renderDropdown(onChange, source, value, label, display) {
		return display ?
		<Dropdown onChange={onChange} source={source} value={value} label={label}
			className={[styles.field, styles.inline]. join(' ')}
		/> : null;
	}

	renderMailto(subject, keyword, display) {
		return display ? <p className={styles.mailTo}><a href={`mailto:genome-cancer@soe.ucsc.edu?subject=${subject}`}>
			Let us know which {keyword} you're using</a> so we can better support you in the future.</p>
		: null;
	}

	isCohortPageNextEnabled = () => {
		const { customCohort, cohort, cohortRadio } = this.props.state;

		return (cohortRadio === 'newCohort' && !!customCohort) || (cohortRadio === 'existingOwnCohort' && !!cohort)
			|| (cohortRadio === 'existingPublicCohort' && !!cohort);
	}

	isProbesNextPageEnabled = () => {
		const { genes, probes } = this.props.state,
			radioOption = this.state.probeSelect;

		return (radioOption === 'genes' && !!genes) || (radioOption === 'probes' && !!probes)
			|| radioOption === 'neither';
	}

	onWizardPageChange = (currPageIndex, forwards) => () => {
		const newPageIndex = getNextPageByDataType(currPageIndex, forwards, _.getIn(this.props, ['state', 'dataType']));
		this.props.callback(['wizard-page', newPageIndex]);
	}

	onFileChange = (fileProp) => (evt) => {
		if (evt.target.files.length > 0) {
			this.props.callback(['file-content', '']);
			const file = evt.target.files[0];
			this.props.callback([fileProp, file]);

			this.props.callback(['read-file', file]);
			this.props.callback(['set-status', 'Reading the file...']);
		}
	}

	onCohortRadioChange = value => {
		this.props.callback(['cohort', '']);
		this.props.callback(['cohort-radio', value]);
	}

	onProbeRadioChange = value => {
		this.resetProbesAndGenes();
		this.setState({ probeSelect: value });
	}

	onGenesGhange = value => this.props.callback(['genes', value]);

	onProbesChange = value => this.props.callback(['probes', value]);

	onFileFormatChange = format => this.props.callback(['file-format', format]);

	onDataTypeChange = type => {
		this.resetFieldsOnDataTypeChange(type);
		this.setFileFormatForSparse(type);
		this.props.callback(['data-type', type]);
	}

	onCohortChange = cohort => this.props.callback(['cohort', cohort]);

	onCustomCohortChange = cohort => this.props.callback(['custom-cohort', cohort]);

	onShowMoreToggle = () => this.setState({showMoreErrors: !this.state.showMoreErrors});

	onAssemblyChange = assembly => this.props.callback(['assembly', assembly]);

	onRetryMetadata = () => {
		this.setState({probeSelect: null});

		this.props.callback(['clear-metadata']);
		this.props.callback(['wizard-page', 1]);
		this.props.callback(['set-default-custom-cohort']);
	}

	onRetryFile = (evt) => {
		if (evt.target.files.length > 0) {
			const file = evt.target.files[0];

			this.props.callback(['error-check-inprogress', true]);
			this.props.callback(['retry-file', file]);
		}
	}

	onCancelImport = () => {
		this.props.callback(['navigate', 'datapages', {host: localHub}]);
		this.props.callback(['reset-import-state']);
	}

	onFinishClick = () => {
		this.props.callback(['navigate', 'datapages', {dataset: this.props.fileName, host: localHub}]);
		this.props.callback(['reset-import-state']);
	}

	onViewDataClick = () => {
		this.props.onViz();
		this.props.callback(['reset-import-state']);
	}

	onImportMoreData = () => {
		this.setState({probeSelect: null});
		this.props.callback(['reset-import-state']);
		this.props.callback(['get-local-cohorts']);
		this.props.callback(['get-probemaps']);
	}

	onImportClick = () => {
		const { dataType } = this.props.state,
			{ wizardPage } = this.props;

		this.props.callback(['error-check-inprogress', true]);
		this.props.callback(['import-file']);
		this.props.callback(['wizard-page', getNextPageByDataType(wizardPage, true, dataType)]);
	}

	onLoadWithWarnings = () => {
		this.props.callback(['error-check-inprogress', true]);
		this.props.callback(['load-with-warnings']);
	}

	setFileFormatForSparse = dataType => {
		if(isMutationOrSegmentedData(dataType)) {
			const fileFormat = dataType === 'mutation by position' ? 'mutationVector' : 'genomicSegment';
			this.props.callback(['file-format', fileFormat]);
		}
	}

	resetFieldsOnDataTypeChange = dataType => {
		if (isMutationOrSegmentedData(dataType)) {
			this.resetProbesAndGenes();
		} else if (isPhenotypeData(dataType)) {
			this.resetProbesAndGenes();
			this.props.callback(['assembly', '']);
		} else {
			this.props.callback(['assembly', '']);
		}
	}

	resetProbesAndGenes = () => {
		this.props.callback(['genes', '']);
		this.props.callback(['probes', '']);
	}
}

class ImportPage extends React.Component {
	constructor() {
		super();
	}

	onNavigate = (page) => {
		this.props.callback(['navigate', page]);
	};

	componentDidMount() {
		this.props.callback(['get-local-cohorts']);
		this.props.callback(['get-probemaps']);
		nav({activeLink: 'hub', onNavigate: this.onNavigate});
	}

	onViz = () => {
		const cohort = _.getIn(this.props.state, ['import', 'form', 'cohort']),
			customCohort = _.getIn(this.props.state, ['import', 'form', 'customCohort']);
		this.props.callback(['cohort', cohort ? cohort : customCohort]);
		this.props.callback(['navigate', 'heatmap']);
	};

	render() {
		const cohorts = this.props.state.wizard.cohorts || [];
		const { probemaps, wizardPage, fileContent, localCohorts, file, fileName } = this.props.state.import;

		return (
			<div>
				<div className={styles.wizardTitle}>
					Loading data...
					<Button label='Help' accent style={{marginLeft: '30px', backgroundColor: '#f7f7f7'}}/>
					<div className={styles.stepperBox}>
						<Stepper mode={wizardPage} steps={steps} stateIndex={pageStateIndex} flat={true} wideStep={true}/>
					</div>
				</div>
				<div className={styles.container}>
					<ImportForm cohorts={cohorts}
						callback={this.props.callback}

						wizardPage={wizardPage}
						fileContent={fileContent}
						localCohorts={localCohorts}
						probemaps={probemaps}
						file={file} fileName={fileName}
						onViz={this.onViz}

						state={this.props.state.import.form}
					/>
				</div>
			</div>
		);
	}
}

const ErrorArea = ({ errors, showMore, errorCheckInProgress, onShowMoreToggle, textClass }) => {
	errors = errors || [];
	let items = errors.map((error, i) => <p key={i} className={textClass}>{error}</p>),
		showMoreText = null;

	if (items.length > 3 && !showMore) {
		items = items.slice(0, 3);
		showMoreText = <p className={styles.showMore} onClick={onShowMoreToggle}>Show more... ({errors.length} in total)</p>;
	} else if (showMore) {
		showMoreText = <p className={styles.showMore} onClick={onShowMoreToggle}>Show less...</p>;
	}

	return (
		<div className={styles.errorContainer}>
			{ items }
			{ showMoreText }

			<div style={{textAlign: 'center'}}>
				{errorCheckInProgress &&
					<ProgressBar type="circular" mode="indeterminate" />}
			</div>
		</div>
	);
};

// class ThemedImport extends React.Component {
// 	render() {
// 		return (
// 		<ThemeProvider theme={appTheme}>
// 			<ImportPage {...this.props}/>
// 		</ThemeProvider>);
// 	}
// }

// var selector = state => state;

// header disappears after refresh
// Button background is hacked in!!!!
// module.exports = props => <ThemedImport {...props} selector={selector}/>;
export default ImportPage;
