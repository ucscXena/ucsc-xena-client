import jwt
import requests
from django.conf import settings

jwt_header = {"alg": "HS256", "typ": "JWT"}
jwt_payload = {"name": settings.TIES_NAME, "iss" : "TIES-PITT-auth0"}
token = jwt.encode(jwt_payload, settings.TIES_SECRET, algorithm='HS256', headers=jwt_header)

headers = {
    'Authorization': 'Bearer ' + token
}

def quote(s):
    return "'" + s + "'"

def query(term):
    r = requests.get(settings.TIES_URL + 'query', params={"term": quote(term)}, headers=headers)
    return r

def search(term):
    r = requests.get(settings.TIES_URL + 'concepts/search', params={"term": quote(term)}, headers=headers)
    return r
