import logging
import os
from collections import defaultdict
from datetime import datetime
from io import BytesIO
from urllib.parse import quote

import pandas as pd
from flask import Blueprint, jsonify, request, current_app, send_file, send_from_directory
from flask_login import login_required, current_user
from sqlalchemy import cast, case
from werkzeug.utils import secure_filename
from app import db

from app.models import Empresa, Alvara, TipoAlvara, Responsavel


alvaras_api = Blueprint(
    "alvaras_api",
    __name__,
    url_prefix="/api/alvaras"
)

def pasta_uploads_alvaras():
    pasta = current_app.config["ALVARAS_UPLOAD_FOLDER"]
    pasta.mkdir(parents=True, exist_ok=True)

    return pasta

def alvara_response(alvara):
    dados = alvara.to_dict()

    if alvara.empresa:
        dados["empresa_codigo"] = alvara.empresa.codigo_empresa
        dados["empresa_nome"] = alvara.empresa.nome_emp
        dados["empresa_cnpj"] = alvara.empresa.cnpj
        dados["empresa_status"] = alvara.empresa.stat_emp

    if alvara.anexo:
        dados["anexo_url"] = f"/api/alvaras/anexos/{quote(alvara.anexo)}"
    else:
        dados["anexo_url"] = None

    return dados


def aplicar_filtros_alvaras():
    query = request.args.get("query", "").strip()
    sort_by = request.args.get("sort_by", "").strip()
    tipo_filter = request.args.get("tipo_filter", "").strip()
    status_empresa = request.args.get("status_empresa", "A").strip()

    base_query = Alvara.query.join(Empresa)

    if status_empresa in ["A", "I"]:
        base_query = base_query.filter(Empresa.stat_emp == status_empresa)
    elif status_empresa == "todos":
        pass
    else:
        return None, {
            "success": False,
            "message": "Status da empresa inválido. Use A, I ou todos."
        }, 400

    if query:
        filtros = [
            Alvara.tipo.ilike(f"%{query}%"),
            Alvara.responsavel.ilike(f"%{query}%"),
            Empresa.nome_emp.ilike(f"%{query}%"),
            Empresa.codigo_empresa.ilike(f"%{query}%"),
            Alvara.observacoes.ilike(f"%{query}%"),
            Empresa.cnpj.ilike(f"%{query}%"),
        ]

        if "dispensada" in query.lower():
            filtros.append(Alvara.dispensada.is_(True))

        if "indeterminada" in query.lower():
            filtros.append(Alvara.indeterminada.is_(True))

        base_query = base_query.filter(db.or_(*filtros))

    if tipo_filter:
        base_query = base_query.filter(
            Alvara.tipo.ilike(f"%{tipo_filter}%")
        )

    if sort_by == "empresa" or not sort_by:
        if query:
            prioridade = case(
                (Empresa.codigo_empresa == query, 0),
                (Empresa.codigo_empresa.ilike(f"{query}%"), 1),
                else_=2
            )
            base_query = base_query.order_by(prioridade, Empresa.nome_emp.asc())
        else:
            base_query = base_query.order_by(Empresa.nome_emp.asc())
    elif sort_by == "codigo":
        base_query = base_query.order_by(cast(Empresa.codigo_empresa, db.Integer).asc())
    elif sort_by == "validade":
        base_query = base_query.order_by(Alvara.validade.asc())
    else:
        base_query = base_query.order_by(Empresa.nome_emp.asc())
    return base_query, None, None

