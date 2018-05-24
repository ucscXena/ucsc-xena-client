/* eslint-disable */
import React from 'react';
import styles from './ImportPage.module.css';
import appTheme from '../appTheme';

import {ThemeProvider} from 'react-css-themr';
import Input from 'react-toolbox/lib/input';


const readFile = (file) => {
	console.log(file);
}

class ImportPage extends React.Component {
	render() {
		return(
			<div className={styles.container}> 
				<Input type='file' name='importFile' onChange={this.handleFileSelected} /> 
			</div>
		);
	}

	handleFileSelected = (fileName, evt) => {
		if (evt.target.files.length > 0) {
			readFile(evt.target.files[0]);
		}

		//issue http post with whole blob
	}
}

const ThemedPage = (props) => 
	<ThemeProvider theme={appTheme}>
		<ImportPage />
	</ThemeProvider>

// header disappears after refresh
export default ThemedPage;