'use strict';
import React from 'react';
import styles from './ImportPage.module.css';
// import appTheme from '../appTheme';
import _ from "../underscore_ext";

// import { ThemeProvider } from 'react-css-themr';
import {
	Input, Button, Dropdown, Checkbox, Tooltip,
	ProgressBar

} from 'react-toolbox/lib';
import DefaultServers from "../defaultServers";
const { servers: { localHub } } = DefaultServers;

const TooltipDropdown = Tooltip(Dropdown);

import { Stepper } from '../views/Stepper';
import WizardSection from './WizardSection';
import { DenseTable } from './staticComponents';

//I feel like moving to separate constants file..
const formatOptions = [
	{
		label: 'ROWs (identifiers)  x  COLUMNs (samples) -- often genomic data matrix',
		value: 'genomicMatrix'
	},
	{
		label: 'ROWs (samples)  x  COLUMNs (identifiers) -- often phenotype data',
		value: 'clinicalMatrix'
	},
	{
		label: 'Mutation by Position',
		value: 'mutationVector'
	},
	{
		label: 'Segmented data',
		value: 'segmented'
	}
];

const dataTypes = [
	"",
	"phenotype/clinical/sample type",
	"expression",
	"gene-level copy number ",
	"segmented copy number",
	"mutation by position",
	"gene-level mutation",
	"methylation",
	"other"
];

const steps = [
	{ label: 'Select a Data file' },
	{ label: 'Tell us about your Data' },
	{ label: 'Import' }
];

const pageStates = _.range(19);
const pageRanges = [0, ...Array(14).fill(1), ...Array(3).fill(2), 3];
const pageStateIndex = _.object(pageStates, pageRanges);

const getDropdownOptions = strArr => strArr.map(val => ({ label: val, value: val }));
const dataTypeOptions = getDropdownOptions(dataTypes);

const isFileFormatDense = (format) => format === 'genomicMatrix' || format === 'clinicalMatrix';

