import os
import time
import io
import pandas as pd
import logging
from urllib.parse import quote

from flask import Blueprint, jsonify, request, current_app, send_from_directory, send_file
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename

from app import db
from app.models import Empresa, CertificadoEcpf
from app.services.certificados import processar_certificado_ecpf
from app.services.empresas import buscar_codi_emp_por_cpf


ecpfs_api = Blueprint(
    "ecpfs_api",
    __name__,
    url_prefix="/api/ecpfs"
)


def pasta_uploads_certificados():
    pasta = current_app.config["ECPFS_UPLOAD_FOLDER"]
    pasta.mkdir(parents=True, exist_ok=True)

    return pasta

def limpar_cpf(cpf):
    return "".join(filter(str.isdigit, str(cpf or "")))

def cpf_valido(cpf):
    cpf = limpar_cpf(cpf)

    if len(cpf) != 11:
        return False

    if cpf == cpf[0] * 11:
        return False

    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    digito_1 = (soma * 10) % 11
    digito_1 = 0 if digito_1 == 10 else digito_1

    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    digito_2 = (soma * 10) % 11
    digito_2 = 0 if digito_2 == 10 else digito_2

    return digito_1 == int(cpf[9]) and digito_2 == int(cpf[10])

def buscar_ecpf_duplicado_por_cpf(cpf, ignorar_id=None):
    cpf_limpo = limpar_cpf(cpf)

    if not cpf_limpo:
        return None

    registros = CertificadoEcpf.query.all()

    for registro in registros:
        if ignorar_id and registro.id == ignorar_id:
            continue

        if limpar_cpf(registro.cpf) == cpf_limpo:
            return registro

    return None

def ecpf_response(ecpf, incluir_vinculos=False):
    dados = ecpf.to_dict()

    if ecpf.empresa:
        dados["empresa_id"] = ecpf.empresa.id
        dados["empresa_nome"] = ecpf.empresa.nome_emp
        dados["empresa_codigo"] = ecpf.empresa.codigo_empresa
        dados["empresa_status"] = ecpf.empresa.stat_emp
    else:
        dados["empresa_id"] = None
        dados["empresa_nome"] = None
        dados["empresa_codigo"] = None
        dados["empresa_status"] = None

    arquivo_existe = False

    if ecpf.arquivo:
        pasta = pasta_uploads_certificados()
        caminho_arquivo = pasta / ecpf.arquivo
        arquivo_existe = caminho_arquivo.exists()

    dados["arquivo_existe"] = arquivo_existe

    if ecpf.arquivo and arquivo_existe:
        dados["arquivo_url"] = f"/api/ecpfs/arquivos/{quote(ecpf.arquivo)}"
        dados["arquivo_status"] = "ok"
    elif ecpf.arquivo and not arquivo_existe:
        dados["arquivo_url"] = None
        dados["arquivo_status"] = "arquivo_pendente"
    else:
        dados["arquivo_url"] = None
        dados["arquivo_status"] = "sem_arquivo"

    if incluir_vinculos and ecpf.codi_emp == "Todos":
        dados["empresas_vinculadas"] = buscar_empresas_vinculadas_por_cpf(ecpf.cpf)
    else:
        dados["empresas_vinculadas"] = []

    return dados

#quando no banco e-cpf é "todos" ou seja mais que uma empresa vinculda ele faz a busca direto na domínio verificando quais tem aquele cpf e traz a lista dos codigos e depois pega o nome da empresa no sqlite.
def buscar_empresas_vinculadas_por_cpf(cpf):
    codigos = buscar_codi_emp_por_cpf(cpf)

    empresas = []

    for codigo in codigos:
        empresa = Empresa.query.filter_by(
            codigo_empresa=str(codigo)
        ).first()

        empresas.append({
            "codigo_empresa": str(codigo),
            "nome_emp": empresa.nome_emp if empresa else "Não encontrado",
            "empresa": empresa.to_dict() if empresa else None,
        })

    return empresas

