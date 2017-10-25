from django.conf.urls import url
from ties.views import query, search

urlpatterns = [
        url(r'^query/$', query),
        url(r'^search/$', search),
]
