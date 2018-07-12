"Views for querying ties"
import json
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseServerError
from django.views.decorators.csrf import csrf_exempt
import ties.request
from ties.forms import TermForm, QuerySearchForm

@csrf_exempt
def query(request):
    "Fetch documents matching terms"
    if not (request.method == 'POST' or request.method == 'GET'):
        return HttpResponseBadRequest(json.dumps({'error': 'request.method not supported'}))

    if request.method == 'POST':
        form = QuerySearchForm(request.POST)
    else:
        form = QuerySearchForm(request.GET)

    if form.is_valid():
        try:
            params = {k: v for k, v in form.cleaned_data.items() if v}
            resp = ties.request.query(params)
        #pylint: disable=broad-except
        except Exception as err:
            return HttpResponseServerError(
                json.dumps({'type': 'server',
                            'error': 'Error contacting TIES server (' + str(err) + ')'}))

        if resp.status_code != 200:
            return HttpResponseServerError(
                json.dumps({'type': 'server',
                            'error': 'Error from TIES server (' + str(resp.status_code) + str(resp.text) + ')'}))
        return HttpResponse(resp.text)
    return HttpResponseBadRequest(json.dumps({'type': 'form', 'error': form.errors}))

@csrf_exempt
def search(request):
    "Fetch concepts matching terms or cui"
    if not (request.method == 'POST' or request.method == 'GET'):
        return HttpResponseBadRequest(json.dumps({'error': 'request.method not supported'}))

    if request.method == 'POST':
        form = TermForm(request.POST)
    else:
        form = TermForm(request.GET)

    if form.is_valid():
        try:
            params = {k: v for k, v in form.cleaned_data.items() if v}
            resp = ties.request.search(params)
        #pylint: disable=broad-except
        except Exception as err:
            return HttpResponseServerError(
                json.dumps({'type': 'server',
                            'error': 'Error contacting TIES server (' + str(err) + ')'}))

        if resp.status_code != 200:
            return HttpResponseServerError(
                json.dumps({'type': 'server',
                            'error': 'Error from TIES server (' + str(resp.status_code) + str(resp.text) + ')'}))
        return HttpResponse(resp.text)
    return HttpResponseBadRequest(json.dumps({'type': 'form', 'error': form.errors}))

@csrf_exempt
def documents(request, doc_id):
    "Fetch document by id"
    if not request.method == 'GET':
        return HttpResponseBadRequest(json.dumps({'error': 'request.method not supported'}))

    resp = ties.request.documents(doc_id)
    if resp.status_code != 200:
        return HttpResponseServerError(
            json.dumps({'type': 'server',
                        'error': 'Error from TIES server (' + str(resp.status_code) + str(resp.text) + ')'}))
    return HttpResponse(resp.text)

@csrf_exempt
def doc_list(request):
    "Fetch document list for patient list"
    if not request.method == 'POST':
        return HttpResponseBadRequest(json.dumps({'error': 'request.method not supported'}))
    try:
        json.loads(request.body)
    except ValueError:
        return HttpResponseServerError(
            json.dumps({'error': 'invalid json in POST body'}))

    try:
        resp = ties.request.doc_list(request.body)
    #pylint: disable=broad-except
    except Exception as err:
        return HttpResponseServerError(
            json.dumps({'type': 'server',
                        'error': 'Error contacting TIES server (' + str(err) + ')'}))

    if resp.status_code != 200:
        return HttpResponseServerError(
            json.dumps({'type': 'server',
                        'error': 'Error from TIES server (' + str(resp.status_code) + str(resp.text) + ')'}))
    return HttpResponse(resp.text)

@csrf_exempt
def doc_filter(request):
    "Filter document list"
    if not request.method == 'POST':
        return HttpResponseBadRequest(json.dumps({'error': 'request.method not supported'}))
    try:
        json.loads(request.body)
    except ValueError:
        return HttpResponseServerError(
            json.dumps({'error': 'invalid json in POST body'}))

    try:
        resp = ties.request.doc_filter(request.body)
    #pylint: disable=broad-except
    except Exception as err:
        return HttpResponseServerError(
            json.dumps({'type': 'server',
                        'error': 'Error contacting TIES server (' + str(err) + ')'}))

    if resp.status_code != 200:
        return HttpResponseServerError(
            json.dumps({'type': 'server',
                        'error': 'Error contacting TIES server (' + str(resp) + ')'}))
    return HttpResponse(resp.text)
