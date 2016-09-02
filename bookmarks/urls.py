from django.conf.urls import url
from bookmarks.views import bookmark

urlpatterns = [
        url(r'^bookmark$', bookmark),
]
