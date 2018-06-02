/* eslint-disable */
'use strict';
import React from 'react';
import styles from './ImportPage.module.css';
import appTheme from '../appTheme';

import { ThemeProvider } from 'react-css-themr';
import {
	Input, Button, Dropdown, Checkbox

} from 'react-toolbox/lib';

import DefaultTextInput from '../views/DefaultTextInput';

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

const getDropdownOptions = strArr => strArr.map(val => ({ label: val, value: val }));

const dataTypeOptions = getDropdownOptions(dataTypes);


const readFile = (file) => {
	console.log(file);
}

class ImportForm extends React.Component {
	constructor() {
		super();
		this.state = {
			// move to store
			file: null,
			fileFormat: 'genomicMatrix',
			dataType: '',
			customDataType: '',
			cohort: '',
			customCohort: '',
			displayName: '',
			description: '',

			//ui state
			hasOwnDataType: false,
			hasOwnCohort: false,
			fileReadInprogress: false
		};
	}

	render() {
		return (
			<div>
				<Input type='file' name='importFile' className={styles.field}
					onChange={this.handleFileSelected}
				/>

				<Dropdown onChange={this.handleFileFormatChange}
					source={formatOptions}
					value={this.state.fileFormat}
					allowBlank={false}
					label="File format"
					className={styles.field}
				/>

				<DropdownWithInput showInput={this.state.hasOwnDataType}
					label="Type of data" checkboxLbl="Or enter your own type"
					dropdownSource={dataTypeOptions}
					dropdownVal={this.state.dataType}
					inputVal={this.state.customDataType}

					onDropdownChange={this.handleDataTypeChange}
					onInputChange={this.handleCustomDataTypeChange}
					onCheckboxChange={this.handleHasOwnDataTypeChange}
				/>

				<DropdownWithInput showInput={this.state.hasOwnCohort}
					label="Cohort" checkboxLbl="Or enter your own cohort"
					dropdownSource={this.props.cohorts}
					dropdownVal={this.state.cohort}
					inputVal={this.state.customCohort}

					onDropdownChange={this.handleCohortChange}
					onInputChange={this.handleCustomCohortChange}
					onCheckboxChange={this.handleHasOwnCohortChange}
				/>

				<Input type='text' label="Display name" className={styles.field}
					onChange={this.handleDisplayNameChange}
					value={this.state.displayName}
				/>

				<Input type='text' label="Description" multiline={true}
					onChange={this.handleDescriptionChange}
					value={this.state.description}
				/>

				<Button icon='save' label='Save' raised 
					disabled={!this.state.file || this.state.fileReadInprogress}
					onClick={this.handleSubmitClicked} 
				/>
			</div>
		)
	}

	handleFileFormatChange = format => this.setState({ fileFormat: format });

	handleHasOwnDataTypeChange = value => this.setState({ hasOwnDataType: value });

	handleCustomDataTypeChange = value => this.setState({ customDataType: value });

	handleDataTypeChange = type => this.setState({ dataType: type });

	handleCohortChange = cohort => this.setState({ cohort: cohort });

	handleCustomCohortChange = cohort => this.setState({ customCohort: cohort });

	handleHasOwnCohortChange = value => this.setState({ hasOwnCohort: value });

	handleDisplayNameChange = displayName => this.setState({ displayName: displayName });

	handleDescriptionChange = description => this.setState({ description: description });

	handleSubmitClicked = () => {
		this.setState({fileReadInprogress: true});

		const reader = new FileReader();
		reader.onload = (e) => {
			this.props.changeStatus('');
			this.props.postFile(e.target.result, this.state.file.name);

			this.setState({fileReadInprogress: false});
		};
		this.props.changeStatus('Reading file...');

		reader.readAsBinaryString(this.state.file);

		this.props.postFile(this.createMetaDataFile(), this.state.file.name + '.json');
	}

	handleFileSelected = (fileName, evt) => {
		if (evt.target.files.length > 0) {
			this.setState({ file: evt.target.files[0] });
		}
	}

	createMetaDataFile = () => {
		return JSON.stringify({
			cohort: this.state.hasOwnCohort ? this.state.customCohort : this.state.cohort,
			label: this.state.displayName,
			description: this.state.description,
			//dataSubType: '',
			dataSubType: this.state.hasOwnDataType ? this.state.customDataType : this.state.dataType,
			//assembly: '',
			type: this.state.fileFormat
		}, null, 4);
	}
}

class ImportPage extends React.Component {
	constructor() {
		super();
		this.state = { status: '' }
	}
	render() {
		const cohorts = getDropdownOptions(this.props.state.wizard.cohorts || []);

		return (
			<div className={styles.container}>
				<p className={styles.status}>{this.state.status}</p>

				<ImportForm cohorts={cohorts} 
				
					changeStatus={this.handleStatusChange}
					postFile={this.postFile}					
				/>
			</div>
		);
	}

	handleStatusChange = statusStr => this.setState({ status: statusStr });

	postFile = (contents, fileName) => {
		var formData = new FormData();
		formData.append("file", new Blob([contents]), fileName);

		this.props.callback(['import-file', formData]);
	}
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

const ThemedPage = (props) =>
	<ThemeProvider theme={appTheme}>
		<ImportPage />
	</ThemeProvider>

// header disappears after refresh
export default ImportPage;