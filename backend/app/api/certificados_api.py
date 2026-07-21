import os
import time
import logging
from io import BytesIO
from urllib.parse import quote

import pandas as pd
from flask import Blueprint, jsonify, request, current_app, send_file, send_from_directory
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename

from app import db
from app.models import Empresa, Certificado
from app.services.certificados import processar_certificado
from app.services.empresas import buscar_dados_empresa

certificados_api = Blueprint(
    "certificados_api",
    __name__,
    url_prefix="/api/certificados"
)

def pasta_uploads_certificados():
    pasta = current_app.config["CERTIFICADOS_UPLOAD_FOLDER"]
    pasta.mkdir(parents=True, exist_ok=True)

    return pasta

def certificado_response(certificado):
    dados = certificado.to_dict()

    arquivo_existe = False
    caminho_arquivo = None

    if certificado.arquivo:
        pasta = pasta_uploads_certificados()
        caminho_arquivo = pasta / certificado.arquivo
        arquivo_existe = caminho_arquivo.exists()

    if certificado.empresa:
        dados["empresa_id"] = certificado.empresa.id
        dados["empresa_nome"] = certificado.empresa.nome_emp
        dados["empresa_codigo"] = certificado.empresa.codigo_empresa
        dados["empresa_status"] = certificado.empresa.stat_emp

    dados["arquivo_existe"] = arquivo_existe

    if certificado.arquivo and arquivo_existe:
        dados["arquivo_url"] = f"/api/certificados/arquivos/{quote(certificado.arquivo)}"
        dados["arquivo_status"] = "ok"
    elif certificado.arquivo and not arquivo_existe:
        dados["arquivo_url"] = None
        dados["arquivo_status"] = "arquivo_pendente"
    else:
        dados["arquivo_url"] = None
        dados["arquivo_status"] = "sem_arquivo"

    return dados

def aplicar_filtros_certificados():
    query = request.args.get("query", "").strip()
    status_empresa = request.args.get("status_empresa", "A").strip()
    status_certificado = request.args.get("status_certificado", "todos").strip()

    base_query = Certificado.query.join(Empresa)

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
        base_query = base_query.filter(
            db.or_(
                Certificado.codigo_empresa.ilike(f"%{query}%"),
                Certificado.cnpj.ilike(f"%{query}%"),
                Certificado.razao_social.ilike(f"%{query}%"),
                Empresa.nome_emp.ilike(f"%{query}%"),
                Certificado.observacoes.ilike(f"%{query}%"),
            )
        )

    certificados = base_query.order_by(Empresa.nome_emp.asc()).all()

    if status_certificado in ["No Prazo", "A Vencer", "Vencido", "Sem Validade"]:
        certificados = [
            certificado
            for certificado in certificados
            if certificado.to_dict()["status"] == status_certificado
        ]
    elif status_certificado == "todos":
        pass
    else:
        return None, {
            "success": False,
            "message": "Status do certificado inválido."
        }, 400

    return certificados, None, None

@certificados_api.route("", methods=["GET"])
@login_required
def listar_certificados_api():
    certificados, erro, status_code = aplicar_filtros_certificados()

    if erro:
        return jsonify(erro), status_code

    status_empresa = request.args.get("status_empresa", "A").strip()
    query = request.args.get("query", "").strip()

    todos_query = Certificado.query.join(Empresa)

    if status_empresa in ["A", "I"]:
        todos_query = todos_query.filter(Empresa.stat_emp == status_empresa)

    if query:
        todos_query = todos_query.filter(
            db.or_(
                Certificado.codigo_empresa.ilike(f"%{query}%"),
                Certificado.cnpj.ilike(f"%{query}%"),
                Certificado.razao_social.ilike(f"%{query}%"),
                Empresa.nome_emp.ilike(f"%{query}%"),
                Certificado.observacoes.ilike(f"%{query}%"),
            )
        )

    todos = todos_query.all()

    resumo = {
        "no_prazo": sum(1 for c in todos if c.to_dict()["status"] == "No Prazo"),
        "a_vencer": sum(1 for c in todos if c.to_dict()["status"] == "A Vencer"),
        "vencidos": sum(1 for c in todos if c.to_dict()["status"] == "Vencido"),
        "sem_validade": sum(1 for c in todos if c.to_dict()["status"] == "Sem Validade"),
        "total": len(todos),
    }

    return jsonify({
        "success": True,
        "resumo": resumo,
        "certificados": [
            certificado_response(certificado)
            for certificado in certificados
        ]
    })

@certificados_api.route("/<int:certificado_id>", methods=["GET"])
@login_required
def obter_certificado_api(certificado_id):
    certificado = Certificado.query.get_or_404(certificado_id)

    return jsonify({
        "success": True,
        "certificado": certificado_response(certificado)
    })