def aplicar_filtros_ecpfs():
    query = request.args.get("query", "").strip()
    status_certificado = request.args.get("status_certificado", "todos").strip()

    base_query = CertificadoEcpf.query.outerjoin(Empresa)

    if query:
        base_query = base_query.filter(
            db.or_(
                CertificadoEcpf.nome_pessoa.ilike(f"%{query}%"),
                CertificadoEcpf.cpf.ilike(f"%{query}%"),
                CertificadoEcpf.codi_emp.ilike(f"%{query}%"),
                CertificadoEcpf.observacoes.ilike(f"%{query}%"),
                Empresa.nome_emp.ilike(f"%{query}%"),
                Empresa.codigo_empresa.ilike(f"%{query}%"),
            )
        )

    ecpfs = base_query.order_by(CertificadoEcpf.id.desc()).all()

    if status_certificado in ["No Prazo", "A Vencer", "Vencido", "Sem Validade"]:
        ecpfs = [
            ecpf
            for ecpf in ecpfs
            if ecpf.to_dict()["status"] == status_certificado
        ]
    elif status_certificado == "todos":
        pass
    else:
        return None, {
            "success": False,
            "message": "Status do certificado inválido."
        }, 400

    return ecpfs, None, None

@ecpfs_api.route("", methods=["GET"])
@login_required
def listar_ecpfs_api():
    incluir_vinculos = request.args.get("include_vinculos", "false").lower() == "true"
    query = request.args.get("query", "").strip().lower()
    empresa_vinculada = request.args.get("empresa_vinculada", "").strip()
    status_certificado = request.args.get("status_certificado", "todos").strip()

    todos_ecpfs = CertificadoEcpf.query.order_by(CertificadoEcpf.id.desc()).all()

    ecpfs_filtrados = []

    for ecpf in todos_ecpfs:
        if status_certificado not in ["todos", ""]:
            if ecpf.to_dict()["status"] != status_certificado:
                continue

        if empresa_vinculada:
            if ecpf.codi_emp != "Todos":
                if str(ecpf.codi_emp) != str(empresa_vinculada):
                    continue
            else:
                codigos = buscar_codi_emp_por_cpf(ecpf.cpf)
                if str(empresa_vinculada) not in [str(c) for c in codigos]:
                    continue

        if query:
            match = False
            texto_base = f"{ecpf.nome_pessoa} {ecpf.cpf} {ecpf.observacoes or ''}".lower()

            if query in texto_base:
                match = True
            else:
                if ecpf.codi_emp != "Todos":
                    texto_empresa = f"{ecpf.codi_emp} {ecpf.empresa.nome_emp if ecpf.empresa else ''}".lower()
                    if query in texto_empresa:
                        match = True
                else:
                    vinculadas = buscar_empresas_vinculadas_por_cpf(ecpf.cpf)
                    texto_vinculos = " ".join([f"{v.get('codigo_empresa', '')} {v.get('nome_emp', '')}" for v in vinculadas]).lower()
                    if query in texto_vinculos:
                        match = True

            if not match:
                continue

        ecpfs_filtrados.append(ecpf)

    resumo = {
        "no_prazo": sum(1 for e in todos_ecpfs if e.to_dict()["status"] == "No Prazo"),
        "a_vencer": sum(1 for e in todos_ecpfs if e.to_dict()["status"] == "A Vencer"),
        "vencidos": sum(1 for e in todos_ecpfs if e.to_dict()["status"] == "Vencido"),
        "sem_validade": sum(1 for e in todos_ecpfs if e.to_dict()["status"] == "Sem Validade"),
        "total": len(todos_ecpfs),
    }

    return jsonify({
        "success": True,
        "resumo": resumo,
        "ecpfs": [
            ecpf_response(ecpf, incluir_vinculos=incluir_vinculos)
            for ecpf in ecpfs_filtrados
        ]
    })

@ecpfs_api.route("/<int:ecpf_id>", methods=["GET"])
@login_required
def obter_ecpf_api(ecpf_id):
    incluir_vinculos = request.args.get("include_vinculos", "true").lower() == "true"

    ecpf = CertificadoEcpf.query.get_or_404(ecpf_id)

    return jsonify({
        "success": True,
        "ecpf": ecpf_response(ecpf, incluir_vinculos=incluir_vinculos)
    })

