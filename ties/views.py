from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseServerError
import ties.request
from ties.forms import TermForm
import json

def query(request):
    if not (request.method == 'POST' or request.method == 'GET'):
        return HttpResponseBadRequest(json.dumps({'error': 'request.method not supported'}))

    if request.method == 'POST':
        form = TermForm(request.POST)
    else:
        form = TermForm(request.GET)

    if form.is_valid():
        try:
            resp = ties.request.query(form.cleaned_data['term'])
        except Exception as e:
            # XXX log exception
            return HttpResponseServerError(json.dumps({'type': 'server', 'error': 'Error contacting TIES server'}))

        if resp.status_code != 200:
            return HttpResponseServerError(json.dumps({'type': 'server', 'error': 'Error contacting TIES server'}))
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
            resp = ties.request.search(form.cleaned_data['term'])
        except Exception as e:
            # XXX log exception
            return HttpResponseServerError(json.dumps({'type': 'server', 'error': 'Error contacting TIES server'}))

        if resp.status_code != 200:
            return HttpResponseServerError(json.dumps({'type': 'server', 'error': 'Error contacting TIES server'}))
        return HttpResponse(resp.text)
    return HttpResponseBadRequest(json.dumps({'type': 'form', 'error': form.errors}))
