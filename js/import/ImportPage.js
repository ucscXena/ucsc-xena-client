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
import getErrors from './errorChecking';

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

const readFile = (handler) => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			resolve(e.target.result);
		};
		reader.onerror = (e) => {
			reject(e.toString());
		};
		reader.readAsBinaryString(handler);
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
		const { cohort, customCohort, dataType, 
			customDataType, fileFormat, displayName, 
			description, file, probeMapFile, errors } = this.props.state;

		return (
			<div>
				<Input type='file' name='importFile' className={styles.field}
					onChange={this.onFileChange('file')}
				/>

				<Dropdown onChange={this.onFileFormatChange}
					source={formatOptions}
					value={fileFormat}
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

				<Input type='text' label="Display name" className={styles.field}
					onChange={this.onDisplayNameChange}
					value={displayName}
				/>

				<Input type='text' label="Description" multiline={true}
					onChange={this.onDescriptionChange}
					value={description}
				/>

				<ErrorArea errors={errors} />

				<Button icon='save' label='Save' raised 
					disabled={!file || this.state.fileReadInprogress}
					onClick={this.onSubmitClicked} 
				/>
			</div>
		)
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

	onSubmitClicked = () => {
		const { file } = this.props.state;
		this.setState({fileReadInprogress: true});

		readFile(file).then(fileContent => {
			this.props.callback(['set-status', 'Checking for errors...']);

			const errors = getErrors(file, fileContent);

			if(errors.length) {
				//there's some errors
				this.props.callback(['errors', errors]);
				this.props.callback(['set-status', 'There was some error found in the file']);
			} else {
				//no errors

				this.props.postFile(contents, file.name);
				this.props.postFile(this.createMetaDataFile(), file.name + '.json');
				this.props.updateFile(file.name);
				this.setState({fileReadInprogress: false});

				this.props.callback(['set-status', '']);
			}

		}).catch(e => console.log(e));

		this.props.callback(['set-status', 'Reading file...']);		
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
		const status = this.props.state.import.status;

		return (
			<div className={styles.container}>
				<p className={styles.status}>{status}</p>

				<ImportForm cohorts={cohorts} 
					callback={this.props.callback}
					postFile={this.postFile}	
					updateFile={this.updateFile}	
					
					state={this.props.state.import.form}
				/>
			</div>
		);
	}

	postFile = (contents, fileName) => {
		var formData = new FormData();
		formData.append("file", new Blob([contents]), fileName);

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
	const items = (errors || []).map(error => <p>{error}</p>);
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