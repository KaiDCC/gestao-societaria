import logging

from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from app import db
from app.models import User, Responsavel, Alvara


usuarios_api = Blueprint(
    "usuarios_api",
    __name__,
    url_prefix="/api/usuarios"
)


def usuario_response(usuario):
    responsaveis = [
        responsavel.to_dict()
        for responsavel in usuario.responsaveis
    ]

    return {
        "id": usuario.id,
        "email": usuario.email,
        "nome": usuario.nome,
        "is_admin": usuario.is_admin,
        "can_add": usuario.can_add,
        "can_edit": usuario.can_edit,
        "can_delete": usuario.can_delete,
        "can_export": usuario.can_export,
        "responsaveis": responsaveis,
        "responsavel_principal": responsaveis[0] if responsaveis else None,
    }


def responsavel_response(responsavel):
    em_uso = Alvara.query.filter_by(
        responsavel_id=responsavel.id
    ).first() is not None

    return {
        "id": responsavel.id,
        "nome": responsavel.nome,
        "usuario_id": responsavel.usuario_id,
        "usuario_nome": responsavel.usuario.nome if responsavel.usuario else None,
        "em_uso_alvara": em_uso,
    }


def exige_admin():
    if not current_user.is_authenticated or not current_user.is_admin:
        return jsonify({
            "success": False,
            "message": "Permissão inválida. Apenas administradores podem acessar usuários."
        }), 403

    return None


@usuarios_api.route("", methods=["GET"])
@login_required
def listar_usuarios_api():
    erro = exige_admin()

    if erro:
        return erro

    query = request.args.get("query", "").strip()

    consulta = User.query

    if query:
        consulta = consulta.filter(
            db.or_(
                User.email.ilike(f"%{query}%"),
                User.nome.ilike(f"%{query}%"),
            )
        )

    usuarios = consulta.order_by(User.nome.asc()).all()

    return jsonify({
        "success": True,
        "usuarios": [
            usuario_response(usuario)
            for usuario in usuarios
        ]
    })


@usuarios_api.route("/me", methods=["GET"])
@login_required
def usuario_atual_api():
    return jsonify({
        "success": True,
        "user": usuario_response(current_user)
    })


@usuarios_api.route("/<int:usuario_id>", methods=["GET"])
@login_required
def obter_usuario_api(usuario_id):
    erro = exige_admin()

    if erro:
        return erro

    usuario = User.query.get_or_404(usuario_id)

    return jsonify({
        "success": True,
        "usuario": usuario_response(usuario)
    })


@usuarios_api.route("", methods=["POST"])
@login_required
def criar_usuario_api():
    erro = exige_admin()

    if erro:
        return erro

    payload = request.get_json(silent=True) or {}

    email = str(payload.get("email", "")).strip()
    nome = str(payload.get("nome", "")).strip()
    senha = str(payload.get("senha", "")).strip()

    is_admin = bool(payload.get("is_admin", False))
    can_add = bool(payload.get("can_add", False))
    can_edit = bool(payload.get("can_edit", False))
    can_delete = bool(payload.get("can_delete", False))
    can_export = bool(payload.get("can_export", False))

    if not all([email, nome, senha]):
        return jsonify({
            "success": False,
            "message": "Email, nome e senha são obrigatórios."
        }), 400

    if User.query.filter_by(email=email).first():
        return jsonify({
            "success": False,
            "message": "Usuário com este email já existe."
        }), 400

    if Responsavel.query.filter_by(nome=nome).first():
        return jsonify({
            "success": False,
            "message": "Já existe um responsável com este nome."
        }), 400

    try:
        usuario = User(
            email=email,
            nome=nome,
            is_admin=is_admin,
            can_add=can_add,
            can_edit=can_edit,
            can_delete=can_delete,
            can_export=can_export,
        )

        usuario.set_password(senha)

        db.session.add(usuario)
        db.session.flush()

        responsavel = Responsavel(
            nome=nome,
            usuario_id=usuario.id
        )

        db.session.add(responsavel)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Usuário criado com sucesso.",
            "usuario": usuario_response(usuario)
        }), 201

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao criar usuário via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao criar usuário: {e}"
        }), 500


