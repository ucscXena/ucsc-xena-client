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

const skipByDataType = dataType => dataType === 'mutation by position' || dataType === 'segmented copy number';

const getPageStep = (index, forwards, dataType) => {
	const skipDataType = skipByDataType(dataType);
	if (index === 1 && forwards && skipDataType) {
		return 2;
	} else if (index === 3 && skipDataType) {
		return forwards ? 2 : -2;
	} else if (index === 5 && !forwards && skipDataType) {
		return -2;
	}
	return forwards ? 1 : -1;
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
		const { wizardPage } = this.props,
			state = this.props.state || {};
		return (
			<div>
				{this.renderWizardSection(state, wizardPage)}
			</div>
		);
	}

	firstPage(fileSelected, file) {
		return (
			<div>
				<input type='file' id='file-input' style={{ display: 'none' }}
					onChange={this.onFileChange('file')}
				/>
				<label htmlFor='file-input' className={styles.importFileLabel}>Select Data File</label>

				{fileSelected && <b>Selected file: {file.name} </b>}

				<div style={{ marginTop: '1em' }}>
					<Button icon='help_outline' label='Help on data file formatting' accent />
				</div>
			</div>
		);
	}

	secondPage(fileSelected) {
		const { dataType } = this.props.state;
		return (
			<div>
				<Dropdown onChange={this.onDataTypeChange}
					source={dataTypeOptions}
					value={dataType}
					label={"Data type"}
					className={[styles.field, styles.inline].join(' ')}
				/>
				{ fileSelected && <h4>File preview</h4> }
				<DenseTable fileContent={this.props.fileContent} />
			</div>
		);
	}

	thirdPage() {
		const { fileFormat } = this.props.state;
		return (
			<div>
				<RadioGroup value={fileFormat} onChange={this.onFileFormatChange}>
					<RadioButton label='Sample IDs are listed in the first column' value='clinicalMatrix' />
					<RadioButton label='Sample IDs are listed in the first row' value='genomicMatrix' />
				</RadioGroup>
				<DenseTable fileContent={this.props.fileContent}
					highlightRow={fileFormat === 'genomicMatrix'} highlightColumn={fileFormat === 'clinicalMatrix'}
				/>
			</div>
		);
	}

	fourthPage() {
		const { customCohort, cohort, fileFormat } = this.props.state;
		return (
			<div>
				<RadioGroup value={this.state.cohortSelect} onChange={this.onCohortRadioChange}>
					<RadioButton label="These samples don't overlap any other dataset" value='newCohort' />
					{this.state.cohortSelect === 'newCohort' &&
						<Input label="Study name" type="text" className={styles.field}
							onChange={this.onCustomCohortChange} value={customCohort}
						/>}
					<RadioButton label="These samples overlap with another dataset I already uploaded" value='existingOwnCohort' />
					{this.state.cohortSelect === 'existingOwnCohort' &&
						<Dropdown onChange={this.onCohortChange}
							source={getDropdownOptions(["", ...this.props.localCohorts])}
							value={cohort}
							label={"Study"}
							className={[styles.field, styles.inline].join(' ')}
						/>}
					<RadioButton label="These samples overlap with a public study already in Xena (like TCGA)" value='existingPublicCohort' />
					{this.state.cohortSelect === 'existingPublicCohort' &&
						<CohortSuggest cohort={cohort} cohorts={this.props.cohorts}
							onSelect={this.onCohortChange} className={styles.field} styles={{ borderBottom: ' ' }}
						/>
					}
				</RadioGroup>
				<DenseTable fileContent={this.props.fileContent}
					highlightRow={fileFormat === 'genomicMatrix'} highlightColumn={fileFormat === 'clinicalMatrix'}
				/>
			</div>
		);
	}

	fifthPage() {
		const probeSelect = this.state.probeSelect,
			{ genes, probes, fileFormat } = this.props.state;
		return (
			<div>
				<RadioGroup value={this.state.probeSelect} onChange={this.onProbeRadioChange}>
					<RadioButton label="My data uses gene or transcript names (e.g. TP53, ENST00000619485.4)" value='genes' />
					{this.renderDropdown(this.onGenesGhange, getDropdownOptions(tempGeneOptions), genes, "Genes",
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

	sixthPage(fileSelected) {
		const { errors } = this.props.state;
		return (
			<div>
				<Button icon='youtube_searched_for' label='Begin checking' raised
					disabled={!fileSelected}
					onClick={this.onCheckForErrors}
				/>
				<Button icon='youtube_searched_for' label='Re-read file' raised
					onClick={this.onFileReRead}
				/>
				<ErrorArea errors={errors}
					showMore={this.state.showMoreErrors}
					onShowMoreToggle={this.onShowMoreToggle}
					errorCheckInProgress={this.state.errorCheckInProgress}
					onBackToFirstPage={this.onBackToFirstPage}
				/>
			</div>
		);
	}

	renderWizardSection ({ dataType, fileFormat, file }, wizardPage) {
		const fileSelected = file && !!file.size;

		let wizardProps = {},
			component = null;

		switch(wizardPage) {
			case 0:
				wizardProps = { nextEnabled: fileSelected };
				component = this.firstPage(fileSelected, file);
				break;
			case 1:
				wizardProps = { nextEnabled: !!dataType, fileName: file.name };
				component = this.secondPage(fileSelected);
				break;
			case 2:
				wizardProps = { fileName: file.name, nextEnabled: !!fileFormat };
				component = this.thirdPage();
				break;
			case 3:
				wizardProps = {
					fileName: file.name,
					onImport: skipByDataType(dataType) ? this.onImportClick : null,
					nextEnabled: this.isCohortPageNextEnabled()
				};
				component = this.fourthPage();
				break;
			case 4:
				wizardProps = {
					fileName: file.name,
					onImport: this.onImportClick,
					nextEnabled: this.isProbesNextPageEnabled()
				};
				component = this.fifthPage();
				break;
			case 5:
				wizardProps = {
					fileName: file.name, nextEnabled: !!fileFormat
				};
				component = this.sixthPage(fileSelected);
				break;
			case 6:
				component = <div>Page 6</div>;
				wizardProps = { fileName: file.name, nextEnabled: !!fileFormat };
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
		const step = getPageStep(currPageIndex, forwards, this.props.state.dataType);
		const newPageIndex = Math.min(pageStates.length - 1, Math.max(0, currPageIndex + step));
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

	onFileReRead = () => {
		this.props.callback(['set-status', 'Reading the file...']);
		this.props.callback(['read-file', this.props.state.file]);
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

	onDisplayNameChange = displayName => this.props.callback(['display-name', displayName]);

	onDescriptionChange = description => this.props.callback(['description', description]);

	onShowMoreToggle = () => this.setState({showMoreErrors: !this.state.showMoreErrors});

	onBackToFirstPage = () => {
		this.props.callback(['wizard-page', 0]);
	}

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

	onSaveFile = () => {
		const { file } = this.props.state,
			fileContent = this.props.fileContent;

		this.setState({ fileReadInprogress: true });
		this.props.callback(['set-status', 'Saving file to local hub...']);

		this.props.postFile([
			{ contents: fileContent, name: file.name },
			{ contents: this.createMetaDataFile(), name: file.name + '.json' }
		]);
		this.props.callback(['update-file', file.name]);
	}

	onImportClick = () => {
		this.props.callback(['wizard-page', this.props.wizardPage + 1]);
		this.onCheckForErrors();
		// this.onSaveFile();
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
			description: state.description,
			dataSubType: state.dataType,
			type: state.fileFormat
		}, null, 4);
	}
}

class ImportPage extends React.Component {
	constructor() {
		super();
	}

	componentDidMount() {
		this.props.callback(['get-local-cohorts']);
		this.props.callback(['set-default-custom-cohort']);
	}

	render() {
		const cohorts = this.props.state.wizard.cohorts || [];
		const { status, wizardPage, fileContent, localCohorts } = this.props.state.import;

		return (
			<div>
				<div className={styles.wizardTitle}>
					Importing data...
					<Button icon='help_outline' label='Help' flat style={{float: 'right'}}/>
					<div className={styles.stepperBox}>
						<Stepper mode={wizardPage} steps={steps} stateIndex={pageStateIndex} flat={true} wideStep={true}/>
					</div>
				</div>
				<div className={styles.container}>
					<p className={styles.status}>{status}</p>

					<ImportForm cohorts={cohorts}
						callback={this.props.callback}
						postFile={this.postFile}

						wizardPage={wizardPage}
						fileContent={fileContent}
						localCohorts={localCohorts}

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

const ErrorArea = ({ errors, showMore, errorCheckInProgress, onShowMoreToggle, onBackToFirstPage }) => {
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
				{errorCheckInProgress && <ProgressBar type="circular" mode="indeterminate" />}
			</div>

			{!!errors.length &&
				<Button icon='arrow_back' label='To file selection' raised
					onClick={onBackToFirstPage}
				/>
			}
		</div>
	);
};

// const ThemedPage = (props) =>
// 	<ThemeProvider theme={appTheme}>
// 		<ImportPage />
// 	</ThemeProvider>

// header disappears after refresh
export default ImportPage;
