from django.conf.urls import url
from ties.views import query, search, documents, doc_list

urlpatterns = [
    url(r'^query/$', query),
    url(r'^search/$', search),
    url(r'^documents/list$', doc_list),
    url(r'^documents/([0-9]+)$', documents),
]
