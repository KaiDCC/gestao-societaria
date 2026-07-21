from app.api.auth_api import auth_api_bp
from app.api.contratos_api import contratos_api
from app.api.empresas_api import empresas_api
from app.api.alvaras_api import alvaras_api
from app.api.certificados_api import certificados_api
from app.api.ecpfs_api import ecpfs_api
from app.api.usuarios_api import usuarios_api
from app.api.dashboard_api import dashboard_api
from app.api.assessorias_api import assessorias_api

def register_api_routes(app):
    app.register_blueprint(auth_api_bp)
    app.register_blueprint(contratos_api)
    app.register_blueprint(empresas_api)
    app.register_blueprint(alvaras_api)
    app.register_blueprint(certificados_api)
    app.register_blueprint(ecpfs_api)
    app.register_blueprint(usuarios_api)
    app.register_blueprint(dashboard_api)
    app.register_blueprint(assessorias_api)


