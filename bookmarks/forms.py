from django import forms

class BookmarksSaveForm(forms.Form):
    content = forms.CharField(strip=False)

class BookmarksForm(forms.Form):
    id = forms.CharField()

class WeekForm(forms.Form):
	week = forms.DateTimeField()
