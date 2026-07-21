import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from flask import current_app


def criar_intranet_session():
    session = requests.Session()

    retries = Retry(
        total=5,
        backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST"]
    )

    session.mount(
        "https://",
        HTTPAdapter(max_retries=retries)
    )

    return session


intranet_session = criar_intranet_session()


def enviar_payload_intranet(payload):
    url = current_app.config.get("SUPABASE_SYNC_URL")
    token = current_app.config.get("SYNC_TOKEN")

    if not url:
        raise RuntimeError("SUPABASE_SYNC_URL não configurada no .env")

    if not token:
        raise RuntimeError("SYNC_TOKEN não configurado no .env")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    resp = intranet_session.post(
        url,
        json=payload,
        headers=headers,
        timeout=(5, 45)
    )

    try:
        resposta_json = resp.json()
    except Exception:
        resposta_json = None

    if not resp.ok:
        detalhe = resposta_json if resposta_json else resp.text
        raise RuntimeError(
            f"Erro HTTP ao enviar para intranet: {resp.status_code} - {detalhe}"
        )

    if isinstance(resposta_json, dict) and resposta_json.get("ok") is False:
        raise RuntimeError(
            f"Edge Function recusou o payload: {resposta_json}"
        )

    return resposta_json