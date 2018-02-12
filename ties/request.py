import jwt
import requests
from django.conf import settings

jwt_header = {"alg": "HS256", "typ": "JWT"}
jwt_payload = {"name": settings.TIES_NAME, "iss" : "TIES-PITT-auth0"}
token = jwt.encode(jwt_payload, settings.TIES_SECRET, algorithm='HS256', headers=jwt_header)

headers = {
    'Authorization': 'Bearer ' + token
}

def query(params):
    r = requests.get(settings.TIES_URL + 'query', params=params, headers=headers)
    return r

def search(params):
    r = requests.get(settings.TIES_URL + 'concepts/search', params=params, headers=headers)
    return r

def documents(docId):
    r = requests.get(settings.TIES_URL + 'documents' + '/' + str(docId), params={}, headers=headers)
    return r
