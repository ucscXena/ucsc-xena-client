from django.conf.urls import url
from ties.views import query, search, documents

urlpatterns = [
        url(r'^query/$', query),
        url(r'^search/$', search),
        url(r'^documents/([0-9]+)$', documents),
]