@certificados_api.route("", methods=["POST"])
@login_required
def criar_certificado_api():
    if not (current_user.is_admin or current_user.can_add):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para adicionar certificados."
        }), 403

    try:
        codigo_empresa = request.form.get("codigo_empresa", "").strip()
        senha_certificado = request.form.get("senha", "").strip()
        observacoes = request.form.get("observacoes", "").strip()

        if not all([codigo_empresa, senha_certificado]):
            return jsonify({
                "success": False,
                "message": "Código da empresa e senha do certificado são obrigatórios."
            }), 400

        if Certificado.query.filter_by(codigo_empresa=codigo_empresa).first():
            return jsonify({
                "success": False,
                "message": "Já existe um certificado para esta empresa."
            }), 400

        dados_empresa = buscar_dados_empresa(codigo_empresa)

        if not dados_empresa:
            return jsonify({
                "success": False,
                "message": "Empresa não encontrada no banco local."
            }), 404

        empresa_obj = Empresa.query.filter_by(
            codigo_empresa=codigo_empresa
        ).first()

        if not empresa_obj:
            return jsonify({
                "success": False,
                "message": "Empresa não cadastrada no sistema."
            }), 404

        arquivo = request.files.get("arquivo_certificado")

        if not arquivo or not arquivo.filename:
            return jsonify({
                "success": False,
                "message": "Nenhum arquivo de certificado foi enviado."
            }), 400

        pasta = pasta_uploads_certificados()
        pasta.mkdir(parents=True, exist_ok=True)

        original_filename = secure_filename(arquivo.filename)
        base, ext = os.path.splitext(original_filename)
        filename = f"{base}_{int(time.time())}{ext}"

        file_path = pasta / filename
        arquivo.save(file_path)

        try:
            (
                nome_emp_cert,
                cnpj_cert,
                validade_cert,
                numero_serie,
                algoritmo_assinatura,
                issuer,
            ) = processar_certificado(
                file_path,
                senha_certificado
            )

        except Exception as e:
            if file_path.exists():
                file_path.unlink()

            logging.error(f"Erro ao processar certificado e-CNPJ via API: {e}")

            return jsonify({
                "success": False,
                "message": f"Erro ao processar certificado: {e}"
            }), 400

        cnpj_banco_raiz = "".join(
            filter(str.isdigit, dados_empresa["cnpj"])
        )[:8]

        cnpj_cert_raiz = "".join(
            filter(str.isdigit, cnpj_cert)
        )[:8]

        if cnpj_banco_raiz != cnpj_cert_raiz:
            if file_path.exists():
                file_path.unlink()

            return jsonify({
                "success": False,
                "message": "Raiz do CNPJ do certificado não corresponde à raiz do CNPJ da empresa."
            }), 400

        novo_certificado = Certificado(
            codigo_empresa=codigo_empresa,
            empresa_id=empresa_obj.id,
            cnpj=dados_empresa["cnpj"],
            razao_social=dados_empresa["nome_emp"],
            validade=validade_cert,
            arquivo=filename,
            senha=senha_certificado,
            numero_serie=str(numero_serie),
            algoritmo_assinatura=algoritmo_assinatura,
            issuer=issuer,
            observacoes=observacoes,
        )

        db.session.add(novo_certificado)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Certificado criado com sucesso.",
            "certificado": certificado_response(novo_certificado)
        }), 201

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao criar certificado e-CNPJ via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao criar certificado: {e}"
        }), 500

