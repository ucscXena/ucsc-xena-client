from django.conf.urls import url
from ties.views import query, search, documents, doc_list, doc_filter

urlpatterns = [
    url(r'^query/$', query),
    url(r'^search/$', search),
    url(r'^documents/list$', doc_list),
    url(r'^documents/filter$', doc_filter),
    url(r'^documents/([0-9]+)$', documents),
]
