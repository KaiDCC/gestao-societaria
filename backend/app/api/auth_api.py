import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import timedelta

from flask import request, jsonify, Blueprint, current_app, session
from flask_login import login_user, logout_user, login_required
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

from app import db, limiter
from app.models import User, Responsavel

auth_api_bp = Blueprint('auth_api', __name__)


@auth_api_bp.route('/api/login', methods=['POST'])
@limiter.limit("5 per minute")
def api_login():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        session.permanent = True
        login_user(
            user,
            remember=True,
            duration=timedelta(days=30)
        )

        return jsonify({
            "sucesso": True,
            "msg": "Login realizado com sucesso!",
            "user": {
                "id": user.id,
                "email": user.email,
                "nome": user.nome,
                "is_admin": user.is_admin
            }
        }), 200

    return jsonify({"sucesso": False, "erro": "Credenciais inválidas."}), 401


@auth_api_bp.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    nome = data.get('name', '').strip()
    senha = data.get('password', '').strip()

    if not all([email, nome, senha]):
        return jsonify({"sucesso": False, "erro": "Preencha todos os campos."}), 400
    
    if len(senha) < 6:
        return jsonify({"sucesso": False, "erro": "A senha deve conter no mínimo 6 caracteres."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"sucesso": False, "erro": "Usuário com este email já existe."}), 400

    try:
        novo_usuario = User(
            email=email, nome=nome, is_admin=False,
            can_add=True, can_edit=True, can_delete=False, can_export=True
        )
        novo_usuario.set_password(senha)

        db.session.add(novo_usuario)
        db.session.flush()

        novo_responsavel = Responsavel(nome=nome, usuario_id=novo_usuario.id)
        db.session.add(novo_responsavel)
        db.session.commit()

        return jsonify({"sucesso": True, "msg": "Usuário criado com sucesso!"}), 201

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro no registro via API: {e}")
        return jsonify({"sucesso": False, "erro": "Erro no servidor."}), 500


@auth_api_bp.route('/api/logout', methods=['POST'])
@login_required
def api_logout():
    logout_user()
    return jsonify({"sucesso": True, "msg": "Deslogado com sucesso."}), 200


@auth_api_bp.route('/api/forgot-password', methods=['POST'])
def api_forgot_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip()

    if not email:
        return jsonify({"sucesso": False, "erro": "O e-mail é obrigatório."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({
            "sucesso": True,
            "msg": "Se o e-mail existir em nossa base, o link foi enviado."
        }), 200

    try:
        serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])

        token = serializer.dumps(
            user.email,
            salt=current_app.config["PASSWORD_RESET_SALT"]
        )

        reset_link = (
            f"{current_app.config['FRONTEND_URL']}/reset-password?token={token}"
        )

        smtp_server = current_app.config["SMTP_SERVER"]
        smtp_port = current_app.config["SMTP_PORT"]
        smtp_user = current_app.config["SMTP_USER"]
        smtp_password = current_app.config["SMTP_PASSWORD"]
        smtp_from = current_app.config["SMTP_FROM"]

        if not all([smtp_server, smtp_port, smtp_user, smtp_password, smtp_from]):
            logging.error("Configuração SMTP incompleta no .env")
            return jsonify({
                "sucesso": False,
                "erro": "Configuração de e-mail incompleta no servidor."
            }), 500

        msg = MIMEMultipart('alternative')
        msg["From"] = smtp_from
        msg["To"] = email
        msg["Subject"] = "Recuperação de Senha - Sistema Societário"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 30px; margin: 0;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
                <div style="background-color: #2e3d45; padding: 30px; text-align: center; border-bottom: 4px solid #a5c4d6;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px; font-weight: 900;">
                        SISTEMA SOCIETÁRIO
                    </h2>
                </div>

                <div style="padding: 40px 30px; text-align: center;">
                    <p style="color: #2e3d45; font-size: 16px; margin-bottom: 10px; font-weight: bold;">
                        Olá, {user.nome}!
                    </p>

                    <p style="color: #5c5f66; font-size: 14px; margin-bottom: 30px; line-height: 1.6;">
                        Recebemos uma solicitação para redefinir a senha da sua conta de acesso.
                        Clique no botão abaixo para escolher uma nova senha.
                    </p>

                    <a href="{reset_link}" style="display: inline-block; background-color: #06486a; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                        Redefinir Senha
                    </a>

                    <p style="color: #aca9a6; font-size: 11px; margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 20px; line-height: 1.5;">
                        Se você não solicitou esta redefinição, ignore este e-mail com segurança.<br>
                        Este link expira automaticamente em 15 minutos.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(smtp_server, smtp_port, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        return jsonify({
            "sucesso": True,
            "msg": "Link de recuperação enviado com sucesso."
        }), 200

    except Exception as e:
        logging.error(f"Erro no envio de e-mail SMTP: {e}")
        return jsonify({
            "sucesso": False,
            "erro": "Não foi possível disparar o e-mail de recuperação."
        }), 500


@auth_api_bp.route('/api/reset-password', methods=['POST'])
def api_reset_password():
    data = request.get_json() or {}
    token = data.get('token', '').strip()
    nova_senha = data.get('password', '').strip()

    if not all([token, nova_senha]):
        return jsonify({
            "sucesso": False,
            "erro": "Token e nova senha são obrigatórios."
        }), 400

    try:
        serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])

        email = serializer.loads(
            token,
            salt=current_app.config["PASSWORD_RESET_SALT"],
            max_age=current_app.config["PASSWORD_RESET_EXPIRATION_SECONDS"]
        )

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({
                "sucesso": False,
                "erro": "Usuário não encontrado."
            }), 404

        user.set_password(nova_senha)
        db.session.commit()

        return jsonify({
            "sucesso": True,
            "msg": "Senha redefinida com sucesso! Pode fazer login."
        }), 200

    except SignatureExpired:
        return jsonify({
            "sucesso": False,
            "erro": "O link de recuperação expirou."
        }), 400

    except BadSignature:
        return jsonify({
            "sucesso": False,
            "erro": "Link de recuperação inválido ou corrompido."
        }), 400

    except Exception as e:
        logging.error(f"Erro ao redefinir senha: {e}")
        return jsonify({
            "sucesso": False,
            "erro": "Erro no servidor ao redefinir senha."
        }), 500
