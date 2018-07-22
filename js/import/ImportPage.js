'use strict';
import React from 'react';
import styles from './ImportPage.module.css';
import _ from "../underscore_ext";
import {
	Input, Button, Dropdown,
	ProgressBar, RadioGroup, RadioButton
} from 'react-toolbox/lib';
import DefaultServers from "../defaultServers";
const { servers: { localHub } } = DefaultServers;

// import appTheme from '../appTheme';
// import { ThemeProvider } from 'react-css-themr';

import { dataTypeOptions, steps, tempGeneOptions, tempProbeOptions, NONE_STR } from './constants';

import { Stepper } from '../views/Stepper';
import WizardSection from './WizardSection';
import { DenseTable } from './staticComponents';
import CohortSuggest from '../views/CohortSuggest';

const pageStates = _.range(7);
const pageRanges = [0, ...Array(4).fill(1), 2, 3];
const pageStateIndex = _.object(pageStates, pageRanges);

const getDropdownOptions = strArr => strArr.map(val => ({ label: val, value: val }));

//needs constants
const isPhenotypeData = dataType => dataType === 'phenotype/clinical/sample type';

const getNextPageByDataType = (currIndex, forwards, dataType) => {
	let pages = [];
	switch(dataType) {
		case 'mutation by position':
		case 'segmented copy number':
			pages = [0, 1, 3, 5, 6];
			break;
		case 'phenotype/clinical/sample type':
			pages = [0, 1, 2, 3, 6];
			break;
		default:
			pages = [0, 1, 2, 3, 4, 6];
	}

	return pages[pages.indexOf(currIndex) + (forwards ? 1 : -1)];
};

class ImportForm extends React.Component {
	constructor() {
		super();
		this.state = {
			cohortSelect: null,
			probeSelect: null,
			//ui state
			fileReadInprogress: false,
			showMoreErrors: false,
			errorCheckInProgress: false
		};
	}

