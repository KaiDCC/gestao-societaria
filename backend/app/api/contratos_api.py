import os
from app import db
from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user

from app.models import Contrato
from app.services.contratos import (
    buscar_dados_contratante_por_codigo,
    criar_contrato_rascunho,
)
from app.services.documentos import (
    gerar_docx_contrato,
    gerar_pdf_contrato,
)


contratos_api = Blueprint(
    "contratos_api",
    __name__,
    url_prefix="/api/contratos"
)


def contrato_response(contrato):
    dados = contrato.to_dict()

    if contrato.arquivo_docx:
        dados["arquivo_docx_url"] = f"/{contrato.arquivo_docx}"

    if contrato.arquivo_pdf:
        dados["arquivo_pdf_url"] = f"/{contrato.arquivo_pdf}"

    return dados


@contratos_api.route("", methods=["GET"])
@login_required
def listar_contratos_api():
    contratos = Contrato.query.order_by(
        Contrato.created_at.desc()
    ).all()

    return jsonify({
        "success": True,
        "contratos": [
            contrato_response(contrato)
            for contrato in contratos
        ]
    })


@contratos_api.route("/<int:contrato_id>", methods=["GET"])
@login_required
def obter_contrato_api(contrato_id):
    contrato = Contrato.query.get_or_404(contrato_id)

    return jsonify({
        "success": True,
        "contrato": contrato_response(contrato)
    })


@contratos_api.route("/buscar-empresa/<codigo_empresa>", methods=["GET"])
@login_required
def buscar_empresa_contrato_api(codigo_empresa):
    dados = buscar_dados_contratante_por_codigo(codigo_empresa)

    if not dados:
        return jsonify({
            "success": False,
            "message": "Empresa não encontrada no Domínio."
        }), 404

    return jsonify({
        "success": True,
        "empresa": dados
    })


@contratos_api.route("", methods=["POST"])
@login_required
def criar_contrato_api():
    payload = request.get_json(silent=True) or {}

    tipo_contrato = payload.get("tipo_contrato")
    codigo_empresa = payload.get("codigo_empresa")
    empresa_contratada = payload.get("empresa_contratada")

    dados_formulario = payload.get("dados_formulario")

    if dados_formulario is None:
        dados_formulario = payload

    try:
        contrato = criar_contrato_rascunho(
            tipo_contrato=tipo_contrato,
            codigo_empresa=codigo_empresa,
            empresa_contratada=empresa_contratada,
            dados_formulario=dados_formulario,
            usuario_id=current_user.id,
        )

        return jsonify({
            "success": True,
            "message": "Contrato criado com sucesso.",
            "contrato": contrato_response(contrato)
        }), 201

    except ValueError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:
        current_app.logger.exception("Erro ao criar contrato via API.")

        return jsonify({
            "success": False,
            "message": f"Erro ao criar contrato: {e}"
        }), 500


@contratos_api.route("/<int:contrato_id>/gerar-docx", methods=["POST"])
@login_required
def gerar_docx_contrato_api(contrato_id):
    contrato = Contrato.query.get_or_404(contrato_id)

    if contrato.arquivo_docx and os.path.exists(contrato.arquivo_docx):
        return jsonify({
            "success": True,
            "message": "DOCX encontrado na pasta. Retornando arquivo existente.",
            "contrato": contrato_response(contrato),
            "arquivo_docx": contrato.arquivo_docx,
            "arquivo_docx_url": f"/{contrato.arquivo_docx}"
        })

    try:
        contrato_gerado = gerar_docx_contrato(contrato_id)

        return jsonify({
            "success": True,
            "message": "DOCX gerado com sucesso.",
            "contrato": contrato_response(contrato_gerado),
            "arquivo_docx": contrato_gerado.arquivo_docx,
            "arquivo_docx_url": f"/{contrato_gerado.arquivo_docx}" if contrato_gerado.arquivo_docx else None,
        })

    except Exception as e:
        current_app.logger.exception("Erro ao gerar DOCX do contrato via API.")

        return jsonify({
            "success": False,
            "message": f"Erro ao gerar DOCX: {e}"
        }), 500


@contratos_api.route("/<int:contrato_id>/gerar-pdf", methods=["POST"])
@login_required
def gerar_pdf_contrato_api(contrato_id):
    contrato = Contrato.query.get_or_404(contrato_id)

    if contrato.arquivo_docx:
        caminho_pdf_esperado = contrato.arquivo_docx.replace(".docx", ".pdf")

        if os.path.exists(caminho_pdf_esperado):
            if contrato.arquivo_pdf != caminho_pdf_esperado:
                contrato.arquivo_pdf = caminho_pdf_esperado
                db.session.commit()

            return jsonify({
                "success": True,
                "message": "PDF encontrado na pasta. Retornando arquivo existente.",
                "contrato": contrato_response(contrato),
                "arquivo_pdf": contrato.arquivo_pdf,
                "arquivo_pdf_url": f"/{contrato.arquivo_pdf}"
            })

    try:
        # Se o arquivo não existir fisicamente, tenta gerar (o que vai dar o erro no Linux, mas funcionará no Windows)
        contrato = gerar_pdf_contrato(contrato_id)

        return jsonify({
            "success": True,
            "message": "PDF gerado com sucesso.",
            "contrato": contrato_response(contrato),
            "arquivo_pdf": contrato.arquivo_pdf,
            "arquivo_pdf_url": f"/{contrato.arquivo_pdf}" if contrato.arquivo_pdf else None,
        })

    except RuntimeError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:
        current_app.logger.exception("Erro ao gerar PDF do contrato via API.")

        return jsonify({
            "success": False,
            "message": f"Erro ao gerar PDF: {e}"
        }), 500


@contratos_api.route("/<int:contrato_id>", methods=["DELETE"])
@login_required
def excluir_contrato_api(contrato_id):
    contrato = Contrato.query.get_or_404(contrato_id)

    arquivo_docx = contrato.arquivo_docx
    arquivo_pdf = contrato.arquivo_pdf

    try:
        db.session.delete(contrato)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("Erro ao excluir contrato do banco via API.")

        return jsonify({
            "success": False,
            "message": f"Erro ao excluir contrato do banco: {e}"
        }), 500

    arquivos_com_erro = []

    for caminho in [arquivo_docx, arquivo_pdf]:
        if not caminho:
            continue

        try:
            if os.path.exists(caminho):
                os.remove(caminho)
        except Exception as e:
            current_app.logger.exception(f"Erro ao remover arquivo físico: {caminho}")
            arquivos_com_erro.append(caminho)

    if arquivos_com_erro:
        return jsonify({
            "success": True,
            "message": "Contrato excluído do banco, mas alguns arquivos físicos não puderam ser removidos.",
            "arquivos_com_erro": arquivos_com_erro
        })

    return jsonify({
        "success": True,
        "message": "Contrato excluído com sucesso."
    })
