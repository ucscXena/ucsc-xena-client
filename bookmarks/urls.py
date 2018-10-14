from django.conf.urls import url
from bookmarks.views import bookmark, listing, weekly, weekof

urlpatterns = [
    url(r'^bookmark$', bookmark),
    url(r'^listing$', listing),
    url(r'^weekly$', weekly),
    url(r'^weekof$', weekof),
]
