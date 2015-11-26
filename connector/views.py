from django.conf import settings
from django.template import RequestContext
from django.http import HttpResponse, HttpResponseNotFound
from django.template import Template
from cancer_browser.core.http import HttpResponseSendFile
from django.core.urlresolvers import reverse

import os, re

def client_vars(request, base):
    return {
        'settings': 'enable',
        'jslogging': settings.JSLOGGING,
        'ga_id': settings.GA_ID,
        'baseurl': base,
    }

types = {
    'js': 'application/javascript',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'css': 'text/css',
    'map': 'application/json'
}


def content(request, filename):
    path = os.path.join(os.path.dirname(os.path.realpath(__file__)), filename)
    if os.path.exists(path):
        ext = os.path.splitext(filename)[1][1:]
        return HttpResponseSendFile(path, types[ext])
    return HttpResponseNotFound()

def drop_last(path):
    return re.sub(r"[^/]+/$", "", path)

def page(request):
    from django.middleware.csrf import get_token
    get_token(request)  # force csrf
    cvars = client_vars(request, drop_last(reverse(page)))
    dirname = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(dirname, 'index.html')) as f
        t = Template(f.read());
    c = RequestContext(request, cvars)
    return HttpResponse(t.render(c))
