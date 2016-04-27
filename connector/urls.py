from django.conf.urls.defaults import *

urlpatterns = patterns('',
    (r'^heatmap/$', 'addons.composite.views.page'),
    (r'^datapages/$', 'addons.composite.views.page'),
    (r'^hub/$', 'addons.composite.views.page'),
    (r'^(?P<filename>.*)',  'addons.composite.views.content'),
)
