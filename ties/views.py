from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseServerError
import ties.request
from ties.forms import TermForm, QuerySearchForm
import json

def query(request):
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
        except Exception as e:
            return HttpResponseServerError(json.dumps({'type': 'server', 'error': 'Error contacting TIES server (' + str(e) + ')'}))

        if resp.status_code != 200:
            return HttpResponseServerError(json.dumps({'type': 'server', 'error': 'Error contacting TIES server (' + str(resp) + ')'}))
        return HttpResponse(resp.text)
    return HttpResponseBadRequest(json.dumps({'type': 'form', 'error': form.errors}))

def search(request):
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
        except Exception as e:
            return HttpResponseServerError(json.dumps({'type': 'server', 'error': 'Error contacting TIES server (' + str(e) + ')'}))

        if resp.status_code != 200:
            return HttpResponseServerError(json.dumps({'type': 'server', 'error': 'Error contacting TIES server (' + str(resp) + ')'}))
        return HttpResponse(resp.text)
    return HttpResponseBadRequest(json.dumps({'type': 'form', 'error': form.errors}))

def documents(request, docId):
    if not (request.method == 'GET'):
        return HttpResponseBadRequest(json.dumps({'error': 'request.method not supported'}))

    resp = ties.request.documents(docId)
    if resp.status_code != 200:
        return HttpResponseServerError(json.dumps({'type': 'server', 'error': 'Error contacting TIES server (' + str(resp) + ')'}))
    return HttpResponse(resp.text)
