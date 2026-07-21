import logging

from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from sqlalchemy import case

from app.models import Empresa
from app.services.empresas import (
    sync_empresas_from_external_db,
    buscar_codi_emp_por_cpf,
)


empresas_api = Blueprint(
    "empresas_api",
    __name__,
    url_prefix="/api/empresas"
)


@empresas_api.route("", methods=["GET"])
@login_required
def listar_empresas_api():
    status = request.args.get("status", "A").strip()
    query = request.args.get("query", "").strip()
    limit = request.args.get("limit", "").strip()

    consulta = Empresa.query

    if status in ["A", "I"]:
        consulta = consulta.filter(Empresa.stat_emp == status)
    elif status == "todos":
        pass
    else:
        return jsonify({
            "success": False,
            "message": "Status inválido. Use A, I ou todos."
        }), 400

    if query:
        consulta = consulta.filter(
            (Empresa.codigo_empresa.ilike(f"%{query}%")) |
            (Empresa.nome_emp.ilike(f"%{query}%")) |
            (Empresa.apel_emp.ilike(f"%{query}%")) |
            (Empresa.cnpj.ilike(f"%{query}%"))
        )

    consulta = consulta.order_by(Empresa.nome_emp)

    if limit:
        try:
            consulta = consulta.limit(int(limit))
        except ValueError:
            return jsonify({
                "success": False,
                "message": "Limit inválido."
            }), 400

    empresas = consulta.all()

    return jsonify({
        "success": True,
        "empresas": [empresa.to_dict() for empresa in empresas]
    })


@empresas_api.route("/<int:empresa_id>", methods=["GET"])
@login_required
def obter_empresa_por_id_api(empresa_id):
    empresa = Empresa.query.get_or_404(empresa_id)

    return jsonify({
        "success": True,
        "empresa": empresa.to_dict()
    })


@empresas_api.route("/codigo/<codigo_empresa>", methods=["GET"])
@login_required
def obter_empresa_por_codigo_api(codigo_empresa):
    empresa = Empresa.query.filter_by(
        codigo_empresa=str(codigo_empresa).strip()
    ).first()

    if not empresa:
        return jsonify({
            "success": False,
            "message": "Empresa não encontrada."
        }), 404

    return jsonify({
        "success": True,
        "empresa": empresa.to_dict()
    })


@empresas_api.route("/buscar", methods=["GET"])
@login_required
def buscar_empresas_api():
    query = request.args.get("query", "").strip()

    consulta = Empresa.query.filter(Empresa.stat_emp == "A")

    if query:
        consulta = consulta.filter(
            (Empresa.codigo_empresa.ilike(f"%{query}%")) |
            (Empresa.nome_emp.ilike(f"%{query}%")) |
            (Empresa.apel_emp.ilike(f"%{query}%")) |
            (Empresa.cnpj.ilike(f"%{query}%"))
        )

        prioridade = case(
            (Empresa.codigo_empresa == query, 0),
            (Empresa.codigo_empresa.ilike(f"{query}%"), 1),
            else_=2
        )

        empresas = consulta.order_by(prioridade, Empresa.nome_emp).limit(50).all()
    else:
        empresas = consulta.order_by(Empresa.nome_emp).limit(50).all()

    return jsonify({
        "success": True,
        "empresas": [empresa.to_dict() for empresa in empresas]
    })


#pega as informações atuais da dominio e atualiza a tabela empresa
@empresas_api.route("/sincronizar", methods=["POST"])
@login_required
def sincronizar_empresas_api():
    if not (current_user.is_admin or current_user.can_add):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para sincronizar empresas."
        }), 403

    try:
        sync_empresas_from_external_db()

        return jsonify({
            "success": True,
            "message": "Sincronização de empresas concluída com sucesso."
        })

    except Exception as e:
        logging.error(f"Erro ao sincronizar empresas via API: {e}")

        return jsonify({
            "success": False,
            "message": "Erro ao sincronizar empresas."
        }), 500


@empresas_api.route("/buscar-codi-emp-por-cpf", methods=["GET"])
@login_required
def buscar_codi_emp_por_cpf_api():
    cpf = request.args.get("cpf", "").strip()

    if not cpf:
        return jsonify({
            "success": False,
            "message": "CPF é obrigatório.",
            "empresas": []
        }), 400

    codigos = buscar_codi_emp_por_cpf(cpf)

    empresas_info = []

    for codigo in codigos:
        empresa = Empresa.query.filter_by(
            codigo_empresa=str(codigo)
        ).first()

        empresas_info.append({
            "codigo_empresa": str(codigo),
            "nome_emp": empresa.nome_emp if empresa else "Não encontrado",
            "empresa": empresa.to_dict() if empresa else None,
        })

    return jsonify({
        "success": True,
        "empresas": empresas_info
    })