@ecpfs_api.route("", methods=["POST"])
@login_required
def criar_ecpf_api():
    if not (current_user.is_admin or current_user.can_add):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para adicionar e-CPF."
        }), 403

    try:
        senha_certificado = request.form.get("senha", "").strip()
        observacoes = request.form.get("observacoes", "").strip()
        codi_emp_escolhido = request.form.get("codi_emp", "").strip()

        arquivo = request.files.get("arquivo_certificado")

        if not arquivo or not arquivo.filename:
            return jsonify({
                "success": False,
                "message": "Nenhum arquivo de certificado foi enviado."
            }), 400

        if not senha_certificado:
            return jsonify({
                "success": False,
                "message": "Senha do certificado é obrigatória."
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
                nome_pessoa,
                cpf_extraido,
                validade_cert,
                numero_serie,
                algoritmo_assinatura,
                issuer,
            ) = processar_certificado_ecpf(
                file_path,
                senha_certificado
            )

        except Exception as e:
            if file_path.exists():
                file_path.unlink()

            logging.error(f"Erro ao processar e-CPF via API: {e}")

            return jsonify({
                "success": False,
                "message": f"Erro ao processar e-CPF: {e}"
            }), 400

        cpf_extraido = limpar_cpf(cpf_extraido)

        if not cpf_valido(cpf_extraido):
            if file_path.exists():
                file_path.unlink()

            return jsonify({
                "success": False,
                "message": "O CPF extraído do certificado é inválido."
            }), 400

        duplicado = buscar_ecpf_duplicado_por_cpf(cpf_extraido)

        if duplicado:
            if file_path.exists():
                file_path.unlink()

            return jsonify({
                "success": False,
                "message": (
                    "Já existe um e-CPF cadastrado para este CPF. "
                    "Edite o registro existente em vez de criar outro."
                ),
                "ecpf_existente_id": duplicado.id
            }), 400

        if not codi_emp_escolhido:
            codigos = buscar_codi_emp_por_cpf(cpf_extraido)

            if len(codigos) == 0:
                codi_emp_escolhido = ""

            elif len(codigos) == 1:
                codi_emp_escolhido = codigos[0]

            else:

                codi_emp_escolhido = "Todos"
                
        novo_ecpf = CertificadoEcpf(
            codi_emp=codi_emp_escolhido,
            nome_pessoa=nome_pessoa,
            cpf=cpf_extraido,
            validade=validade_cert,
            arquivo=filename,
            senha=senha_certificado,
            numero_serie=str(numero_serie),
            algoritmo_assinatura=algoritmo_assinatura,
            issuer=issuer,
            observacoes=observacoes,
        )

        if codi_emp_escolhido and codi_emp_escolhido != "Todos":
            empresa = Empresa.query.filter_by(
                codigo_empresa=codi_emp_escolhido
            ).first()

            if empresa:
                novo_ecpf.empresa_id = empresa.id

        db.session.add(novo_ecpf)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Certificado e-CPF criado com sucesso.",
            "ecpf": ecpf_response(novo_ecpf, incluir_vinculos=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao criar e-CPF via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao criar e-CPF: {e}"
        }), 500

@ecpfs_api.route("/<int:ecpf_id>", methods=["PUT"])
@login_required
def atualizar_ecpf_api(ecpf_id):
    if not (current_user.is_admin or current_user.can_edit):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para editar e-CPF."
        }), 403

    ecpf = CertificadoEcpf.query.get_or_404(ecpf_id)

    try:
        senha_certificado = request.form.get("senha", "").strip()
        observacoes = request.form.get("observacoes", "").strip()
        codi_emp_escolhido = request.form.get("codi_emp", "").strip()

        ecpf.codi_emp = codi_emp_escolhido
        ecpf.observacoes = observacoes

        arquivo = request.files.get("arquivo_certificado")

        if arquivo and arquivo.filename:
            import os
            import time
            from werkzeug.utils import secure_filename

            senha_para_processar = senha_certificado or ecpf.senha

            if not senha_para_processar:
                return jsonify({
                    "success": False,
                    "message": "Senha do certificado é obrigatória para trocar o arquivo."
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
                    nome_pessoa,
                    cpf_extraido,
                    validade_cert,
                    numero_serie,
                    algoritmo_assinatura,
                    issuer,
                ) = processar_certificado_ecpf(
                    file_path,
                    senha_para_processar
                )

            except Exception as e:
                if file_path.exists():
                    file_path.unlink()

                logging.error(f"Erro ao processar e-CPF via API: {e}")

                return jsonify({
                    "success": False,
                    "message": f"Erro ao processar e-CPF: {e}"
                }), 400

            cpf_extraido = limpar_cpf(cpf_extraido)

            if not cpf_valido(cpf_extraido):
                if file_path.exists():
                    file_path.unlink()

                return jsonify({
                    "success": False,
                    "message": "O CPF extraído do certificado é inválido."
                }), 400

            if cpf_extraido != limpar_cpf(ecpf.cpf):
                if file_path.exists():
                    file_path.unlink()

                return jsonify({
                    "success": False,
                    "message": "Erro de Titularidade! O arquivo selecionado pertence a um CPF diferente do atual."
                }), 400

            duplicado = buscar_ecpf_duplicado_por_cpf(
                cpf_extraido,
                ignorar_id=ecpf.id
            )

            if duplicado:
                if file_path.exists():
                    file_path.unlink()

                return jsonify({
                    "success": False,
                    "message": (
                        "Já existe outro e-CPF cadastrado para este CPF. "
                        "Não é possível salvar duplicado."
                    ),
                    "ecpf_existente_id": duplicado.id
                }), 400

            if ecpf.arquivo:
                old_path = pasta / ecpf.arquivo

                if old_path.exists():
                    try:
                        old_path.unlink()
                    except Exception as e:
                        logging.warning(f"Aviso: Não excluiu antigo {ecpf.arquivo}: {e}")

            ecpf.arquivo = filename
            ecpf.validade = validade_cert
            ecpf.numero_serie = str(numero_serie)
            ecpf.algoritmo_assinatura = algoritmo_assinatura
            ecpf.issuer = issuer
            ecpf.nome_pessoa = nome_pessoa
            ecpf.cpf = cpf_extraido

            if senha_certificado:
                ecpf.senha = senha_certificado

        if codi_emp_escolhido and codi_emp_escolhido != "Todos":
            empresa = Empresa.query.filter_by(
                codigo_empresa=codi_emp_escolhido
            ).first()

            ecpf.empresa_id = empresa.id if empresa else None
        else:
            ecpf.empresa_id = None

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Certificado e-CPF atualizado com sucesso.",
            "ecpf": ecpf_response(ecpf, incluir_vinculos=True)
        })

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao atualizar e-CPF via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao atualizar e-CPF: {e}"
        }), 500

