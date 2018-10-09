from django.http import HttpResponse, HttpResponseBadRequest
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from bookmarks.models import Bookmark
from django.core.exceptions import ObjectDoesNotExist
import json
from datetime import datetime
from hashlib import md5
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from forms import BookmarksSaveForm, BookmarksForm, WeekForm
from django.db.models import Q

# Save the bookmark to the global pool
def save(request):
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
    if request.method == 'POST':
        return save(request)
    if request.method == 'GET':
        form = BookmarksForm(request.GET)
        if form.is_valid():
            id = form.cleaned_data['id']
            if id[0] == "_":
                update = False
                id = id[1:]
            else:
                update = True
            try:
                bookmark = Bookmark.objects.get(pk=id)
                if update:
                    bookmark.save(update_fields=['last_use'])
                response = HttpResponse(bookmark.content)
                response['Content-Type'] = "application/json"
                return response
            except ObjectDoesNotExist:
                return HttpResponse(json.dumps({'doesNotExist': id}))
        return HttpResponseBadRequest(json.dumps({'error': form.errors}))
    return HttpResponseBadRequest(json.dumps({'error': 'request.method not supported'}))


time_format = '%Y-%m-%d %H:%M:%S'
def fmt_time(time):
    return datetime.strftime(time, time_format)

def listing(request):
    bookmark_list = Bookmark.objects.all()
    paginator = Paginator(bookmark_list, 25) # Show 25 bookmarks per page

    page = request.GET.get('page')
    try:
        bookmarks = paginator.page(page)
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        bookmarks = paginator.page(1)
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        bookmarks = paginator.page(paginator.num_pages)

    return HttpResponse(json.dumps({
        "bookmarks": [{"id": b.id, "lastUse": fmt_time(b.last_use)} for b in bookmarks.object_list],
        "page": bookmarks.number,
        "next": bookmarks.next_page_number() if bookmarks.has_next() else None,
        "prev": bookmarks.previous_page_number() if bookmarks.has_previous() else None,
    }))

def weekly(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT date_trunc('week', last_use) AS week , count(*) FROM bookmarks_bookmark GROUP BY week ORDER BY week")
        weeks = cursor.fetchall()

    return HttpResponse(json.dumps([{
        "week": fmt_time(week),
        "count": count} for (week, count) in weeks]))

def weekof(request):
    form = WeekForm(request.GET)
    if form.is_valid():
#        week = datetime.strptime(request.GET.get('week'), time_format)
        week = form.cleaned_data['week']
        bookmarks = Bookmark.objects.raw("SELECT id, last_use FROM bookmarks_bookmark WHERE date_trunc('week', last_use) = %s", [week])
        return HttpResponse(json.dumps(
            [{"id": b.id, "lastUse": fmt_time(b.last_use)} for b in bookmarks]))
    return HttpResponseBadRequest(json.dumps({'error': form.errors}))
