"Methods for call ties backend"
import jwt
import requests
from django.conf import settings

JWT_HEADER = {"alg": "HS256", "typ": "JWT"}
JWT_PAYLOAD = {"name": settings.TIES_NAME, "iss" : "TIES-PITT-auth0"}
TOKEN = jwt.encode(JWT_PAYLOAD, settings.TIES_SECRET, algorithm='HS256', headers=JWT_HEADER)

HEADERS = {
    'Authorization': 'Bearer ' + TOKEN
}

JSON_HEADERS = {
    'Authorization': 'Bearer ' + TOKEN,
    'Content-Type': 'application/json; charset=utf8'
}

def query(params):
    "Fetch documents matching terms"
    return requests.get(settings.TIES_URL + 'query', params=params, headers=HEADERS)

def search(params):
    "Fetch concepts matching terms or cui"
    return requests.get(settings.TIES_URL + 'concepts/search', params=params, headers=HEADERS)

def documents(doc_id):
    "Fetch document by id"
    return requests.get(settings.TIES_URL + 'documents' + '/' + str(doc_id), params={},
                        headers=HEADERS)

def doc_list(body):
    "Fetch document list for patient list"
    return requests.post(settings.TIES_URL + 'documents/list', headers=JSON_HEADERS, data=body)

def doc_filter(body):
    "Filter document list matching terms"
    print("testing", )
    return requests.post(settings.TIES_URL + 'documents/filter', data=body, headers=JSON_HEADERS)