@alvaras_api.route("", methods=["GET"])
@login_required
def listar_alvaras_api():
    base_query, erro, status_code = aplicar_filtros_alvaras()

    if erro:
        return jsonify(erro), status_code

    alvaras = base_query.all()

    agrupado = request.args.get("agrupado", "true").strip().lower() == "true"

    resumo = {
        "no_prazo": sum(1 for a in alvaras if a.status == "No Prazo"),
        "a_vencer": sum(1 for a in alvaras if a.status == "A Vencer"),
        "vencidos": sum(1 for a in alvaras if a.status == "Vencido"),
        "sem_validade": sum(1 for a in alvaras if a.status == "Sem Validade"),
        "total": len(alvaras),
    }

    if not agrupado:
        return jsonify({
            "success": True,
            "resumo": resumo,
            "alvaras": [alvara_response(a) for a in alvaras],
        })

    grupos = defaultdict(list)

    for alvara in alvaras:
        empresa_nome = alvara.empresa.nome_emp if alvara.empresa else "Sem empresa"
        empresa_codigo = alvara.empresa.codigo_empresa if alvara.empresa else ""

        chave = f"{empresa_nome}||{empresa_codigo}"

        grupos[chave].append(alvara_response(alvara))

    empresas = []

    for chave, itens in grupos.items():
        empresa_nome, empresa_codigo = chave.split("||")

        empresas.append({
            "empresa_nome": empresa_nome,
            "empresa_codigo": empresa_codigo,
            "alvaras": itens,
        })

    return jsonify({
        "success": True,
        "resumo": resumo,
        "empresas": empresas,
    })


@alvaras_api.route("/resumo", methods=["GET"])
@login_required
def resumo_alvaras_api():
    base_query, erro, status_code = aplicar_filtros_alvaras()

    if erro:
        return jsonify(erro), status_code

    alvaras = base_query.all()

    return jsonify({
        "success": True,
        "resumo": {
            "no_prazo": sum(1 for a in alvaras if a.status == "No Prazo"),
            "a_vencer": sum(1 for a in alvaras if a.status == "A Vencer"),
            "vencidos": sum(1 for a in alvaras if a.status == "Vencido"),
            "sem_validade": sum(1 for a in alvaras if a.status == "Sem Validade"),
            "total": len(alvaras),
        }
    })


@alvaras_api.route("/<int:alvara_id>", methods=["GET"])
@login_required
def obter_alvara_api(alvara_id):
    alvara = Alvara.query.get_or_404(alvara_id)

    return jsonify({
        "success": True,
        "alvara": alvara_response(alvara)
    })


@alvaras_api.route("", methods=["POST"])
@login_required
def criar_alvara_api():
    if not (current_user.is_admin or current_user.can_add):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para adicionar alvarás."
        }), 403

    try:
        empresa_id = request.form.get("empresa_id")
        tipo = request.form.get("tipo")
        responsavel_id = request.form.get("responsavel_id")
        validade_str = request.form.get("validade")
        notificacao_dias_str = request.form.get("notificacao_dias")
        observacoes = request.form.get("observacoes")

        dispensada = request.form.get("dispensada") in ["true", "1", "on", "sim"]
        indeterminada = request.form.get("indeterminada") in ["true", "1", "on", "sim"]
        arquivado = request.form.get("arquivado") in ["true", "1", "on", "sim"]
        em_renovacao = request.form.get("em_renovacao") in ["true", "1", "on", "sim"]
        pendente = request.form.get("pendente") in ["true", "1", "on", "sim"]

        if not all([empresa_id, tipo, responsavel_id, notificacao_dias_str]):
            return jsonify({
                "success": False,
                "message": "Empresa, tipo, responsável e notificação de dias são obrigatórios."
            }), 400

        validade = (
            datetime.strptime(validade_str, "%Y-%m-%d").date()
            if validade_str
            else None
        )

        notificacao_dias = int(notificacao_dias_str) if notificacao_dias_str else 30

        resp_obj = Responsavel.query.get(responsavel_id)
        nome_responsavel = resp_obj.nome if resp_obj else "Sem Responsável"

        novo_alvara = Alvara(
            empresa_id=int(empresa_id),
            tipo=tipo,
            responsavel=nome_responsavel,
            responsavel_id=int(responsavel_id),
            validade=validade,
            notificacao_dias=notificacao_dias,
            observacoes=observacoes,
            dispensada=dispensada,
            indeterminada=indeterminada,
            arquivado=arquivado,
            em_renovacao=em_renovacao,
            pendente=pendente,
        )

        db.session.add(novo_alvara)
        db.session.commit()

        arquivo = request.files.get("anexo")

        if arquivo and arquivo.filename:
            original_filename = secure_filename(arquivo.filename)
            base, ext = os.path.splitext(original_filename)

            cnpj_base = novo_alvara.empresa.cnpj_base if novo_alvara.empresa else ""

            filename = f"{base}_{novo_alvara.id}_{cnpj_base}{ext}"

            pasta = pasta_uploads_alvaras()
            pasta.mkdir(parents=True, exist_ok=True)

            file_path = pasta / filename

            arquivo.save(file_path)

            novo_alvara.anexo = filename
            db.session.commit()

        return jsonify({
            "success": True,
            "message": "Alvará criado com sucesso.",
            "alvara": alvara_response(novo_alvara)
        }), 201

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao criar alvará via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao criar alvará: {e}"
        }), 500


