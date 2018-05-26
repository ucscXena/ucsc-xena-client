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
	render() {
		return(
			<div className={styles.container}> 
				<Input type='file' name='importFile' onChange={this.handleFileSelected} /> 

				<Button icon='save' label='Save' raised onClick={this.handleSubmitClicked}/>
			</div>
		);
	}

	handleFileSelected = (fileName, evt) => {
		if (evt.target.files.length > 0) {
			readFile(evt.target.files[0]);
		}
	}

	handleSubmitClicked = () => {
		this.props.callback(['import-file', 'my data'])
	}
}

const ThemedPage = (props) => 
	<ThemeProvider theme={appTheme}>
		<ImportPage />
	</ThemeProvider>

// header disappears after refresh
export default ImportPage;