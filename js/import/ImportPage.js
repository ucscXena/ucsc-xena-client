'use strict';
import React from 'react';
import styles from './ImportPage.module.css';
import nav from "../nav";
import _ from "../underscore_ext";
import {
	Input, Button, Dropdown,
	RadioGroup, RadioButton
} from 'react-toolbox/lib';
import DefaultServers from "../defaultServers";
import loader from './loader.gif';
const { servers: { localHub } } = DefaultServers;

import { dataTypeOptions, steps, NONE_STR, DATA_TYPE, FILE_FORMAT, PAGES } from './constants';

import { Stepper } from '../views/Stepper';
import WizardSection from './WizardSection';
import { FilePreview, ErrorPreview } from './staticComponents';
import CohortSuggest from '../views/CohortSuggest';

const pageStates = _.range(Object.keys(PAGES).length);
const pageRanges = [0, ...Array(4).fill(1), 2, 3]; // XXX need a better way to express this
const pageStateIndex = _.object(pageStates, pageRanges);

const getDropdownOptions = strArr => strArr.map(val => ({ label: val, value: val }));
const getProbemapOptions = probes => [
	...probes.map(({label, value: {name}}) => ({label, value: name})),
	{label: NONE_STR, value: NONE_STR}
];

const isPhenotypeData = dataType => dataType === DATA_TYPE.PHENOTYPE;
const isMutationOrSegmentedData = dataType => dataType === DATA_TYPE.MUTATION_BY_POS || dataType === DATA_TYPE.SEGMENTED_CN;
const isMutationSegmentedOrPhenotype = dataType => isPhenotypeData(dataType) || isMutationOrSegmentedData(dataType);

const getNextPageByDataType =
	_.Let(({FILE, DATA_TYPE_SELECT, DENSE_ORIENTATION, STUDY, PROBE, ASSEMBLY, PROGRESS} = PAGES) =>
		(currIndex, dataType) => {
			let pages = [];
			switch(dataType) {
				case DATA_TYPE.MUTATION_BY_POS:
				case DATA_TYPE.SEGMENTED_CN:
					pages = [FILE, DATA_TYPE_SELECT, STUDY, ASSEMBLY, PROGRESS];
					break;
				case DATA_TYPE.PHENOTYPE:
					pages = [FILE, DATA_TYPE_SELECT, DENSE_ORIENTATION, STUDY, PROGRESS];
					break;
				default:
					pages = [FILE, DATA_TYPE_SELECT, DENSE_ORIENTATION, STUDY, PROBE, PROGRESS];
			}

			return pages[pages.indexOf(currIndex) + 1];
		});

const hasErrorsOrLoading = ({ errors, errorCheckInprogress, serverError, probemapError }) =>
	(errorCheckInprogress === true || serverError || probemapError || (errors && errors.length));
const hasWarnings = ({ warnings }) => (warnings && warnings.length);

const isImportSuccessful = (state) => !hasErrorsOrLoading(state) && !hasWarnings(state);

class ImportForm extends React.Component {
	state = {showMoreErrors: false, showMoreDataTypes: false}