@alvaras_api.route("/<int:alvara_id>", methods=["PUT"])
@login_required
def atualizar_alvara_api(alvara_id):
    if not (current_user.is_admin or current_user.can_edit):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para editar alvarás."
        }), 403

    alvara = Alvara.query.get_or_404(alvara_id)

    try:
        empresa_id = request.form.get("empresa_id")
        tipo = request.form.get("tipo")
        responsavel_id = request.form.get("responsavel_id")
        validade_str = request.form.get("validade")
        notificacao_dias_str = request.form.get("notificacao_dias")
        observacoes = request.form.get("observacoes")

        dispensada = request.form.get("dispensada") in ["true", "1", "on", "sim"]
        indeterminada = request.form.get("indeterminada") in ["true", "1", "on", "sim"]
        arquivado = request.form.get("arquivado") in ["true", "1", "on", "sim"]
        em_renovacao = request.form.get("em_renovacao") in ["true", "1", "on", "sim"]
        pendente = request.form.get("pendente") in ["true", "1", "on", "sim"]

        if not all([empresa_id, tipo, responsavel_id, notificacao_dias_str]):
            return jsonify({
                "success": False,
                "message": "Empresa, tipo, responsável e notificação de dias são obrigatórios."
            }), 400

        validade = (
            datetime.strptime(validade_str, "%Y-%m-%d").date()
            if validade_str
            else None
        )

        resp_obj = Responsavel.query.get(responsavel_id)
        nome_responsavel = resp_obj.nome if resp_obj else "Sem Responsável"

        alvara.empresa_id = int(empresa_id)
        alvara.tipo = tipo
        alvara.responsavel = nome_responsavel
        alvara.responsavel_id = int(responsavel_id)
        alvara.validade = validade
        alvara.notificacao_dias = int(notificacao_dias_str)
        alvara.observacoes = observacoes
        alvara.dispensada = dispensada
        alvara.indeterminada = indeterminada
        alvara.arquivado = arquivado
        alvara.em_renovacao = em_renovacao
        alvara.pendente = pendente

        arquivo = request.files.get("anexo")

        if arquivo and arquivo.filename:
            pasta = pasta_uploads_alvaras()
            pasta.mkdir(parents=True, exist_ok=True)

            if alvara.anexo:
                caminho_antigo = pasta / alvara.anexo
                if caminho_antigo.exists():
                    try:
                        caminho_antigo.unlink()
                    except Exception as e:
                        logging.warning(f"Não consegui excluir o arquivo antigo {alvara.anexo}: {e}")

            original_filename = secure_filename(arquivo.filename)
            base, ext = os.path.splitext(original_filename)

            filename = f"alvara_{alvara.id}_{int(datetime.now().timestamp())}{ext}"
            file_path = pasta / filename

            arquivo.save(file_path)

            alvara.anexo = filename

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Alvará atualizado com sucesso.",
            "alvara": alvara_response(alvara)
        })

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao atualizar alvará via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao atualizar alvará: {e}"
        }), 500


@alvaras_api.route("/<int:alvara_id>", methods=["DELETE"])
@login_required
def excluir_alvara_api(alvara_id):
    if not (current_user.is_admin or current_user.can_delete):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para excluir alvarás."
        }), 403

    alvara = Alvara.query.get_or_404(alvara_id)

    anexo = alvara.anexo

    try:
        db.session.delete(alvara)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao excluir alvará do banco via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao excluir alvará do banco: {e}"
        }), 500

    if anexo:
        try:
            pasta = pasta_uploads_alvaras()
            caminho = pasta / anexo

            if caminho.exists():
                caminho.unlink()

        except Exception as e:
            logging.warning(f"Aviso: alvará excluído do banco, mas não foi possível excluir o arquivo {anexo}: {e}")

    return jsonify({
        "success": True,
        "message": "Alvará excluído com sucesso."
    })

