/* eslint-disable */
'use strict';
import React from 'react';
import styles from './ImportPage.module.css';
import appTheme from '../appTheme';

import { ThemeProvider } from 'react-css-themr';
import { Input, Button } from 'react-toolbox/lib';

// import c


const readFile = (file) => {
	console.log(file);
}

class ImportPage extends React.Component {
	constructor() {
		super();
		this.state = {
			file: null
		};
	}

	render() {
		return (
			<div className={styles.container}>
				<Input type='file' name='importFile' onChange={this.handleFileSelected} />

				<Button icon='save' label='Save' raised onClick={this.handleSubmitClicked} />
			</div>
		);
	}

	handleFileSelected = (fileName, evt) => {
		if (evt.target.files.length > 0) {
			this.setState({ file: evt.target.files[0] });
		}
	}

	handleSubmitClicked = () => {
		const reader = new FileReader();

		reader.onload = (e) => {
			this.props.callback(['import-file', { filename: this.state.file.name, bytes: e.target.result }]);
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