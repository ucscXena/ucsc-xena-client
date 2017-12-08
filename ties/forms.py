from django import forms

class QuerySearchForm(forms.Form):
    term = forms.CharField(required=False)
    concept = forms.CharField(required=False)
    limit = forms.IntegerField(required=False)
    neg = forms.BooleanField(required=False)
    def clean(self):
        cleaned_data = super(QuerySearchForm, self).clean()
        term = cleaned_data.get('term')
        concept = cleaned_data.get('concept')
        if term and concept:
            raise forms.ValidationError("Passed both term and concept. Only one allowed.")
        if not term and not concept:
            raise forms.ValidationError("Either term or concept is required")

class TermForm(forms.Form):
    term = forms.CharField(required=False)
    cui = forms.CharField(required=False)
    def clean(self):
        cleaned_data = super(TermForm, self).clean()
        term = cleaned_data.get('term')
        cui = cleaned_data.get('cui')
        if term and cui:
            raise forms.ValidationError("Passed both term and cui. Only one allowed.")
        if not term and not cui:
            raise forms.ValidationError("Either term or cui is required")