@alvaras_api.route("/por-status", methods=["GET"])
@login_required
def listar_alvaras_por_status_api():
    status = request.args.get("status", "").strip()

    if status not in ["No Prazo", "A Vencer", "Vencido", "Sem Validade"]:
        return jsonify({
            "success": False,
            "message": "Status inválido."
        }), 400

    base_query, erro, status_code = aplicar_filtros_alvaras()

    if erro:
        return jsonify(erro), status_code

    alvaras = [
        alvara
        for alvara in base_query.all()
        if alvara.status == status
    ]

    return jsonify({
        "success": True,
        "alvaras": [alvara_response(a) for a in alvaras]
    })


@alvaras_api.route("/anexos/<path:filename>", methods=["GET"])
@login_required
def obter_anexo_alvara_api(filename):
    pasta = pasta_uploads_alvaras()

    caminho = pasta / filename

    current_app.logger.info(f"Buscando anexo de alvará em: {caminho}")

    if not caminho.exists():
        return jsonify({
            "success": False,
            "message": "Arquivo não encontrado.",
            "filename": filename,
            "pasta_procurada": str(pasta),
            "caminho_completo": str(caminho),
        }), 404

    return send_from_directory(
        pasta,
        filename
    )


@alvaras_api.route("/exportar", methods=["GET"])
@login_required
def exportar_alvaras_api():
    if not (current_user.is_admin or current_user.can_export):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para exportar alvarás."
        }), 403

    status = request.args.get("status", "all").strip()

    base_query, erro, status_code = aplicar_filtros_alvaras()

    if erro:
        return jsonify(erro), status_code

    todos = base_query.all()

    status_filtros = request.args.get("status_filtros")
    responsavel_filtros = request.args.get("responsavel_filtros")
    tipo_filtros = request.args.get("tipo_filtros")
    mes_ano_filtro = request.args.get("mes_ano_filtro")

    status_list = status_filtros.split(",") if status_filtros else []
    responsavel_list = responsavel_filtros.split(",") if responsavel_filtros else []
    tipo_list = tipo_filtros.split(",") if tipo_filtros else []

    alvaras = []
    for a in todos:
        if status not in ["all", "Todos", "Filtrados"] and a.status != status:
            continue
            
        if status_list and a.status not in status_list:
            continue
            
        nome_responsavel = a.responsavel_rel.nome if a.responsavel_rel else a.responsavel
        if responsavel_list and nome_responsavel not in responsavel_list:
            continue
            
        if tipo_list and a.tipo not in tipo_list:
            continue
            
        if mes_ano_filtro:
            if not a.validade:
                continue
            if a.validade.strftime("%Y-%m") != mes_ano_filtro:
                continue

        alvaras.append(a)

    registros = []

    for a in alvaras:
        registros.append({
            "Código da empresa": a.empresa.codigo_empresa if a.empresa else "",
            "Nome": a.empresa.nome_emp if a.empresa else "",
            "CNPJ": a.empresa.cnpj if a.empresa else "",
            "Tipo de licença": a.tipo,
            "Responsável": a.responsavel_rel.nome if a.responsavel_rel else a.responsavel,
            "Validade": a.validade,
            "Notificação dias": a.notificacao_dias,
            "Anexo": a.anexo,
            "Observações": a.observacoes,
            "Status": a.status,
            "Dispensada": "Sim" if a.dispensada else "Não",
            "Indeterminada": "Sim" if a.indeterminada else "Não",
            "Arquivado": "Sim" if a.arquivado else "Não",
            "Em Renovação": "Sim" if a.em_renovacao else "Não",
            "Pendente": "Sim" if a.pendente else "Não",
        })

    df = pd.DataFrame(registros)

    if "Validade" in df.columns:
        df["Validade"] = pd.to_datetime(
            df["Validade"],
            format="%Y-%m-%d",
            errors="coerce"
        )

    output = BytesIO()
    sheet = f"Alvaras_{status}"

    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(
            writer,
            index=False,
            sheet_name=sheet[:31]
        )

        ws = writer.sheets[sheet[:31]]

        if "Validade" in df.columns:
            idx = df.columns.get_loc("Validade") + 1

            for row in ws.iter_rows(
                min_row=2,
                min_col=idx,
                max_col=idx
            ):
                for cell in row:
                    cell.number_format = "DD/MM/YYYY"

    output.seek(0)

    return send_file(
        output,
        download_name=f"Alvaras_{status}.xlsx",
        as_attachment=True
    )