@usuarios_api.route("/<int:usuario_id>", methods=["PUT"])
@login_required
def atualizar_usuario_api(usuario_id):
    erro = exige_admin()

    if erro:
        return erro

    usuario = User.query.get_or_404(usuario_id)

    payload = request.get_json(silent=True) or {}

    email = str(payload.get("email", "")).strip()
    nome = str(payload.get("nome", "")).strip()
    senha = str(payload.get("senha", "")).strip()

    is_admin = bool(payload.get("is_admin", False))
    can_add = bool(payload.get("can_add", False))
    can_edit = bool(payload.get("can_edit", False))
    can_delete = bool(payload.get("can_delete", False))
    can_export = bool(payload.get("can_export", False))

    if not all([email, nome]):
        return jsonify({
            "success": False,
            "message": "Email e nome são obrigatórios."
        }), 400

    usuario_email_existente = User.query.filter(
        User.email == email,
        User.id != usuario.id
    ).first()

    if usuario_email_existente:
        return jsonify({
            "success": False,
            "message": "Outro usuário já possui este email."
        }), 400

    responsavel_nome_existente = Responsavel.query.filter(
        Responsavel.nome == nome,
        Responsavel.usuario_id != usuario.id
    ).first()

    if responsavel_nome_existente:
        return jsonify({
            "success": False,
            "message": "Já existe outro responsável com este nome."
        }), 400

    try:
        responsavel = Responsavel.query.filter_by(
            usuario_id=usuario.id
        ).first()

        usuario.email = email
        usuario.nome = nome

        if senha:
            usuario.set_password(senha)

        usuario.is_admin = is_admin
        usuario.can_add = can_add
        usuario.can_edit = can_edit
        usuario.can_delete = can_delete
        usuario.can_export = can_export

        if responsavel:
            responsavel.nome = nome
        else:
            responsavel = Responsavel(
                nome=nome,
                usuario_id=usuario.id
            )
            db.session.add(responsavel)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Usuário atualizado com sucesso.",
            "usuario": usuario_response(usuario)
        })

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao atualizar usuário via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao atualizar usuário: {e}"
        }), 500


@usuarios_api.route("/<int:usuario_id>", methods=["DELETE"])
@login_required
def excluir_usuario_api(usuario_id):
    erro = exige_admin()

    if erro:
        return erro

    usuario = User.query.get_or_404(usuario_id)

    if usuario.id == current_user.id:
        return jsonify({
            "success": False,
            "message": "Você não pode excluir o próprio usuário logado."
        }), 400

    responsaveis = Responsavel.query.filter_by(
        usuario_id=usuario.id
    ).all()

    for responsavel in responsaveis:
        if Alvara.query.filter_by(responsavel_id=responsavel.id).first():
            return jsonify({
                "success": False,
                "message": (
                    f"Não é possível excluir o usuário porque o responsável "
                    f"'{responsavel.nome}' está vinculado a alvarás."
                )
            }), 400

    try:
        for responsavel in responsaveis:
            db.session.delete(responsavel)

        db.session.delete(usuario)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Usuário excluído com sucesso."
        })

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao excluir usuário via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao excluir usuário: {e}"
        }), 500


@usuarios_api.route("/responsaveis", methods=["GET"])
@login_required
def listar_responsaveis_api():
    responsaveis = Responsavel.query.order_by(
        Responsavel.nome.asc()
    ).all()

    return jsonify({
        "success": True,
        "responsaveis": [
            responsavel_response(responsavel)
            for responsavel in responsaveis
        ]
    })


@usuarios_api.route("/responsaveis/<int:responsavel_id>", methods=["GET"])
@login_required
def obter_responsavel_api(responsavel_id):
    responsavel = Responsavel.query.get_or_404(responsavel_id)

    return jsonify({
        "success": True,
        "responsavel": responsavel_response(responsavel)
    })
