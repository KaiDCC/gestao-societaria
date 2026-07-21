import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


#cria uma sessão requests.Session com retry automático
def criar_trello_session():
    trello_session = requests.Session()

    trello_retries = Retry(
        total=5,
        backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST"]
    )

    trello_session.mount(
        "https://",
        HTTPAdapter(max_retries=trello_retries)
    )

    return trello_session