	render() {
		const { fileFormat, dataType, assembly, errorCheckInprogress, serverError } = this.props.state || {},
			{ file, wizardPage, fileName, fileReadInProgress } = this.props,
			fileSelected = file && !!file.size && !serverError;

		let wizardProps = {},
			component = null;

		switch(wizardPage) {
			case PAGES.FILE:
				wizardProps = { nextEnabled: fileSelected };
				component = this.fileSelectionPage(fileSelected, file);
				break;
			case PAGES.DATA_TYPE_SELECT:
				wizardProps = { nextEnabled: !!dataType && !fileReadInProgress, fileName };
				component = this.dataTypePage(fileSelected);
				break;
			case PAGES.DENSE_ORIENTATION:
				wizardProps = { fileName, nextEnabled: !!fileFormat };
				component = this.denseOrientationPage();
				break;
			case PAGES.STUDY:
				wizardProps = {
					fileName,
					onImport: !isMutationOrSegmentedData(dataType) ? this.onImportClick : null,
					showAdvancedNextLabel: !isMutationSegmentedOrPhenotype(dataType),
					nextEnabled: this.isCohortPageNextEnabled()
				};
				component = this.studySelectionPage();
				break;
			case PAGES.PROBE:
				wizardProps = {
					fileName,
					onImport: this.onImportClick,
					nextEnabled: this.isProbesNextPageEnabled()
				};
				component = this.probeSelectionPage();
				break;
			case PAGES.ASSEMBLY:
				wizardProps = {
					fileName,
					onImport: this.onImportClick,
					nextEnabled: !!assembly
				};
				component = this.assemblySelectionPage();
				break;
			case PAGES.PROGRESS:
				wizardProps = {
					fileName,
					showRetry: !errorCheckInprogress && !isImportSuccessful(this.props.state),
					showSuccess: isImportSuccessful(this.props.state),
					showLoadWithWarnings: hasWarnings(this.props.state) && !hasErrorsOrLoading(this.props.state),
					onRetryFile: this.onRetryFile,
					onRetryMetadata: this.onRetryMetadata,
					onImportMoreData: this.onImportMoreData,
					onLoadWithWarnings: this.onLoadWithWarnings,
					onFinish: this.onFinishClick,
					onViewData: this.onViewDataClick
				};
				component = this.importProgressPage();
				break;
		};

		return (
			<WizardSection isFirst={wizardPage === 0} isLast={wizardPage === pageStates.length - 1}
				onNextPage={this.onWizardNext(wizardPage)}
				onPreviousPage={this.onWizardBack}
				callback={this.props.callback}
				onCancelImport={this.onCancelImport}
				onFileReload={this.onFileChange('file')}
				{...wizardProps}
			>
				{component}
			</WizardSection>
		);
	}

	fileSelectionPage(fileSelected) {
		var serverError = _.getIn(this.props, ['state', 'serverError']);
		return (
			<div>
				<input type='file' id='file-input' style={{ display: 'none' }}
					onChange={this.onFileChange('file')}
				/>
				<label htmlFor='file-input' className={styles.importFileLabel}>Select Data File</label>

				{fileSelected && <b>Selected file: {this.props.fileName} </b>}

				{serverError ?  (
					<div>
						<p>We were unable to read this file, due to the following error:</p>
						<pre>{serverError}</pre>
					</div>
				) : null}

				<div style={{ marginTop: '1em' }}>
					<Button icon='help_outline' target='_blank' href='https://ucsc-xena.gitbook.io/project/local-xena-hub/data-format-specifications' label='Help on data file formatting' accent flat={false}/>
				</div>
			</div>
		);
	}

	dataTypePage() {
		const dataType = _.getIn(this.props, ['state', 'dataType']),
			{showMoreDataTypes} = this.state;

		return (
			<div>
				<RadioGroup value={dataType} onChange={this.onDataTypeChange}>
					{dataTypeOptions.slice(0, showMoreDataTypes ? 4 : 2).map(({label, value}) =>
						 <RadioButton key={value} label={label} value={value}/>)}
				</RadioGroup>
				<p className={styles.showMore} onClick={this.onShowMoreDataTypesToggle}>
					{showMoreDataTypes ? 'Less data types...' : 'More data types...'}
				</p>

				<Button href='https://ucsc-xena.gitbook.io/project/local-xena-hub/data-format-specifications' target='_blank' className={styles.dataTypeHelp} label="HELP" accent flat={false}/>

				<h4>File preview</h4>
				{this.renderFilePreview()}
			</div>
		);
	}

	denseOrientationPage() {
		const { fileFormat } = this.props.state;
		return (
			<div>
				<RadioGroup value={fileFormat} onChange={this.onFileFormatChange}>
					<RadioButton label='The first column is sample IDs' value={FILE_FORMAT.CLINICAL_MATRIX} />
					<RadioButton label='The first row is sample IDs' value={FILE_FORMAT.GENOMIC_MATRIX} />
				</RadioGroup>
				{this.renderFilePreview(true)}
			</div>
		);
	}

	setLocalCohortRef = ref => {
		if (ref && !this.props.state.localCohort) {
			// XXX inputNode has gone away in rt 2.0.0-beta.13. Not sure
			// why. For now, pinning the version to beta.12.
			ref.inputNode.focus();
		}
		this.localCohortRef = ref;
	}