@ecpfs_api.route("/<int:ecpf_id>", methods=["DELETE"])
@login_required
def excluir_ecpf_api(ecpf_id):
    if not (current_user.is_admin or current_user.can_delete):
        return jsonify({
            "success": False,
            "message": "Você não tem permissão para excluir e-CPF."
        }), 403

    ecpf = CertificadoEcpf.query.get_or_404(ecpf_id)

    arquivo = ecpf.arquivo

    try:
        db.session.delete(ecpf)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        logging.error(f"Erro ao excluir e-CPF do banco via API: {e}")

        return jsonify({
            "success": False,
            "message": f"Erro ao excluir e-CPF do banco: {e}"
        }), 500

    if arquivo:
        try:
            pasta = pasta_uploads_certificados()
            arquivo_path = pasta / arquivo

            if arquivo_path.exists():
                arquivo_path.unlink()

        except Exception as e:
            logging.warning(f"Aviso: e-CPF excluído do banco, mas não foi possível excluir o arquivo {arquivo}: {e}")

    return jsonify({
        "success": True,
        "message": "Certificado e-CPF excluído com sucesso."
    })

@ecpfs_api.route("/por-status", methods=["GET"])
@login_required
def listar_ecpfs_por_status_api():
    status = request.args.get("status", "").strip()
    empresa_vinculada = request.args.get("empresa_vinculada", "").strip()

    if status not in ["No Prazo", "A Vencer", "Vencido", "Sem Validade"]:
        return jsonify({"success": False, "message": "Status inválido."}), 400

    ecpfs = CertificadoEcpf.query.order_by(CertificadoEcpf.validade.asc()).all()
    filtrados = []

    status_filtros = request.args.get("status_filtros")
    mes_ano_filtro = request.args.get("mes_ano_filtro")
    status_list = status_filtros.split(",") if status_filtros else []

    for ecpf in ecpfs:
        dict_c = ecpf.to_dict()
        
        if status not in ["", "todos", "all", "Tudo", "Filtrados"]:
            if dict_c["status"] != status:
                continue
                
        if status_list and dict_c["status"] not in status_list:
            continue
        if mes_ano_filtro:
            if not ecpf.validade: continue
            if ecpf.validade.strftime("%Y-%m") != mes_ano_filtro: continue

        if empresa_vinculada:
            if ecpf.codi_emp != "Todos":
                if str(ecpf.codi_emp) != str(empresa_vinculada):
                    continue
            else:
                codigos = buscar_codi_emp_por_cpf(ecpf.cpf)
                if str(empresa_vinculada) not in [str(c) for c in codigos]:
                    continue

        filtrados.append(ecpf)

    return jsonify({
        "success": True,
        "ecpfs": [ecpf_response(e, incluir_vinculos=True) for e in filtrados]
    })

