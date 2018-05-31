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

const dataTypeOptions = dataTypes.map(type => ({ label: type, value: type }));


const readFile = (file) => {
	console.log(file);
}

class ImportPage extends React.Component {
	constructor() {
		super();
		this.state = {
			// move to store
			file: null,
			fileFormat: '',
			dataType: '',
			customDataType: '', //is it really needed

			//ui state
			hasOwnDataType: false
		};
	}

	render() {
		return (
			<div className={styles.container}>
				<Input type='file' name='importFile' onChange={this.handleFileSelected} />

				<Dropdown onChange={this.handleFileFormatChange}
					source={formatOptions}
					value={this.state.value}
					allowBlank={false}
					label="File format"
					className={styles.field}
				/>

				{/* Extract */}
				<div>
					{!this.state.hasOwnDataType &&
						<Dropdown onChange={this.handleDataTypeChange}
							source={dataTypeOptions}
							value={this.state.dataType}
							label="Type of data"
							className={[styles.field, styles.typeBox].join(' ')}
						/>
					}
					{this.state.hasOwnDataType &&
						<Input type='text' name='dataType' label="Enter data type"
							onChange={this.handleCustomDataTypeChange}
							value={this.state.customDataType}
							className={[styles.field, styles.typeBox].join(' ')} />
					}

					<Checkbox onChange={this.handleHasOwnDataTypeChange}
						checked={this.state.hasOwnDataType}
						label="Or enter your own type"
						className={styles.typeBox}
					/>
				</div>

				<Button icon='save' label='Save' raised onClick={this.handleSubmitClicked} />
			</div>
		);
	}

	handleFileSelected = (fileName, evt) => {
		if (evt.target.files.length > 0) {
			this.setState({ file: evt.target.files[0] });
		}
	}

	handleFileFormatChange = newFormat => this.setState({ fileFormat: newFormat });

	handleHasOwnDataTypeChange = newValue => this.setState({ hasOwnDataType: newValue });

	handleCustomDataTypeChange = newValue => this.setState({ customDataType: newValue });

	handleDataTypeChange = newType => this.setState({ dataType: newType });

	handleSubmitClicked = () => {
		const reader = new FileReader();

		reader.onload = (e) => {
			var formData = new FormData();
			formData.append("file", new Blob(new Uint16Array(e.target.result)), this.state.file.name);
			this.props.callback(['import-file', formData]);
		};
		reader.readAsArrayBuffer(this.state.file);
	}
}

const ThemedPage = (props) =>
	<ThemeProvider theme={appTheme}>
		<ImportPage />
	</ThemeProvider>

// header disappears after refresh
export default ImportPage;