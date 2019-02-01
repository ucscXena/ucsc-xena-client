'use strict';

import 'babel-polyfill';
import {servers} from '../defaultServers';
import Rx from '../rx';
var {ajax, create, defer, empty, from, fromEvent, of} = Rx.Observable;
var EMPTY = empty();
var {asap} = Rx.Scheduler;
import getErrors from '../import/errorChecking';
import infer from '../import/infer.js';
import {dataSubType, FILE_FORMAT} from '../import/constants';
const {GENOMIC_MATRIX, CLINICAL_MATRIX} = FILE_FORMAT;
import {Let, assocIn, copyStr, getIn, has, iterable} from '../underscore_ext';
import backPressure from '../import/backPressure';
import chunkReader from '../import/chunkReader';
require('./html5-formdata-polyfill'); // for safari

const referenceHost = 'https://reference.xenahubs.net';

const getBaseProbemapName = name => name ? name.replace(/(.*[/])/, '') : null;

const createMetaDataFile = (state) => {
    const probemap = getBaseProbemapName(getIn(state, ['probemap', 'name']));
    return JSON.stringify({
        cohort: state[state.cohortRadio],
        dataSubType: dataSubType[state.dataType],
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
    return ajax(payload).map(r => JSON.parse(r.response));
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
        reader.onerror = ev => obs.error(ev.target.error);
        reader.readAsBinaryString(fileHandle);
        return () => reading && reader.abort();
    });
};

const matchFormat = fileInfo => {
	const {form: {fileFormat, dataType}} = fileInfo;
	return fileFormat === GENOMIC_MATRIX && dataType === 'phenotype' ?
			assocIn(fileInfo,
					['form', 'fileFormat'], CLINICAL_MATRIX,
					['isTransposed'], true) :
		fileFormat === CLINICAL_MATRIX && dataType !== 'phenotype' ?
			assocIn(fileInfo,
					['form', 'fileFormat'], GENOMIC_MATRIX,
					['isTransposed'], true) :
		fileInfo;
};

// Note that this will emit lines including the end-of-line markers,
// and will append empty lines to the end of the previous non-empty
// line, like 'foo\n\nbar\n' -> ['foo\n\n', 'bar\n']
//
// Have tried a dozen different ways of doing this with regexes, via split,
// match, and exec. split and match are hard to get right, without a lot of
// irrelevant complexity. exec works, but the chrome regex engine has wildly
// variable performance characteristics depending on the input.
export function getLines(chunk, lines = []) {
	var i = chunk.search(/[\n\r]/);
	if (i === -1) {
		return {lines, remainder: chunk};
	}

	do {
		i += 1;
	} while (i < chunk.length && (chunk[i] === '\n' || chunk[i] === '\r'));

	lines.push(chunk.slice(0, i));

	return getLines(chunk.slice(i), lines);
}

// Takes a stream of text buffers.
// Returns a stream of lines (synchronous).
var toLines = chunks => {
	var rem = '';
	return chunks.concatMap(chunk => {
			var {lines, remainder} = getLines(chunk),
				ret = [rem + lines[0], ...lines.slice(1)];
			rem = remainder;
			return from(ret);
		}).concat(defer(() => rem.length ? of(rem) : EMPTY));
};

//var chunkSize = 40 * 1000 * 1000;
var chunkSize = 10 * 1000 * 1000;

// Take a stream of strings, returning a stream of buffers
// of size chunkSize.
var fillBuffer = seq => {
	var buff = '';
	return seq.concatMap(s => {
		var over = buff.length + s.length - chunkSize,
		   ret = over > 0 ? of(buff + s.slice(0, -over)) : EMPTY;
		buff = over > 0 ? s.slice(-over) : buff + s;
		return ret;
	}).concat(defer(() => buff.length ? of(buff) : EMPTY));
};

var sendFn = fileName => buffer =>
	buffer.concatMap((blob, i) => {
			var formData = new FormData();

			formData.append("file", blob, fileName);
			if (i !== 0) {
				formData.append('append', 'true');
			}
			return postFile(formData);
		});

