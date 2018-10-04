'use strict';

import {servers} from '../defaultServers';
import Rx from '../rx';
var {of, create, ajax, fromEvent} = Rx.Observable;
import getErrors from '../import/errorChecking';
import infer from '../import/infer.js';
import {FILE_FORMAT} from '../import/constants';
const {GENOMIC_MATRIX, CLINICAL_MATRIX} = FILE_FORMAT;
import {assocIn, getIn, has, transpose} from '../underscore_ext';

const referenceHost = 'https://reference.xenahubs.net';

const getBaseProbemapName = name => name ? name.replace(/(.*[/])/, '') : null;

const createMetaDataFile = (state) => {
    const probemap = getBaseProbemapName(getIn(state, ['probemap', 'name']));
    return JSON.stringify({
        version: new Date().toISOString().split('T')[0],
        cohort: state.cohortRadio === 'newCohort' ? state.customCohort : state.cohort,
        dataSubType: state.dataType,
        type: state.fileFormat,
        assembly: state.assembly || void 0,
        probemap: probemap ? probemap : void 0
    }, null, 4);
};

const postFile = (file) => {
    const payload = {
        url: `${servers.localHub}/upload/`,
        body: file,
        responseType: 'text',
        method: 'POST',
        crossDomain: true
    };

    return ajax(payload).map(r => r.response);
};

const updateFile = (fileName) => {
    const payload = {
        url: `${servers.localHub}/update/`,
        body: {'file': fileName},
        responseType: 'text',
        method: 'POST',
        crossDomain: true
    };
    return ajax(payload).map(r => r.response);
};

const readFileObs = fileHandle => {
    return create(obs => {
		var reading = true;
        const reader = new FileReader();
        reader.onload = (e) => {
			reading = false;
            obs.next(e.target.result);
            obs.complete();
        };
        reader.onerror = () => {};
        reader.readAsBinaryString(fileHandle);
        return () => reading && reader.abort();
    });
};

const parseTSV = content =>
	content.replace(/\n$/, '').split(/\n/).map(line => line.split('\t'));

const joinTSV = coll =>
	coll.map(line => line.join('\t')).join('\n');

const transposeFile = content =>
	joinTSV(transpose(parseTSV(content)));

const matchFormat = fileInfo => {
	const {form: {fileFormat, dataType}, fileContent} = fileInfo;
	return fileFormat === GENOMIC_MATRIX && dataType === 'phenotype' ?
			assocIn(fileInfo,
					['form', 'fileFormat'], CLINICAL_MATRIX,
					['fileContent'], transposeFile(fileContent)) :
		fileFormat === CLINICAL_MATRIX && dataType !== 'phenotype' ?
			assocIn(fileInfo,
					['form', 'fileFormat'], GENOMIC_MATRIX,
					['fileContent'], transposeFile(fileContent)) :
		fileInfo;
};

const importFile = (fileInfo, ignoreWarnings = false) => {
	const { fileName, fileContent, form } = matchFormat(fileInfo),
		formData = new FormData();

    formData.append("file", new Blob([fileContent]), fileName);
    formData.append("file", new Blob([createMetaDataFile(form)]), fileName + '.json');

	const {fileFormat, dataType} = form,
		{errors, warnings, snippets} = getErrors(fileContent, fileFormat, dataType);

	return (errors.length ? of({errors, snippets}) :
		warnings.length && !ignoreWarnings ? of({warnings}) :
		postFile(formData).switchMapTo(updateFile(fileName))
			.catch(error => Rx.Observable.of({serverError: error.message})));
};

const download = (host, name) => Rx.Observable.ajax({
    url: host + '/download/' + name,
    responseType: 'text',
    method: 'GET',
    crossDomain: true
});

const uploadProbemapFile = ({ name }) => {
    return Rx.Observable.zip(download(referenceHost, name), download(referenceHost, name + '.json'))
        .flatMap(([data, json]) => {
            const formData = new FormData();
            var fileName = getBaseProbemapName(name);

            formData.append("file", new Blob([data.response]), fileName);
            formData.append("file", new Blob([json.response]), fileName + '.json');

            return postFile(formData).switchMapTo(updateFile(fileName));
        }).catch(error => Rx.Observable.of({probemapError: error.message}));
};

// XXX This is a bit rough, just demonstrating how we might approach incorporating
// the inferences on data format. We may get a suggestion of where the samples are
// (1st column or 1st row), an ordered list of matching probemaps (or undefined),
// and an ordered list of matching cohorts (or undefined). We stash all of these,
// and pre-populate some form fields, like cohortRadio and fileFormat. We could
// pre-poulate probemap, but due to the current probemap wizard screen it would
// require first identifying the correct radio button (gene/transcript or probe).
// We probably want to refactor that screen, instead. There's more we might
// infer, e.g. if we match probemaps, it probably isn't a segmented or mutation
// dataset, and we could drop those from the data type selection.
const inferForm = (knownProbemaps, fileContent) => {
	var inference = infer(fileContent),
		{samples, probemaps, cohorts} = inference || {},
		inferredOrientation = samples === 'row' ?
				  GENOMIC_MATRIX : undefined,
		cohort = getIn(cohorts, [0, 'name']),
        probemap = getIn(probemaps, [0, 'name']);

    probemap = getIn(
            knownProbemaps.find(p => getIn(p, ['value', 'name']) === probemap),
            ['value']
        );

	return {
		recommended: inference,
		form: {
			fileFormat: inferredOrientation,
			cohortRadio: cohort ? 'existingPublicCohort' : undefined,
			cohort,
			probemap
		}
	};
};

// XXX copied from staticCompoents. Put in a common place.
var maxColumns = 6,
	maxNumRows = 20;

var snippet = fileContent =>
	fileContent.split(/\r\n|\r|\n/g, maxNumRows)
		.map(line => line.split(/\t/g, maxColumns).join('\t'))
		.join('\n');

var content; // XXX local state

var cmds = {
	loadFile: (probemaps, fileHandle) => readFileObs(fileHandle)
		.do(fileContent => content = fileContent) // XXX setting local state
		.map(content => [inferForm(probemaps, content), snippet(content)]),
	postFile: (fileName, form, localProbemaps, ignoreWarnings) => {
		const params = {form, fileName, fileContent: content},
			doImport = importFile(params, ignoreWarnings);
		return form.probemap && !has(localProbemaps, form.probemap.hash) ?
			uploadProbemapFile(form.probemap).switchMap(
				pm => Object.hasOwnProperty(pm, 'probemapError') ? Rx.Observable.of(pm) :
					doImport) :
			doImport;
	}
};

// XXX catch errors here? would need to flag them somehow &
// extract enough info to be serializable.
const wrapSlotRequest = ({msg: [tag, ...args], id}) =>
	cmds[tag](...args).map(msg => ({msg, id}));

var recvQ = fromEvent(self, 'message').map(({data}) => data);

recvQ.groupBy(({msg: [tag]}) => tag)
	.map(g => g.switchMap(wrapSlotRequest)) // cancel old requests on same method
	.mergeAll()
	.subscribe(ev => postMessage(ev));
