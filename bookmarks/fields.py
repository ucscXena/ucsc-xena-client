# This code is modified from http://djangosnippets.org/snippets/1478/
# to allow the objects in the json field to appears as objects, rather
# than the serialized string.

from django.db import models
from django.core.serializers.json import DjangoJSONEncoder
import json
from django.core import exceptions
from django import forms

class JSONFormField(forms.CharField):
    def to_python(self, value):
        try:
            value = json.loads(value)
        except ValueError:
            raise exceptions.ValidationError(u'Invalid JSON')
        return value

    def prepare_value(self, value):
        if isinstance(value, basestring):
            return value
        if value is None:
            return None
        return json.dumps(value, cls=DjangoJSONEncoder, indent=4)

class JSONField(models.TextField):
    # Used so to_python() is called
    __metaclass__ = models.SubfieldBase

    def to_python(self, value):
        """Convert our string value to JSON after we load it from the DB"""

        if value == "":
            return None

        try:
            if isinstance(value, basestring):
                return json.loads(value)
        except ValueError:
            raise exceptions.ValidationError(u'Invalid JSON')

        return value

    def get_prep_value(self, value):
        """Convert our JSON object to a string before we save"""
        if value == "":
            return None
        if isinstance(value, dict) or isinstance(value, list):
            value = json.dumps(value, cls=DjangoJSONEncoder)
        return super(JSONField, self).get_prep_value(value)

    def value_to_string(self, obj):
        """ called by the serializer."""

        # Return our value, instead of a string. The serializer
        # will then serialize the objects as objects.
        return self._get_val_from_obj(obj)