	studySelectionPage() {
		const { cohortRadio, newCohort, publicCohort, localCohort } = this.props.state,
			cohorts = _.getIn(this.props, ['recommended', 'cohorts']);
		return (
			<div>
				<RadioGroup value={cohortRadio} onChange={this.onCohortRadioChange}>
					<RadioButton label="These are the first data on these samples." value='newCohort' />
					{cohortRadio === 'newCohort' &&
						<Input label="Study name" type="text" className={styles.field}
							onChange={this.onNewCohortChange} value={newCohort}
						/>}
					<RadioButton label="I have loaded other data on these samples and want to connect to it."
						value='localCohort' />
					{cohortRadio === 'localCohort' &&
						<Dropdown innerRef={this.setLocalCohortRef} onChange={this.onLocalCohortChange}
							source={getDropdownOptions(["", ...this.props.localCohorts])}
							value={localCohort}
							label={"Select a study"}
							className={[styles.field, styles.inline].join(' ')}
						/>}
					<RadioButton label="There is other public data in Xena on these samples (e.g. TCGA) and want to connect to it."
						value='publicCohort' />
					{cohortRadio === 'publicCohort' &&
						<div className={styles.field}>
							<CohortSuggest cohort={publicCohort} cohorts={_.pluck(cohorts, 'name')}
								onSelect={this.onPublicCohortChange}
							/>
						</div>
					}
				</RadioGroup>
				{this.renderFilePreview(true)}
			</div>
		);
	}

	probeSelectionPage() {
		const recommendedProbemaps = _.getIn(this.props, ['recommended', 'probemaps'], []);
		const existingProbemaps = _.getIn(this.props, ['probemaps']);
		const probemapsToShow = recommendedProbemaps
				.map(p => existingProbemaps.find(existing => existing.value.name === p.name))
				.filter(_.identity);
		const recommendationsExist = recommendedProbemaps.length;
		const {probemap = {name: NONE_STR}} = this.props.state;

		const seletedProbeMapLabel = _.getIn(probemapsToShow, [0, 'label'], '');

		const text = recommendationsExist ?
			<div>
				<h4>We predict your data uses <b>{seletedProbeMapLabel}</b> type file.</h4>
				<h4>If this is not correct, choose the correct one from the drop down</h4>
			</div>
			: <h4>We don't recognize the identifiers in your data. Sorry!</h4>;

		return (
			<div>
				{text}
				{!!recommendationsExist &&
					<Dropdown
					onChange={this.onProbemapChange}
					source={getProbemapOptions(probemapsToShow)}
					value={_.get(probemap, 'name')}
					className={[styles.probemap, styles.inline]. join(' ')}
				/>}
				{ this.renderMailto("Xena import missing identifiers", "identifiers", probemap === NONE_STR || !recommendationsExist) }

				{this.renderFilePreview(true)}
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
				{this.renderFilePreview()}
			</div>
		);
	}

	importProgressPage() {
		const { errors, warnings, errorCheckInprogress, serverError, probemapError,
			errorSnippets } = this.props.state,
			{fileContent} = this.props,
			serverOrProbemapError = serverError || probemapError,
			hasErr = errors && !!errors.length;

		let errorText = null;

		if (hasErr) {
			errorText = <p>There were some errors found in the file:</p>;
		} else if (hasWarnings(this.props.state)) {
			errorText = <p>There were some warnings found in the file:</p>;
		}

		return (
			<div>
				{ errorCheckInprogress && <p>Loading file...</p> }

				{ errorText }

				<ErrorArea errors={hasErr ? errors : warnings}
					showMore={this.state.showMoreErrors}
					onShowMoreToggle={this.onShowMoreToggle}
					errorCheckInProgress={errorCheckInprogress}
					textClass={!hasErr ? styles.warningLine : styles.errorLine}
				/>

				{ serverOrProbemapError &&
				<div>
					<p style={{color: 'red'}}>Unexpected server error occured: {serverOrProbemapError}</p>
					<p>Please <a href={`mailto:genome-cancer@soe.ucsc.edu?subject="Xena import: java error"`}>contact</a> the
					 Xena team for help.</p>
				</div>
				}

				{
					// XXX hard-coding errorLines to the file header, since that's the only case we
					// currently handle.
				}
				<ErrorPreview errorSnippets={errorSnippets} errorLines={fileContent.slice(0, 2)} />

				{ isImportSuccessful(this.props.state) &&
				<div>
					<p>Success!</p>
				</div>
				}
			</div>
		);
	}

