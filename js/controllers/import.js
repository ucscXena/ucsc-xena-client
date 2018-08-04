/* eslint-disable */
'use strict';
import Rx from '../rx';
import { make, mount, compose } from './utils';
import { servers } from '../defaultServers';
import { cohortSummary, probemapList } from '../xenaQuery';
import { assocIn, assocInAll, getIn, groupBy, map } from "../underscore_ext";

import getErrors from '../import/errorChecking';

const referenceHost = 'https://reference.xenahubs.net',
    defaultStudyName = 'My Study'

const getProbeGroups = probemaps => 
    groupBy(probemaps, (p) => p.idtype === 'probe' || p.idtype === 'exon' ? 'probes' : 'genes');

const getDefaultState = state => ({
    wizardPage: 0
});

const createMetaDataFile = (state) => {
    return JSON.stringify({
        version: new Date().toISOString().split('T')[0],
        cohort: state.cohortRadio === 'newCohort' ? state.customCohort : state.cohort,
        dataSubType: state.dataType,
        type: state.fileFormat,
        assembly: state.assembly,
        probemap: state.genes || state.probes,
        // label: 'testlabel'
    }, null, 4);
};

const retryFile = (state, fileHandle) => {
    return readFileObs(fileHandle).flatMap(content => Rx.Observable.zip(
        importFile({
            fileName: fileHandle.name, 
            fileContent: content,
            file: fileHandle,
            form: getIn(state, ['form'])
        }),

        Rx.Observable.of(content),
        Rx.Observable.of(fileHandle.name)
    ));
};

const retryFileDone = (state, [errors, fileContent, fileName]) => {
    state = assocInAll(state, ['fileContent'], fileContent,
                            ['fileName'], fileName);
    return importFileDone(state, errors);    
};

const importFile = ({ fileName, fileContent, file, form }, ignoreWarnings = false) => {
    const formData = new FormData();

    formData.append("file", new Blob([fileContent]), fileName);
    formData.append("file", new Blob([createMetaDataFile(form)]), fileName + '.json');

    return checkForErrors(fileContent, form.fileFormat, form.dataType)
        .flatMap(checkingRes => {
            const { errors, warnings } = checkingRes;

            if (errors.length) {
                return Rx.Observable.of({ errors });
            } else if (warnings.length && !ignoreWarnings) {
                return Rx.Observable.of({ warnings });
            } else {
                return postFile(formData).concat(updateFile(fileName))
                    .catch(error => Rx.Observable.of({serverError: error.message}))
            }               
        }
    );
};

const importFileDone = (state, result) => {
    state = assocIn(state, ['form', 'errorCheckInprogress'], false);
    state = assocInAll(state, ['form', 'errors'], [],
                                ['form', 'warnings'], []);

    if(result.errors) {
        return assocIn(state, ['form', 'errors'], result.errors);
    } else if (result.warnings) {
        return assocIn(state, ['form', 'warnings'], result.warnings);
    } else if (result.serverError) {
        return assocIn(state, ['form', 'serverError'], result.serverError);
    }
    return state;
}

const postFile = (file) => {
    const payload = {
        url: `${servers.localHub}/upload/`,
        body: file,
        responseType: 'text',
        method: 'POST',
        crossDomain: true
    };

    return Rx.Observable.ajax(payload);
};

const updateFile = (fileName) => {
    const payload = {
        url: `${servers.localHub}/update/`,
        body: {'file': fileName},
        responseType: 'text',
        method: 'POST',
        crossDomain: true
    };
    return Rx.Observable.ajax(payload);
};

const readFileObs = (fileHandle) => {
    return Rx.Observable.create(obs => {
        const reader = new FileReader();
        reader.onload = (e) => {
            obs.next(e.target.result);
            obs.complete();
        };
        //TODO show these errors 
        reader.onerror = (e) => {}; 
        reader.readAsBinaryString(fileHandle);
        return () => {};
    });
};