	render() {
		const { fileFormat, dataType, assembly } = this.props.state || {},
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
					showRetry: true,
					onRetryFile: this.onRetryFile,
					onRetryMetadata: this.onRetryMetadata
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
				callback={this.props.callback} localHub={localHub}
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
		const { dataType } = this.props.state;
		return (
			<div>
				<b style={{marginRight: '20px', fontSize: '1.1em'}}>Choose the type of data</b>
				<Dropdown onChange={this.onDataTypeChange}
					source={dataTypeOptions}
					value={dataType}
					className={[styles.field, styles.inline].join(' ')}
				/>
				<div>
					<Button label="I don't see my data type" accent flat={false}/>
				</div>
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
		const { customCohort, cohort, fileFormat } = this.props.state;
		return (
			<div>
				<RadioGroup value={this.state.cohortSelect} onChange={this.onCohortRadioChange}>
					<RadioButton label="These are the first data on these samples." value='newCohort' />
					{this.state.cohortSelect === 'newCohort' &&
						<Input label="Study name" type="text" className={styles.field}
							onChange={this.onCustomCohortChange} value={customCohort}
						/>}
					<RadioButton label="I have loaded other data on these samples and want to connect to it."
						value='existingOwnCohort' />
					{this.state.cohortSelect === 'existingOwnCohort' &&
						<Dropdown onChange={this.onCohortChange}
							source={getDropdownOptions(["", ...this.props.localCohorts])}
							value={cohort}
							label={"Study"}
							className={[styles.field, styles.inline].join(' ')}
						/>}
					<RadioButton label="There is other public data in Xena on these samples (e.g. TCGA) and want to connect to it."
						value='existingPublicCohort' />
					{this.state.cohortSelect === 'existingPublicCohort' &&
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
					{this.renderDropdown(this.onGenesGhange, getDropdownOptions(tempGeneOptions), genes, "Genes or transcripts",
						probeSelect === 'genes')
					}
					{this.renderMailto("Xena import missing gene", "genes",
						probeSelect === 'genes' && genes === NONE_STR)
					}
					<RadioButton label="My data uses probe names or other identifiers (e.g. 211300_s_at)" value='probes' />
					{this.renderDropdown(this.onProbesChange, getDropdownOptions(tempProbeOptions), probes, "Probes",
						probeSelect === 'probes')
					}
					{this.renderMailto("Xena import missing probe", "probes",
						probeSelect === 'probes' && probes === NONE_STR)
					}
					<RadioButton label="Neither" value='neither' />
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
		const { errors, errorCheckInprogress } = this.props.state;
		return (
			<div>
				{/* <Button icon='youtube_searched_for' label='Begin checking' raised
					disabled={!fileSelected}
					onClick={this.onCheckForErrors}
				/>
				<Button icon='youtube_searched_for' label='Re-read file' raised
					onClick={this.onFileReRead}
				/> */}
				<input type='file' id='file-input' style={{ display: 'none' }}
					onChange={this.onFileReRead}
				/>
				<label htmlFor='file-input' className={styles.importFileLabel}>Retry file</label>

				<ErrorArea errors={errors}
					showMore={this.state.showMoreErrors}
					onShowMoreToggle={this.onShowMoreToggle}
					errorCheckInProgress={errorCheckInprogress}
				/>
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

	onWizardPageChange = (currPageIndex, forwards) => () => {
		const newPageIndex = getNextPageByDataType(currPageIndex, forwards, this.props.state.dataType);
		this.props.callback(['wizard-page', newPageIndex]);
	}

	onFileChange = (fileProp) => (evt) => {
		this.props.callback(['file-content', '']);

		if (evt.target.files.length > 0) {
			const file = evt.target.files[0];
			this.props.callback([fileProp, file]);

			this.props.callback(['read-file', file]);
			this.props.callback(['set-status', 'Reading the file...']);
		}
	}

	onFileReRead = (evt) => {
		if (evt.target.files.length > 0) {
			const file = evt.target.files[0];
			// this.props.callback([fileProp, file]);
			this.props.callback(['retry-file', file]);
			// this.props.callback(['read-file', file]);
			// this.props.callback(['set-status', 'Reading the file...']);
		}
	}

	onCohortRadioChange = value => {
		this.props.callback(['cohort', ""]);
		this.setState({cohortSelect: value});
	}

	onProbeRadioChange = value => {
		this.setState({probeSelect: value});
	}

	onGenesGhange = value => this.props.callback(['genes', value]);

	onProbesChange = value => this.props.callback(['probes', value]);

	onFileFormatChange = format => this.props.callback(['file-format', format]);

	onDataTypeChange = type => this.props.callback(['data-type', type]);

	onCohortChange = cohort => this.props.callback(['cohort', cohort]);

	onCustomCohortChange = cohort => this.props.callback(['custom-cohort', cohort]);

	onShowMoreToggle = () => this.setState({showMoreErrors: !this.state.showMoreErrors});

	onAssemblyChange = assembly => this.props.callback(['assembly', assembly])

	onRetryMetadata = () => {
		this.props.callback(['clear-metadata']);
		this.props.callback(['wizard-page', 1]);
		this.props.callback(['set-default-custom-cohort']);
	}

	onRetryFile = () => {
		this.props.callback(['wizard-page', 0]);
	}

	// to be removed when error checking is properly done
	onCheckForErrors = () => {
		const { file, fileFormat } = this.props.state,
			fileContent = this.props.fileContent;

		//this.setState({errorCheckInProgress: true});
		// this.props.callback(['set-status', 'Checking for errors...']);
		// this.props.callback(['errors', []]);
		this.props.callback(['check-errors', file, fileContent, fileFormat]);

		// setTimeout(() => {
		// 	const errors = getErrors(file, fileContent, fileFormat);

		// 	if (errors.length) {
		// 		this.props.callback(['errors', errors]);
		// 		this.props.callback(['set-status', 'There was some error found in the file']);
		// 	} else {
		// 		this.props.callback(['set-status', '']);
		// 	}
		// 	this.setState({errorCheckInProgress: false});
		// }, 500);
	}

	saveFile = () => {
		const { fileName } = this.props.state,
			fileContent = this.props.fileContent;

		this.setState({ fileReadInprogress: true });
		this.props.callback(['set-status', 'Saving file to local hub...']);

		this.props.postFile([
			{ contents: fileContent, name: fileName },
			{ contents: this.createMetaDataFile(), name: fileName + '.json' }
		]);
		this.props.callback(['update-file', fileName]);
	}

	onImportClick = () => {
		const { file, dataType } = this.props.state,
			{ fileContent, wizardPage } = this.props;

		this.props.callback(['error-check-inprogress', true]);
		this.props.callback(['wizard-page', getNextPageByDataType(wizardPage, true, dataType)]);
		this.props.callback(['check-errors', file, fileContent, dataType]);

		//we do not issue save if there's errors - saving has to be called after error cheking
		// maybe in .map on observable and then decide to do it or not
		this.saveFile();
	}

	isCohortPageNextEnabled = () => {
		const { customCohort, cohort } = this.props.state,
			radioOption = this.state.cohortSelect;

		return (radioOption === 'newCohort' && !!customCohort) || (radioOption === 'existingOwnCohort' && !!cohort)
			|| (radioOption === 'existingPublicCohort' && !!cohort);
	}

	isProbesNextPageEnabled = () => {
		const { genes, probes } = this.props.state,
			radioOption = this.state.probeSelect;

		return (radioOption === 'genes' && !!genes) || (radioOption === 'probes' && !!probes)
			|| radioOption === 'neither';
	}

	createMetaDataFile = () => {
		const state = this.props.state;
		return JSON.stringify({
			version: new Date().toISOString().split('T')[0],
			cohort: this.state.cohortSelect === 'newCohort' ? state.customCohort : state.cohort,
			label: state.displayName,
			description: '',
			dataSubType: state.dataType,
			type: state.fileFormat,
			assembly: state.assembly
		}, null, 4);
	}
}

class ImportPage extends React.Component {
	constructor() {
		super();
	}

	componentDidMount() {
		this.props.callback(['get-local-cohorts']);
	}

	render() {
		const cohorts = this.props.state.wizard.cohorts || [];
		const { /*status,*/ wizardPage, fileContent, localCohorts, file, fileName } = this.props.state.import;

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
					{/* <p className={styles.status}>{status}</p> */}

					<ImportForm cohorts={cohorts}
						callback={this.props.callback}
						postFile={this.postFile}

						wizardPage={wizardPage}
						fileContent={fileContent}
						localCohorts={localCohorts}
						file={file} fileName={fileName}

						state={this.props.state.import.form}
					/>
				</div>
			</div>
		);
	}

	postFile = (fileArr) => {
		const formData = new FormData();
		fileArr.forEach(f => {
			formData.append("file", new Blob([f.contents]), f.name);
		});
		this.props.callback(['import-file', formData]);
	}
}

const ErrorArea = ({ errors, showMore, errorCheckInProgress, onShowMoreToggle }) => {
	errors = errors || [];
	let items = errors.map((error, i) => <p key={i} className={styles.errorLine}>{error}</p>),
		showMoreText = null;

	if (items.length > 3 && !showMore) {
		items = items.slice(0, 3);
		showMoreText = <p className={styles.showMore} onClick={onShowMoreToggle}>Show more... ({errors.length} in total)</p>;
	} else if (showMore) {
		showMoreText = <p className={styles.showMore} onClick={onShowMoreToggle}>Show less...</p>;
	}

	return (
		<div className={styles.errorContainer}>
			{items}
			{showMoreText}
			{!errors.length && !errorCheckInProgress && <p>File is good to go!</p>}

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