	renderFilePreview(showHighlighting = false) {
		const { fileContent, fileReadInProgress } = this.props;
		const { fileFormat } = this.props.state;

		return (
			<FilePreview
				fileContent={fileContent}
				isLoading={fileReadInProgress}
				highlightRow={fileFormat === FILE_FORMAT.GENOMIC_MATRIX && showHighlighting}
				highlightColumn={fileFormat === FILE_FORMAT.CLINICAL_MATRIX && showHighlighting}
			/>
		);
	}

	renderDropdown(onChange, source, value, label, display) {
		return display ?
		<Dropdown onChange={onChange} source={source} value={value} label={label}
			className={[styles.field, styles.inline]. join(' ')}
		/> : null;
	}

	renderMailto(subject, keyword, display) {
		return display ?
		<p className={styles.mailTo}><a href={`mailto:genome-cancer@soe.ucsc.edu?subject=${subject}`}>
		Let us know which {keyword} you're using</a> so we can better support you in the future.</p>
		: null;
	}

	isCohortPageNextEnabled = () => {
		const { cohortRadio } = this.props.state;

		return !!(cohortRadio && this.props.state[cohortRadio]);
	}

	isProbesNextPageEnabled = () => {
		return true;
	}

	onWizardBack = () => {
		this.props.callback(['wizard-page', this.props.wizardHistory.pop()]);
		this.props.callback(['wizard-page-history', this.props.wizardHistory]);
	}

	onWizardNext = (currPageIndex) => () => {
		this.props.callback(['wizard-page-history', [...this.props.wizardHistory, currPageIndex]]);

		const newPageIndex = getNextPageByDataType(currPageIndex, _.getIn(this.props, ['state', 'dataType']));
		this.props.callback(['wizard-page', newPageIndex]);
	}

	onFileChange = (fileProp) => (evt) => {
		if (evt.target.files.length > 0) {
			this.props.callback(['file-content', []]);
			const file = evt.target.files[0];
			this.props.callback([fileProp, file]);

			this.props.callback(['file-read-inprogress']);
			this.props.callback(['read-file', file]);
			this.props.callback(['set-status', 'Reading the file...']);
		}
	}

	onCohortRadioChange = value => {
		this.props.callback(['cohort-radio', value]);
	}

	onProbemapChange = value => {
		var {probemaps} = this.props,
			pm = probemaps.find(({value: {name}}) => name === value);
		this.props.callback(['probemap', pm ? pm.value : undefined]);
	};

	onFileFormatChange = format => this.props.callback(['file-format', format]);

	onDataTypeChange = type => {
		this.resetFieldsOnDataTypeChange(type);
		this.setFileFormatForSparse(type);
		this.props.callback(['data-type', type]);
	}

	onPublicCohortChange = cohort => this.props.callback(['import-publicCohort', cohort]);

	onLocalCohortChange = cohort => this.props.callback(['import-localCohort', cohort]);

	onNewCohortChange = cohort => this.props.callback(['import-newCohort', cohort]);

	onShowMoreToggle = () => this.setState({showMoreErrors: !this.state.showMoreErrors});

	onShowMoreDataTypesToggle = () => this.setState({showMoreDataTypes: !this.state.showMoreDataTypes});

	onAssemblyChange = assembly => this.props.callback(['assembly', assembly]);

	onRetryMetadata = () => {
		this.props.callback(['clear-metadata']);
		this.props.callback(['wizard-page', PAGES.DATA_TYPE_SELECT]);
		this.props.callback(['retry-meta-data']);
	}

	onRetryFile = () => {
		this.props.callback(['error-check-inprogress']);
		this.props.callback(['retry-file', this.props.file]);
	}

	onCancelImport = () => {
		this.props.callback(['navigate', 'datapages', {host: localHub}]);
		this.props.callback(['reset-import-state']);
	}

	onFinishClick = () => {
		this.props.callback(['navigate', 'datapages', {dataset: this.props.fileName, host: localHub}]);
		this.props.callback(['reset-import-state']);
	}

