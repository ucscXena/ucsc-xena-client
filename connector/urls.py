from django.conf.urls.defaults import *

urlpatterns = patterns('',
    (r'^heatmap/$', 'addons.xena.views.page'),
    (r'^datapages/$', 'addons.xena.views.page'),
    (r'^hub/$', 'addons.xena.views.page'),
    (r'^(?P<filename>.*)',  'addons.xena.views.content'),
)