@certificados_api.route("/<int:certificado_id>", methods=["PUT"])
@login_required
def atualizar_certificado_api(certificado_id):
    if not (current_user.is_admin or current_user.can_edit):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para editar certificados."
        }), 403

    certificado = Certificado.query.get_or_404(certificado_id)

    try:
        codigo_empresa = request.form.get("codigo_empresa", "").strip()
        senha_certificado = request.form.get("senha", "").strip()
        observacoes = request.form.get("observacoes", "").strip()

        if not all([codigo_empresa, senha_certificado]):
            return jsonify({
                "success": False,
                "message": "Código da empresa e senha do certificado são obrigatórios."
            }), 400

        dados_empresa = buscar_dados_empresa(codigo_empresa)

        if not dados_empresa:
            return jsonify({
                "success": False,
                "message": "Empresa não encontrada."
            }), 404

        empresa_obj = Empresa.query.filter_by(
            codigo_empresa=codigo_empresa
        ).first()

        if not empresa_obj:
            return jsonify({
                "success": False,
                "message": "Empresa não cadastrada."
            }), 404

        certificado_duplicado = Certificado.query.filter(
            Certificado.codigo_empresa == codigo_empresa,
            Certificado.id != certificado_id
        ).first()

        if certificado_duplicado:
            return jsonify({
                "success": False,
                "message": "Já existe um certificado para esta empresa."
            }), 400

        certificado.codigo_empresa = codigo_empresa
        certificado.empresa_id = empresa_obj.id
        certificado.cnpj = dados_empresa["cnpj"]
        certificado.razao_social = dados_empresa["nome_emp"]
        certificado.senha = senha_certificado
        certificado.observacoes = observacoes

        arquivo = request.files.get("arquivo_certificado")

        if arquivo and arquivo.filename:
            import os
            import time
            from werkzeug.utils import secure_filename

            pasta = pasta_uploads_certificados()
            pasta.mkdir(parents=True, exist_ok=True)

            original_filename = secure_filename(arquivo.filename)
            base, ext = os.path.splitext(original_filename)
            filename = f"{base}_{int(time.time())}{ext}"

            file_path = pasta / filename
            arquivo.save(file_path)

            try:
                (
                    nome_emp_cert,
                    cnpj_cert,
                    validade_cert,
                    numero_serie,
                    algoritmo_assinatura,
                    issuer,
                ) = processar_certificado(
                    file_path,
                    senha_certificado
                )

            except Exception as e:
                if file_path.exists():
                    file_path.unlink()

                logging.error(f"Erro ao processar certificado e-CNPJ via API: {e}")

                return jsonify({
                    "success": False,
                    "message": f"Erro ao processar certificado: {e}"
                }), 400

            cnpj_banco = "".join(
                filter(str.isdigit, dados_empresa["cnpj"])
            )

            cnpj_certif = "".join(
                filter(str.isdigit, cnpj_cert)
            )

            if cnpj_banco != cnpj_certif:
                if file_path.exists():
                    file_path.unlink()

                return jsonify({
                    "success": False,
                    "message": "CNPJ do certificado não corresponde ao CNPJ da empresa."
                }), 400

            if certificado.arquivo:
                old_path = pasta / certificado.arquivo
                if old_path.exists():
                    try:
                        old_path.unlink()
                    except Exception as e:
                        logging.warning(f"Aviso: Não excluiu antigo {certificado.arquivo}: {e}")

            certificado.validade = validade_cert
            certificado.arquivo = filename
            certificado.numero_serie = str(numero_serie)
            certificado.algoritmo_assinatura = algoritmo_assinatura
            certificado.issuer = issuer

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Certificado atualizado com sucesso.",
            "certificado": certificado_response(certificado)
        })

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao atualizar certificado e-CNPJ via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao atualizar certificado: {e}"
        }), 500

@certificados_api.route("/<int:certificado_id>", methods=["DELETE"])
@login_required
def excluir_certificado_api(certificado_id):
    if not (current_user.is_admin or current_user.can_delete):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para excluir certificados."
        }), 403

    certificado = Certificado.query.get_or_404(certificado_id)

    arquivo = certificado.arquivo

    try:
        db.session.delete(certificado)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao excluir certificado e-CNPJ do banco via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao excluir certificado do banco: {e}"
        }), 500

    if arquivo:
        try:
            pasta = pasta_uploads_certificados()
            arquivo_path = pasta / arquivo

            if arquivo_path.exists():
                arquivo_path.unlink()

        except Exception as e:
            logging.warning(f"Aviso: certificado excluído do banco, mas não foi possível excluir o arquivo {arquivo}: {e}")

    return jsonify({
        "success": True,
        "message": "Certificado excluído com sucesso."
    })

@certificados_api.route("/por-status", methods=["GET"])
@login_required
def listar_certificados_por_status_api():
    status = request.args.get("status", "").strip()

    if status not in ["No Prazo", "A Vencer", "Vencido", "Sem Validade"]:
        return jsonify({
            "success": False,
            "message": "Status inválido."
        }), 400

    status_empresa = request.args.get("status_empresa", "todos").strip()
    query = request.args.get("query", "").strip()

    base_query = Certificado.query.join(Empresa)

    if status_empresa in ["A", "I"]:
        base_query = base_query.filter(Empresa.stat_emp == status_empresa)

    if query:
        base_query = base_query.filter(
            db.or_(
                Certificado.codigo_empresa.ilike(f"%{query}%"),
                Certificado.cnpj.ilike(f"%{query}%"),
                Certificado.razao_social.ilike(f"%{query}%"),
                Empresa.nome_emp.ilike(f"%{query}%"),
                Certificado.observacoes.ilike(f"%{query}%"),
            )
        )

    base_query = base_query.order_by(Certificado.validade.asc())

    certificados = [
        certificado
        for certificado in base_query.all()
        if certificado.to_dict()["status"] == status
    ]

    return jsonify({
        "success": True,
        "certificados": [
            certificado_response(certificado)
            for certificado in certificados
        ]
    })

