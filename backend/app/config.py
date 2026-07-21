import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

def path_from_env(nome_variavel, caminho_padrao):
    valor = os.getenv(nome_variavel, caminho_padrao)

    caminho = Path(valor)

    if caminho.is_absolute():
        return caminho

    return BASE_DIR / caminho

def relative_path_from_env(nome_variavel, caminho_padrao):
    valor = os.getenv(nome_variavel, caminho_padrao)

    return str(valor).replace("\\", "/").strip("/")

class Config:
    BASE_DIR = BASE_DIR

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    PERMANENT_SESSION_LIFETIME = timedelta(hours=9)
    SESSION_REFRESH_EACH_REQUEST = True

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False

    SMTP_SERVER = os.getenv("SMTP_SERVER")
    SMTP_PORT = int(os.getenv("SMTP_PORT"))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    SMTP_FROM = os.getenv("SMTP_FROM") or SMTP_USER

    FRONTEND_URL = os.getenv("FRONTEND_URL").rstrip("/")

    PASSWORD_RESET_SALT = os.getenv(
        "PASSWORD_RESET_SALT",
        "recuperacao-senha-salt"
    )

    PASSWORD_RESET_EXPIRATION_SECONDS = int(
        os.getenv("PASSWORD_RESET_EXPIRATION_SECONDS", 900)
    )

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    ALVARAS_UPLOAD_FOLDER = path_from_env(
        "ALVARAS_UPLOAD_FOLDER",
        "static/uploads/alvaras"
    )
    CERTIFICADOS_UPLOAD_FOLDER = path_from_env(
        "CERTIFICADOS_UPLOAD_FOLDER",
        "static/uploads/certificados"
    )
    ECPFS_UPLOAD_FOLDER = path_from_env(
        "ECPFS_UPLOAD_FOLDER",
        os.getenv("CERTIFICADOS_UPLOAD_FOLDER", "static/uploads/certificados")
    )
    CONTRATOS_TEMPLATES_FOLDER = path_from_env(
        "CONTRATOS_TEMPLATES_FOLDER",
        "app/document_templates"
    )
    CONTRATOS_OUTPUT_FOLDER = path_from_env(
        "CONTRATOS_OUTPUT_FOLDER",
        "static/generated/contratos"
    )
    CONTRATOS_OUTPUT_RELATIVE = relative_path_from_env(
        "CONTRATOS_OUTPUT_FOLDER",
        "static/generated/contratos"
    )

    MAX_CONTENT_LENGTH = int(
        os.getenv("MAX_CONTENT_LENGTH", 16 * 1024 * 1024)
    )

    TRELLO_API_KEY = os.getenv("TRELLO_API_KEY")
    TRELLO_TOKEN = os.getenv("TRELLO_TOKEN")
    TRELLO_ALVARAS_LIST_ID = os.getenv("TRELLO_ALVARAS_LIST_ID")
    TRELLO_CERTIFICADOS_LIST_ID = os.getenv("TRELLO_CERTIFICADOS_LIST_ID")

    NOTIFICACOES_PROVIDER = os.getenv("NOTIFICACOES_PROVIDER", "trello")

    SUPABASE_SYNC_URL = os.getenv("SUPABASE_SYNC_URL")
    SYNC_TOKEN = os.getenv("SYNC_TOKEN")
    SISTEMA_ID = os.getenv("SISTEMA_ID")

    INTRANET_TIPO_SYNC = os.getenv("INTRANET_TIPO_SYNC", "notificacao_validade")

    DOMINIO_HOST = os.getenv("DOMINIO_HOST")
    DOMINIO_PORT = os.getenv("DOMINIO_PORT")
    DOMINIO_DB = os.getenv("DOMINIO_DB")
    DOMINIO_USER = os.getenv("DOMINIO_USER")
    DOMINIO_PASSWORD = os.getenv("DOMINIO_PASSWORD")
    DOMINIO_ENGINE = os.getenv("DOMINIO_ENGINE", "dominio")
    DOMINIO_ODBC_DRIVER = os.getenv(
        "DOMINIO_ODBC_DRIVER",
        "SQL Anywhere 17"
    )

    FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
    FLASK_PORT = int(os.getenv("FLASK_PORT"))
    FLASK_DEBUG = os.getenv(
        "FLASK_DEBUG",
        "False"
    ).lower() in ("true", "1", "yes")