class ImportForm extends React.Component {
	constructor() {
		super();
		this.state = {
			//ui state
			hasOwnDataType: false,
			hasOwnCohort: false,
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

	renderWizardSection ({ cohort, customCohort, dataType, customDataType, fileFormat, displayName,
		description, file, probeMapFile, errors
	}, wizardPage) {
		const fileSelected = file && !!file.size,
			fileContent = this.props.fileContent;

		const wrapWizard = (component, props) => {
			return (
				<WizardSection isFirst={wizardPage === 0} isLast={wizardPage === pageStates.length - 1}
					onNextPage={this.onWizardPageChange(wizardPage, true)}
					onPreviousPage={this.onWizardPageChange(wizardPage, false)}
					callback={this.props.callback} localHub={localHub}
					{...props}
				>
					{component}
				</WizardSection>
			);
		};

		switch(wizardPage) {
			case 0: return wrapWizard(<div>
						<input type='file' id='file-input'
							style={{display: 'none'}}
							onChange={this.onFileChange('file')}
						/>
						<label htmlFor='file-input' className={styles.importFileLabel}>Select Data File</label>

						{ fileSelected && <b>Selected file: { file.name } </b> }

						<div style={{marginTop: '1em'}}>
							<Button icon='help_outline' label='Help on data file formatting' accent/>
						</div>
					</div>,
					{ nextEnabled: fileSelected });
			case 1: return wrapWizard(<div>
					<Dropdown onChange={this.onDataTypeChange}
						source={dataTypeOptions}
						value={dataType}
						label={"Data type"}
						className={[styles.field, styles.typeBox].join(' ')}
					/>
					{ fileSelected && <h4>File preview</h4> }
					<DenseTable fileContent={fileContent}/>
			</div>, { nextEnabled: !!dataType, fileName: file.name });
			case 1: <div>
					<div style={{minHeight: '112px'}}>
						<TooltipDropdown onChange={this.onFileFormatChange}
							source={formatOptions}
							value={fileFormat || 'genomicMatrix'}
							allowBlank={false}
							label="File format"
							className={[styles.field, styles.inline].join(' ')}
							tooltip={"Enter file format"} tooltipPosition={'right'}
						/>

						<DenseTable reverse={fileFormat === 'clinicalMatrix'}
							visible={isFileFormatDense(fileFormat)}
						/>
					</div>

					<DropdownWithInput showInput={this.state.hasOwnDataType}
						label="Type of data" checkboxLbl="Or enter your own type"
						dropdownSource={dataTypeOptions}
						dropdownVal={dataType}
						inputVal={customDataType}

						onDropdownChange={this.onDataTypeChange}
						onInputChange={this.onCustomDataTypeChange}
						onCheckboxChange={this.onHasOwnDataTypeChange}
					/>

					<DropdownWithInput showInput={this.state.hasOwnCohort}
						label="Cohort" checkboxLbl="Or enter your own cohort"
						dropdownSource={this.props.cohorts}
						dropdownVal={cohort}
						inputVal={customCohort}

						onDropdownChange={this.onCohortChange}
						onInputChange={this.onCustomCohortChange}
						onCheckboxChange={this.onHasOwnCohortChange}
					/>

					<Input type='file' name='probemap' className={styles.field} floating={true}
						onChange={this.onFileChange('probemap-file')} label="Probe map file"
					/>
				</div>;
			case 2: return wrapWizard(<div>
					<Input type='text' label="Display name" className={styles.field}
						onChange={this.onDisplayNameChange}
						value={displayName}
					/>

					<Input type='text' label="Description" multiline={true} className={styles.field}
						onChange={this.onDescriptionChange}
						value={description}
					/>
				</div>, {fileName: file.name});
			case 3: <div>
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

				</div>;
			case 4: return wrapWizard(<Button icon='save' label='Save' raised
					disabled={!fileSelected}
					onClick={this.onSaveFile}
				/>);
		};
	}

	onWizardPageChange = (currPageIndex, forwards) => () => {
		const newPageIndex = Math.min(pageStates.length - 1, Math.max(0, currPageIndex + (forwards ? 1 : -1)));
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

	onFileFormatChange = format => this.props.callback(['file-format', format]);

	onDataTypeChange = type => this.props.callback(['data-type', type]);

	onCustomDataTypeChange = type => this.props.callback(['custom-data-type', type]);
	onHasOwnDataTypeChange = value => this.setState({ hasOwnDataType: value });

	onCohortChange = cohort => this.props.callback(['cohort', cohort]);

	onCustomCohortChange = cohort => this.props.callback(['custom-cohort', cohort]);
	onHasOwnCohortChange = value => this.setState({ hasOwnCohort: value });

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

		this.props.updateFile(file.name);
	}

	createMetaDataFile = () => {
		const state = this.props.state;
		return JSON.stringify({
			version: new Date().toISOString().split('T')[0],
			cohort: this.state.hasOwnCohort ? state.customCohort : state.cohort,
			label: state.displayName,
			description: state.description,
			dataSubType: this.state.hasOwnDataType ? state.customDataType : state.dataType,
			type: state.fileFormat
		}, null, 4);
	}
}

class ImportPage extends React.Component {
	constructor() {
		super();
	}
	render() {
		const cohorts = getDropdownOptions(this.props.state.wizard.cohorts || []);
		const { status, wizardPage, fileContent } = this.props.state.import;

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
						updateFile={this.updateFile}

						wizardPage={wizardPage}
						fileContent={fileContent}
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

	updateFile = (fileName) => this.props.callback(['update-file', fileName]);
}


const DropdownWithInput = ({ showInput, label, checkboxLbl, onDropdownChange, onInputChange,
	onCheckboxChange, dropdownSource, dropdownVal, inputVal
}) => {
	return (
		<div>
			{!showInput ?
				<Dropdown onChange={onDropdownChange}
					source={dropdownSource}
					value={dropdownVal}
					label={label}
					className={[styles.field, styles.typeBox].join(' ')}
				/> :
				<Input type='text' label={label}
					onChange={onInputChange}
					value={inputVal}
					className={[styles.field, styles.typeBox].join(' ')} />
			}
			<Checkbox onChange={onCheckboxChange}
				checked={showInput}
				label={checkboxLbl}
				className={styles.typeBox}
			/>
		</div>
	);
};

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

// const CodeSnippet = ({fileContent = "", fileSelected}) => {
// 	const showProgress = !fileContent && fileSelected,
// 		lines = fileContent.split('\n', 10);

// 	return (
// 		<div style={{textAlign: 'center'}}>

// 			{showProgress &&
// 				<ProgressBar type="circular" mode="indeterminate" />
// 			}
// 			{!!fileContent && fileSelected &&
// 				<textarea className={styles.codeSnippet} readOnly rows={10}
// 					value={lines.join('\n') + '...'}
// 				/>
// 			}
// 		</div>
// 	);
// };

// const ThemedPage = (props) =>
// 	<ThemeProvider theme={appTheme}>
// 		<ImportPage />
// 	</ThemeProvider>

// header disappears after refresh
export default ImportPage;