function bufferTransposedFile(fileName, file, dataType, result, metrics) {
	var count = Math.ceil(file.size / chunkSize),
		cols = metrics.header.length,
		rows = metrics.c0.length + 1,
		caat = Math.min(cols, ~~(chunkSize / (file.size / cols))), // # columns at a time, to read
		passes = Math.ceil(cols / caat),
		bufferFn = chunks => {
			var lines = chunks.windowCount(count)
				// should probably use a toLines method that cuts the newlines
				.concatMap(columnChunks => toLines(columnChunks))
				.map((l, i) => Let((pass = ~~(i / rows)) => l.split(/\t/).slice(pass * caat, (pass + 1) * caat)))
				.bufferCount(rows).concatMap(arr => arr[0].map((_, i) => arr.map(a => a[i].replace(/[\r\n]+$/, '')).join('\t') + '\n'));
			// kind of silly that we join the lines here, then split them in getErrors.
			// Need to ditch the running checks in getErrors. Or expand
			// them to something more useful.
			return fillBuffer(lines.do(getErrors(dataType, result)))
				.map(buff => new Blob([buff]));
		};
	return backPressure(
		iterable.repeat(passes, chunkReader(file, chunkSize)),
		2,
		readFileObs,
		bufferFn,
		sendFn(fileName));
}
// If sending to server is slower than reading from disk, it's better to
// compute the Blob in bufferFn (vs. sendFn), so it's immediately ready
// to send when the previous query completes.
function bufferFile(fileName, file, dataType, result) {
	var bufferFn = chunks => fillBuffer(toLines(chunks).do(getErrors(dataType, result)))
		.map(buff => new Blob([buff]));
	return backPressure(
		chunkReader(file, chunkSize), 2,
		readFileObs,
		bufferFn,
		sendFn(fileName));
}

function serverError(err) {
	console.log(err);
	return {
		serverError: err.message
	};
}

// XXX fix the inference/snippet on 1st read
const importFile = (fileInfo, ignoreWarnings, metrics) => {
	const {fileName, file, form, isTransposed} = matchFormat(fileInfo),
		{dataType} = form,
		result = {}, // error check result, which is updated imperatively.
		bufferFn = isTransposed ? bufferTransposedFile : bufferFile,
		upload = bufferFn(fileName, file, dataType, result, metrics)
			.last()
			.concatMap(() => {
				var formData = new FormData();
				formData.append("file", new Blob([createMetaDataFile(form)]), fileName + '.json');
				return postFile(formData);
			});

		return upload.concatMap(() =>
			Let(({errors, warnings, snippets} = result) =>
				errors.length ? of({errors, snippets}) :
				warnings.length && !ignoreWarnings ? of({warnings}) :
				updateFile(fileName)))
			.catch(error => Rx.Observable.of(serverError(error)));
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
const inferForm = (knownProbemaps, firstRow, firstColumn) => {
	var inference = infer(firstRow, firstColumn),
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
			cohortRadio: cohort ? 'publicCohort' : undefined,
			publicCohort: cohort,
			probemap
		}
	};
};

// XXX copied from staticCompoents. Put in a common place.
var maxColumns = 6,
	maxNumRows = 20;

var file; // XXX local state
var metrics;

var cmds = {
	loadFile: (probemaps, fileHandle) => {
		file = fileHandle;
		return toLines(from(chunkReader(fileHandle, chunkSize), asap).
				concatMap(readFileObs))
			.reduce((acc, line, i) => {
				if (i === 0) {
					acc.header = line.replace(/[\n\r]+$/, '').split(/\t/);
					acc.snippet = [acc.header.slice(0, maxColumns)];
					acc.c0 = [];
				} else if (i < maxNumRows) {
					let c = line.split(/\t/, maxColumns);
					acc.snippet.push(c);
					acc.c0.push(copyStr(c[0]));
				} else {
					let c = line.split(/\t/, 1);
					acc.c0.push(copyStr(c[0]));
				}
				return acc;
			}, {})
			.do(acc => metrics = acc) // XXX stash for later use when loading
			.map(({header, c0, snippet}) =>
					[inferForm(probemaps, header, c0), snippet]);
	},
	postFile: (fileName, form, localProbemaps, ignoreWarnings) => {
		const params = {form, fileName, file},
			doImport = importFile(params, ignoreWarnings, metrics);
		return form.probemap && !has(localProbemaps, form.probemap.hash) ?
			uploadProbemapFile(form.probemap).switchMap(
				pm => has(pm, 'probemapError') ? Rx.Observable.of(pm) :
					doImport) :
			doImport;
	}
};

// XXX catch errors here? would need to flag them somehow &
// extract enough info to be serializable.
// esp. need to handle file read errors.
const wrapSlotRequest = ({msg: [tag, ...args], id}) =>
	// using defer so we can capture any errors thrown in the handlers
	defer(() => cmds[tag](...args)).catch(err => of(serverError(err))).map(msg => ({msg, id}));

var recvQ = fromEvent(self, 'message').map(({data}) => data);

recvQ.groupBy(({msg: [tag]}) => tag)
	.map(g => g.switchMap(wrapSlotRequest)) // cancel old requests on same method
	.mergeAll()
	.subscribe(ev => postMessage(ev));
