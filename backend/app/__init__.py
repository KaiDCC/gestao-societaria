from app.utils.sqlany_env import preparar_ambiente_sqlanywhere

preparar_ambiente_sqlanywhere()

import os

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from app.config import Config

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[
        "200 per day",
        "50 per hour"
    ],
    storage_uri="memory://"
)


def create_app():
    app = Flask(
        __name__,
        template_folder=str(Config.BASE_DIR / "templates"),
        static_folder=str(Config.BASE_DIR / "static")
    )

    app.config.from_object(Config)
    app.json.ensure_ascii = False

    os.makedirs(
        app.config["ALVARAS_UPLOAD_FOLDER"],
        exist_ok=True
    )

    os.makedirs(
        app.config["CERTIFICADOS_UPLOAD_FOLDER"],
        exist_ok=True
    )

    os.makedirs(
        app.config["ECPFS_UPLOAD_FOLDER"],
        exist_ok=True
    )

    os.makedirs(
        app.config["CONTRATOS_OUTPUT_FOLDER"],
        exist_ok=True
    )

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    limiter.init_app(app)

    @login_manager.unauthorized_handler
    def unauthorized():
        return {
            "success": False,
            "message": "Usuário não autenticado."
        }, 401

    from app.models import User

    @login_manager.user_loader
    def load_user(user_id):
        try:
            return db.session.get(User, int(user_id))
        except (TypeError, ValueError):
            return None

    from app.api import register_api_routes

    register_api_routes(app)

    return app