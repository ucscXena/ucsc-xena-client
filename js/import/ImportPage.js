/* eslint-disable */
'use strict';
import React from 'react';
import styles from './ImportPage.module.css';
import appTheme from '../appTheme';
import _ from "../underscore_ext";

import { ThemeProvider } from 'react-css-themr';
import {
	Input, Button, Dropdown, Checkbox, Tooltip

} from 'react-toolbox/lib';

const TooltipButton = Tooltip(Button);
const TooltipDiv = Tooltip(<div></div>);

import DefaultTextInput from '../views/DefaultTextInput';
import { Stepper } from '../views/Stepper';
import WizardSection from './WizardSection';
import getErrors from './errorChecking';

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
	"filter",
	"phenotype",
	"copy number",
	"DNA methylation",
	"exon expression",
	"gene expression",
	"gene expression RNAseq",
	"gene expression Array",
	"miRNA expression",
	"somatic mutation (SNP and small INDELs)",
	"somatic mutation (structural variant)",
	"somatic mutation (gene-level)",
	"protein expression RPPA",
	"PARADIGM pathway activity"
];

const steps = [
	{ label: 'Select the file' },
	{ label: 'Enter information about file' },
	{ label: 'Check for errors' },
	{ label: 'Save file to hub' },
	{ label: 'Step number five' }
];

const stepInfoHeader = [
	'Please select the file',
	'Enter information about file',
	'Enter some more information',
	'Check file for errors',
	'Save file to the hub'
];

const pageStates = ['SELECT_FILE', 'FILE_INFO', 'CHECK_ERRORS', 'SAVE_FILE', 'STEP_FIVE'];
const pageStateIndex = _.object(pageStates, _.range(pageStates.length));

const getDropdownOptions = strArr => strArr.map(val => ({ label: val, value: val }));
const dataTypeOptions = getDropdownOptions(dataTypes);

const readFile = (handler) => {
	return new Promise((resolve, reject) => {
		
	});
}

class ImportForm extends React.Component {
	constructor() {
		super();
		this.state = {
			//ui state
			hasOwnDataType: false,
			hasOwnCohort: false,
			fileReadInprogress: false
		};
	}

	render() {
		const { wizardPage } = this.props,
			state = this.props.state || {};
		return (
			<div>
				{this.renderWizardSection(state, wizardPage)}
			</div>
		)
	}

	renderWizardSection ({ cohort, customCohort, dataType, customDataType, fileFormat, displayName, 
		description, file, probeMapFile, errors
	}, wizardPage) {
		const disableSave = !file || !file.size;

		const fieldsByPageState = {
			0: <Input type='file' name='importFile' className={styles.field}
					onChange={this.onFileChange('file')}
				/>,
			1: <div>
					<Dropdown onChange={this.onFileFormatChange}
						source={formatOptions}
						value={fileFormat || 'genomicMatrix'}
						allowBlank={false}
						label="File format"
						className={styles.field}
					/>

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
				</div>,
			2: <div>
					<Input type='text' label="Display name" className={styles.field}
						onChange={this.onDisplayNameChange}
						value={displayName}
					/>

					<Input type='text' label="Description" multiline={true} className={styles.field}
						onChange={this.onDescriptionChange}
						value={description}
					/>
				</div>,
			3: <div>
				<Button icon='youtube_searched_for' label='Begin checking' raised
					disabled={disableSave}
					onClick={this.onCheckForErrors}
				/>
				<ErrorArea errors={errors} />

				</div>,
			4: <Button icon='save' label='Save' raised 
					disabled={disableSave}
					onClick={this.onSaveFile} 
				/>
		};

		const pageIndex = pageStateIndex[wizardPage] || 0;

		return (
			<WizardSection isFirst={pageIndex === 0} isLast={pageIndex === pageStates.length - 1}
				onNextPage={this.onWizardPageChange(pageIndex, true)}
				onPreviousPage={this.onWizardPageChange(pageIndex, false)}
			>
				{fieldsByPageState[pageIndex]}
			</WizardSection>
		);
	}

	onWizardPageChange = (currPageIndex, forwards) => () => {
		const newPageIndex = Math.min(pageStates.length - 1, Math.max(0, currPageIndex + (forwards ? 1 : -1)));
		this.props.callback(['wizard-page', pageStates[newPageIndex]]);
	} 

	onFileChange = (fileProp) => (fileName, evt) => {
		if (evt.target.files.length > 0) {
			this.props.callback([fileProp, evt.target.files[0]]);
		}
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

	onCheckForErrors = () => {
		const { file, fileFormat } = this.props.state;
		this.props.callback(['read-file', file]);

		// readFile(file).then(fileContent => {
		// 	this.props.callback(['set-status', 'Checking for errors...']);
		// 	this.props.callback(['file-content', fileContent]);

		// 	const errors = getErrors(file, fileContent, fileFormat);

		// 	if(errors.length) {
		// 		this.props.callback(['errors', errors]);
		// 		this.props.callback(['set-status', 'There was some error found in the file']);
		// 	} else {
		// 		this.props.callback(['set-status', '']);
		// 	}

		// }).catch(e => this.props.callback(['set-status', 'Unexpected error occured: ' + e.message]));

		this.props.callback(['set-status', 'Reading the file...']);		
	}

	onSaveFile = () => {
		const { file, fileFormat } = this.props.state,
			fileContent = this.props.fileContent
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
			//dataSubType: '',
			dataSubType: this.state.hasOwnDataType ? state.customDataType : state.dataType,
			//assembly: '',
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

		const pageIndex = pageStateIndex[wizardPage] || 0;

		return (
			<div>
				<Stepper mode={wizardPage} steps={steps} stateIndex={pageStateIndex}/>
				<div className={styles.wizardTitle}>
					{stepInfoHeader[pageIndex]}
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
}

const ErrorArea = ({ errors }) => {
	const items = (errors || []).map((error, i) => <p key={i}>{error}</p>);
	return (
		<div className={styles.errorContainer}>
			{items}
		</div>
	)
}

const ThemedPage = (props) =>
	<ThemeProvider theme={appTheme}>
		<ImportPage />
	</ThemeProvider>

// header disappears after refresh
export default ImportPage;