const checkForErrors = (fileContent, fileFormat, dataType) => {  
    return Rx.Observable.create(obs => {
        const result = getErrors(fileContent, fileFormat, dataType);
        setTimeout(() => {
            obs.next(result);
            obs.complete();
        }, 0);
         
        return () => {};
    });
};

const getCohortArray = cohorts => cohorts.map(c => c.cohort);
const getValueLabelList = (items) => items.map(item => ({ label: item.label, value: item.name }));

const getDefaultCustomCohort = (localCohorts, name=defaultStudyName, number=1) => {
    return !localCohorts.includes(name) ? name : getDefaultCustomCohort(localCohorts, `${defaultStudyName} (${number})`, ++number);
};

const importControls = {
    'file': (state, fileHandle) => assocInAll(state, ['file'], fileHandle, ['fileName'], fileHandle.name),
    'import-file-post!': (serverBus, state) => serverBus.next(['import-file-done', importFile(state)]),
    'import-file-done': importFileDone,
    'update-file-post!': (serverBus, state, newState, fileName) => serverBus.next(['update-file-done', updateFile(fileName)]),
    'update-file-done': (state) => assocIn(state, ['status'], 'File successfully saved!'),
    'read-file-post!': (serverBus, state, newState, fileHandle) => serverBus.next(['read-file-done', readFileObs(fileHandle)]),
    'read-file-done': (state, fileContent) => 
        assocInAll(state, 
            ['status'], 'File successfully read!',
            ['fileContent'], fileContent),
    'set-status': (state, status) => assocIn(state, ['status'], status),
    'wizard-page': (state, newPage) => assocIn(state, ['wizardPage'], newPage),
    'file-content': (state, content) => assocIn(state, ['fileContent'], content),
    'clear-metadata': (state) => assocIn(state, ['form'], {}),
    'retry-file-post!': (serverBus, state, newState, fileHandle) => serverBus.next(['retry-file-done', retryFile(state, fileHandle)]),
    'retry-file-done': retryFileDone,
    'set-default-custom-cohort': (state) => 
        assocIn(state, ['form', 'customCohort'], getDefaultCustomCohort(getIn(state, ['localCohorts']))),
    'reset-import-state': (state) => getDefaultState(state),
    'load-with-warnings-post!': (serverBus, state) => serverBus.next(['import-file-done', importFile(state, true)])
};

const query = {
    'get-local-cohorts-post!': serverBus => serverBus.next(['local-cohorts', cohortSummary(servers.localHub, [])]),
    'local-cohorts': (state, cohorts) => {
        const localCohorts = getCohortArray(cohorts);
        return assocInAll(state, 
            ['localCohorts'], localCohorts,
            ['form', 'customCohort'], getDefaultCustomCohort(localCohorts));
    },
    'get-probemaps-post!': serverBus => serverBus.next(['set-probemaps', probemapList(referenceHost)]),
    'set-probemaps': (state, probemaps) => {
        probemaps = getProbeGroups(probemaps);
        return assocInAll(state, ['probemaps', 'probes'], getValueLabelList(probemaps['probes']),
                        ['probemaps', 'genes'], getValueLabelList(probemaps['genes']));
    }
}

const changeFormProp = propName => (state, propValue) => assocIn(state, ['form', propName], propValue);

const formControls = {
    'file-format': changeFormProp('fileFormat'),
    'data-type': changeFormProp('dataType'),
    'cohort-radio': changeFormProp('cohortRadio'),
    'cohort': changeFormProp('cohort'),
    'custom-cohort': changeFormProp('customCohort'),
    'probemap-file': changeFormProp('probeMapFile'),
    'errors': changeFormProp('errors'),
    'genes': changeFormProp('genes'),
    'probes': changeFormProp('probes'),
    'assembly': changeFormProp('assembly'),
    'error-check-inprogress': changeFormProp('errorCheckInprogress')
}


export default mount(compose(
    make(importControls), 
    make(query),
    make(formControls)), ['import']);