	onViewDataClick = () => {
		this.props.onViz();
		this.props.callback(['reset-import-state']);
	}

	onImportMoreData = () => {
		this.props.callback(['reset-import-state']);
		this.props.callback(['get-local-cohorts']);
		this.props.callback(['get-probemaps']);
	}

	onImportClick = () => {
		this.props.callback(['wizard-page-history', [...this.props.wizardHistory, this.props.wizardPage]]);

		this.props.callback(['wizard-page', PAGES.PROGRESS]);
		this.props.callback(['error-check-inprogress']);
		this.props.callback(['import-file']);
	}

	onLoadWithWarnings = () => {
		this.props.callback(['error-check-inprogress']);
		this.props.callback(['load-with-warnings']);
	}

	setFileFormatForSparse = dataType => {
		if(isMutationOrSegmentedData(dataType)) {
			const fileFormat = dataType === DATA_TYPE.MUTATION_BY_POS ? FILE_FORMAT.MUTATION_VECTOR : FILE_FORMAT.GENOMIC_SEGMENT;
			this.props.callback(['file-format', fileFormat]);
		}
	}

	resetFieldsOnDataTypeChange = dataType => {
		if (isMutationOrSegmentedData(dataType)) {
			this.resetProbemap();
		} else if (isPhenotypeData(dataType)) {
			this.resetProbemap();
			this.props.callback(['assembly', '']);
		} else {
			this.props.callback(['assembly', '']);
		}
	}

	resetProbemap = () => {
		this.props.callback(['probemap', '']);
	}
}

class ImportPage extends React.Component {
	constructor() {
		super();
	}

	onNavigate = (page, params) => {
		this.props.callback(['navigate', page, params]);
	};

	componentDidMount() {
		this.props.callback(['get-local-cohorts']);
		this.props.callback(['get-probemaps']);
		nav({activeLink: 'datapages', onNavigate: this.onNavigate});
	}

	onViz = () => {
		const form = this.props.state.import.form,
			cohort = form[form.cohortRadio];
		this.props.callback(['cohort', cohort]);
		this.props.callback(['navigate', 'heatmap']);
	};

	render() {
		const cohorts = this.props.state.wizard.cohorts || [];
		const {
			probemaps,
			wizardPage = 0,
			fileContent,
			fileReadInProgress,
			localCohorts,
			file,
			fileName,
			form,
			wizardHistory = [],
			recommended
		} = this.props.state.import || {};

		return (
			<div>
				<div className={styles.wizardTitle}>
					Loading data...
					<Button label='Help' target='_blank' href='https://ucsc-xena.gitbook.io/project/local-xena-hub' accent style={{marginLeft: '30px', backgroundColor: '#f7f7f7'}}/>
					<div className={styles.stepperBox}>
						<Stepper mode={wizardPage} steps={steps} stateIndex={pageStateIndex} flat={true} wideStep={true}/>
					</div>
				</div>
				<div className={styles.container}>
					<ImportForm cohorts={cohorts}
						callback={this.props.callback}

						recommended={recommended}
						wizardPage={wizardPage}
						wizardHistory={wizardHistory}
						fileContent={fileContent}
						fileReadInProgress={fileReadInProgress}
						localCohorts={localCohorts}
						fileContent={fileContent}
						probemaps={probemaps}
						file={file} fileName={fileName}
						onViz={this.onViz}

						state={form}
					/>
				</div>
			</div>
		);
	}
}

const ErrorArea = ({ errors, showMore, errorCheckInProgress, onShowMoreToggle, textClass }) => {
	errors = errors || [];
	let items = errors.map((error, i) => <p key={i} className={textClass}>{error}</p>),
		showMoreText = null;

	if (items.length > 3 && !showMore) {
		items = items.slice(0, 3);
		showMoreText = <p className={styles.showMore} onClick={onShowMoreToggle}>Show more... ({errors.length} in total)</p>;
	} else if (showMore) {
		showMoreText = <p className={styles.showMore} onClick={onShowMoreToggle}>Show less...</p>;
	}

	return (
		<div className={styles.errorContainer}>
			{ items }
			{ showMoreText }

			<div style={{textAlign: 'center'}}>
				{errorCheckInProgress && <img src={loader}/>}
			</div>
		</div>
	);
};

export default ImportPage;