@ecpfs_api.route("/exportar", methods=["GET"])
@login_required
def exportar_ecpfs_api():
    status = request.args.get("status", "").strip()
    empresa_vinculada = request.args.get("empresa_vinculada", "").strip()

    ecpfs = CertificadoEcpf.query.order_by(CertificadoEcpf.id.desc()).all()
    filtrados = []

    status_filtros = request.args.get("status_filtros")
    mes_ano_filtro = request.args.get("mes_ano_filtro")
    status_list = status_filtros.split(",") if status_filtros else []

    for ecpf in ecpfs:
        dict_c = ecpf.to_dict()
        
        if status not in ["", "todos", "all", "Tudo", "Filtrados"]:
            if dict_c["status"] != status:
                continue
                
        if status_list and dict_c["status"] not in status_list:
            continue
        if mes_ano_filtro:
            if not ecpf.validade: continue
            if ecpf.validade.strftime("%Y-%m") != mes_ano_filtro: continue

        if empresa_vinculada:
            if ecpf.codi_emp != "Todos":
                if str(ecpf.codi_emp) != str(empresa_vinculada):
                    continue
            else:
                codigos = buscar_codi_emp_por_cpf(ecpf.cpf)
                if str(empresa_vinculada) not in [str(c) for c in codigos]:
                    continue

        filtrados.append(ecpf)

    data = []
    for c in filtrados:
        dict_c = c.to_dict()

        validade_str = dict_c.get("validade")
        validade_formatada = "N/A"
        if validade_str and validade_str != "N/A":
            try:
                partes = validade_str.split('-')
                if len(partes) == 3:
                    validade_formatada = f"{partes[2]}/{partes[1]}/{partes[0]}"
                else:
                    validade_formatada = validade_str
            except Exception:
                validade_formatada = validade_str

        data.append({
            "CPF": c.cpf,
            "Nome do Titular": c.nome_pessoa,
            "Código Empresa": "Múltiplas Empresas" if c.codi_emp == "Todos" else (c.codi_emp or "Sem Vínculo"),
            "Validade": validade_formatada,
            "Status": dict_c["status"],
            "Observações": c.observacoes or ""
        })

    df = pd.DataFrame(data)
    output = io.BytesIO()

    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='eCPFs')

        worksheet = writer.sheets['eCPFs']
        worksheet.set_column('A:A', 15)  # CPF
        worksheet.set_column('B:B', 40)  # Nome
        worksheet.set_column('C:C', 20)  # Cód Empresa
        worksheet.set_column('D:D', 12)  # Validade
        worksheet.set_column('E:E', 15)  # Status
        worksheet.set_column('F:F', 50)  # Observações

    output.seek(0)

    nomes_arquivos = {
        "todos": "Geral", "all": "Geral", "Tudo": "Geral", "filtrados": "Filtrado",
        "No Prazo": "No_Prazo", "A Vencer": "A_Vencer", 
        "Vencido": "Vencido", "Sem Validade": "Sem_Validade"
    }
    sufixo = nomes_arquivos.get(status, "Geral" if not status else status)
    
    filename = f"eCPFs_{sufixo}.xlsx"
    return send_file(output, download_name=filename, as_attachment=True)

@ecpfs_api.route("/buscar-codi-emp-por-cpf", methods=["GET"])
@login_required
def buscar_codi_emp_por_cpf_ecpf_api():
    cpf = request.args.get("cpf", "").strip()

    if not cpf:
        return jsonify({
            "success": False,
            "message": "CPF é obrigatório.",
            "empresas": []
        }), 400

    empresas = buscar_empresas_vinculadas_por_cpf(cpf)

    return jsonify({
        "success": True,
        "empresas": empresas
    })

@ecpfs_api.route("/arquivos/<path:filename>", methods=["GET"])
@login_required
def obter_arquivo_ecpf_api(filename):
    pasta = pasta_uploads_certificados()
    caminho = pasta / filename

    current_app.logger.info(f"Buscando e-CPF em: {caminho}")

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

@ecpfs_api.route("/arquivos-pendentes", methods=["GET"])
@login_required
def listar_ecpfs_com_arquivo_pendente_api():
    pasta = pasta_uploads_certificados()

    ecpfs = CertificadoEcpf.query.all()

    pendentes = []

    for ecpf in ecpfs:
        if not ecpf.arquivo:
            pendentes.append({
                "tipo": "sem_arquivo",
                "ecpf": ecpf_response(ecpf, incluir_vinculos=False)
            })
            continue

        caminho = pasta / ecpf.arquivo

        if not caminho.exists():
            pendentes.append({
                "tipo": "arquivo_pendente",
                "arquivo_esperado": ecpf.arquivo,
                "caminho_completo": str(caminho),
                "ecpf": ecpf_response(ecpf, incluir_vinculos=False)
            })

    return jsonify({
        "success": True,
        "total": len(pendentes),
        "pendentes": pendentes
    })
