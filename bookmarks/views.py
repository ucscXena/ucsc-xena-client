from django.http import HttpResponse, HttpResponseBadRequest
from bookmarks.models import Bookmark
from django.core.exceptions import ObjectDoesNotExist
import json
from hashlib import md5
from django.views.decorators.csrf import csrf_exempt

# Save the bookmark to the global pool
def save(request):
    from forms import BookmarksSaveForm
    form = BookmarksSaveForm(request.POST)
    if not form.is_valid():
        return HttpResponseBadRequest(json.dumps({'error': form.errors}))
    content = form.cleaned_data['content']
    id = md5(content.encode('utf-8')).hexdigest()
    book = Bookmark(id=id, content=content)
    book.save()
    response = HttpResponse(json.dumps({'id': id}))
    response['Content-Type'] = "application/json"
    return response

# Save a bookmark to, or get a bookmark from the global pool
@csrf_exempt
def bookmark(request):
    from django.db.models import Q
    from forms import BookmarksForm
    if request.method == 'POST':
        return save(request)
    if request.method == 'GET':
        form = BookmarksForm(request.GET)
        if form.is_valid():
            id = form.cleaned_data['id']
            try:
                bookmark = Bookmark.objects.get(pk=id)
                response = HttpResponse(bookmark.content)
                response['Content-Type'] = "application/json"
                return response
            except ObjectDoesNotExist:
                return HttpResponse(json.dumps({'doesNotExist': id}))
        return HttpResponseBadRequest(json.dumps({'error': form.errors}))
    return HttpResponseBadRequest(json.dumps({'error': 'request.method not supported'}))