@certificados_api.route("/arquivos/<path:filename>", methods=["GET"])
@login_required
def obter_arquivo_certificado_api(filename):
    pasta = pasta_uploads_certificados()
    caminho = pasta / filename

    current_app.logger.info(f"Buscando certificado em: {caminho}")

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

@certificados_api.route("/exportar", methods=["GET"])
@login_required
def exportar_certificados_api():
    if not (current_user.is_admin or current_user.can_export):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para exportar certificados."
        }), 403

    status = request.args.get("status", "all").strip()
    status_empresa = request.args.get("status_empresa", "todos").strip()
    query = request.args.get("query", "").strip()

    base_query = Certificado.query.join(Empresa)

    if status_empresa in ["A", "I"]:
        base_query = base_query.filter(Empresa.stat_emp == status_empresa)

    if query:
        base_query = base_query.filter(
            db.or_(
                Certificado.codigo_empresa.ilike(f"%{query}%"),
                Certificado.cnpj.ilike(f"%{query}%"),
                Certificado.razao_social.ilike(f"%{query}%"),
                Empresa.nome_emp.ilike(f"%{query}%"),
                Certificado.observacoes.ilike(f"%{query}%"),
            )
        )

    todos = base_query.all()

    if status in ["No Prazo", "A Vencer", "Vencido", "Sem Validade"]:
        certificados_base = [c for c in todos if c.to_dict()["status"] == status]
    elif status in ["all", "Tudo", "Filtrados"]:
        certificados_base = todos
    else:
        return jsonify({
            "success": False,
            "message": "Status inválido para exportação."
        }), 400

    status_filtros = request.args.get("status_filtros")
    mes_ano_filtro = request.args.get("mes_ano_filtro")
    status_list = status_filtros.split(",") if status_filtros else []

    certificados = []
    for c in certificados_base:
        dict_c = c.to_dict()
        if status_list and dict_c["status"] not in status_list:
            continue
        if mes_ano_filtro:
            if not c.validade: continue
            if c.validade.strftime("%Y-%m") != mes_ano_filtro: continue
        certificados.append(c)

    registros = []

    for certificado in certificados:
        dados = certificado_response(certificado)

        registro_limpo = {
            "Código Empresa": dados.get("codigo_empresa"),
            "Empresa": dados.get("empresa_nome"),
            "CNPJ": dados.get("cnpj"),
            "Validade": dados.get("validade"),
            "Arquivo": dados.get("arquivo"),
            "Número de Série": dados.get("numero_serie"),
            "Observações": dados.get("observacoes"),
            "Status": dados.get("status"),
            "arquivo_status": dados.get("arquivo_status")
        }

        registros.append(registro_limpo)

    df = pd.DataFrame(registros)

    if "Validade" in df.columns:
        df["Validade"] = pd.to_datetime(
            df["Validade"],
            format="%Y-%m-%d",
            errors="coerce"
        )

    output = BytesIO()
    sheet = f"Certificados_{status}"

    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(
            writer,
            index=False,
            sheet_name=sheet[:31]
        )

        ws = writer.sheets[sheet[:31]]

        if "Validade" in df.columns:
            col_idx = df.columns.get_loc("Validade") + 1

            for row in ws.iter_rows(
                min_row=2,
                min_col=col_idx,
                max_col=col_idx
            ):
                for cell in row:
                    cell.number_format = "DD/MM/YYYY"

    output.seek(0)

    nomes_arquivos = {
        "all": "Geral", "Tudo": "Geral", "Filtrados": "Filtrado",
        "No Prazo": "No_Prazo", "A Vencer": "A_Vencer", 
        "Vencido": "Vencido", "Sem Validade": "Sem_Validade"
    }
    sufixo = nomes_arquivos.get(status, status)

    return send_file(
        output,
        download_name=f"Certificados_{sufixo}.xlsx",
        as_attachment=True
    )

@certificados_api.route("/arquivos-pendentes", methods=["GET"])
@login_required
def listar_certificados_com_arquivo_pendente_api():
    pasta = pasta_uploads_certificados()

    certificados = Certificado.query.all()

    pendentes = []

    for certificado in certificados:
        if not certificado.arquivo:
            pendentes.append({
                "tipo": "sem_arquivo",
                "certificado": certificado_response(certificado)
            })
            continue

        caminho = pasta / certificado.arquivo

        if not caminho.exists():
            pendentes.append({
                "tipo": "arquivo_pendente",
                "arquivo_esperado": certificado.arquivo,
                "caminho_completo": str(caminho),
                "certificado": certificado_response(certificado)
            })

    return jsonify({
        "success": True,
        "total": len(pendentes),
        "pendentes": pendentes
    })