@alvaras_api.route("/tipos", methods=["GET"])
@login_required
def listar_tipos_alvaras_api():
    tipos = TipoAlvara.query.order_by(TipoAlvara.nome.asc()).all()

    return jsonify({
        "success": True,
        "tipos": [tipo.to_dict() for tipo in tipos]
    })


@alvaras_api.route("/tipos", methods=["POST"])
@login_required
def criar_tipo_alvara_api():
    if not (current_user.is_admin or current_user.can_add):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para adicionar tipos de alvará."
        }), 403

    payload = request.get_json(silent=True) or {}
    nome = str(payload.get("nome", "")).strip().upper()

    if not nome:
        return jsonify({
            "success": False,
            "message": "Nome é obrigatório."
        }), 400

    if TipoAlvara.query.filter_by(nome=nome).first():
        return jsonify({
            "success": False,
            "message": "Tipo de alvará já existe."
        }), 400

    try:
        tipo = TipoAlvara(nome=nome)

        db.session.add(tipo)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Tipo de alvará criado com sucesso.",
            "tipo": tipo.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao criar tipo de alvará via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao criar tipo de alvará: {e}"
        }), 500


@alvaras_api.route("/tipos/<int:tipo_id>", methods=["PUT"])
@login_required
def atualizar_tipo_alvara_api(tipo_id):
    if not (current_user.is_admin or current_user.can_edit):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para editar tipos de alvará."
        }), 403

    tipo = TipoAlvara.query.get_or_404(tipo_id)

    payload = request.get_json(silent=True) or {}
    nome = str(payload.get("nome", "")).strip().upper()

    if not nome:
        return jsonify({
            "success": False,
            "message": "Nome é obrigatório."
        }), 400

    tipo_existente = TipoAlvara.query.filter_by(nome=nome).first()

    if tipo_existente and tipo_existente.id != tipo.id:
        return jsonify({
            "success": False,
            "message": "Tipo de alvará já existe."
        }), 400

    try:
        nome_antigo = tipo.nome
        tipo.nome = nome

        Alvara.query.filter_by(tipo=nome_antigo).update(
            {"tipo": nome}
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Tipo de alvará atualizado com sucesso.",
            "tipo": tipo.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao atualizar tipo de alvará via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao atualizar tipo de alvará: {e}"
        }), 500


@alvaras_api.route("/tipos/<int:tipo_id>", methods=["DELETE"])
@login_required
def excluir_tipo_alvara_api(tipo_id):
    if not (current_user.is_admin or current_user.can_delete):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para excluir tipos de alvará."
        }), 403

    tipo = TipoAlvara.query.get_or_404(tipo_id)

    try:
        if Alvara.query.filter_by(tipo=tipo.nome).first():
            return jsonify({
                "success": False,
                "message": "Existem alvarás associados a este tipo. Exclua ou altere-os primeiro."
            }), 400

        db.session.delete(tipo)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Tipo de alvará excluído com sucesso."
        })

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao excluir tipo de alvará via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao excluir tipo de alvará: {e}"
        }), 500


@alvaras_api.route("/responsaveis", methods=["GET"])
@login_required
def listar_responsaveis_alvaras_api():
    responsaveis = Responsavel.query.order_by(Responsavel.nome.asc()).all()

    return jsonify({
        "success": True,
        "responsaveis": [
            responsavel.to_dict()
            for responsavel in responsaveis
        ]
    })
