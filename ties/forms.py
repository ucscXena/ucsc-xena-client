from django import forms

class TermForm(forms.Form):
    term = forms.CharField()
