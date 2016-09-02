from django.db import models
#from fields import JSONField
    
class Bookmark(models.Model):
    def __unicode__(self):
        return self.id
    id = models.CharField(primary_key=True, max_length=32)
#    content = JSONField()
    content = models.TextField()
    class Meta:
        ordering = ['id']
