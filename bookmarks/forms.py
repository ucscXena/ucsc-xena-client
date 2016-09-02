from django import forms

class UserBookmarksSelect(forms.Form):
    def __init__(self, list, *args, **kwargs):
        super(UserBookmarksSelect,self).__init__(*args, **kwargs)
        self.fields['bookmarks']= forms.MultipleChoiceField(choices=list, widget=forms.CheckboxSelectMultiple())

class BookmarksSaveForm(forms.Form):
    content = forms.CharField()
    note = forms.CharField(required=False)

class UserBookmarksSaveForm(forms.Form):
    oldName = forms.CharField()
    name = forms.CharField(required=False)
    id = forms.CharField()
    note = forms.CharField(required=False)

class BookmarksForm(forms.Form):
    id = forms.CharField()
