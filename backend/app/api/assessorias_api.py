import re
from flask import Blueprint, jsonify, request
from app.models.assessoria import Assessoria
from app import db
from flask_login import login_required

from app.utils.formatadores_contrato import (
    normalizar_maiusculo,
    normalizar_titulo,
    formatar_cnpj,
    formatar_cpf,
    formatar_cep,
    somente_digitos
)

assessorias_api = Blueprint(
    "assessorias_api", 
    __name__, 
    url_prefix="/api/assessorias"
)

UFS_VALIDAS = {
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
    'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
    'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
}

def validar_crc(valor):
    if not valor:
        return False
    valor = str(valor).strip().upper()
    padrao = r'^[A-Z]{2}\s\d{6}\/[OP]-\d$'
    if not re.match(padrao, valor):
        return False
    
    uf_crc = valor[:2]
    return uf_crc in UFS_VALIDAS

def formatar_email(valor):
    if not valor:
        return ""
    return str(valor).strip().lower()

@assessorias_api.route("", methods=["GET"])
@login_required
def listar_assessorias():
    assessorias = Assessoria.query.filter_by(ativo=True).all()
    return jsonify({
        "success": True, 
        "empresas": [a.to_dict() for a in assessorias]
    })

@assessorias_api.route("", methods=["POST"])
@login_required
def criar_assessoria():
    data = request.json
    
    campos_obrigatorios = [
        'razao_social', 'cnpj', 'cidade', 'uf', 'logradouro', 'numero', 
        'bairro', 'cep', 'email', 'crc_empresa', 'representante_nome', 
        'representante_cpf', 'representante_crc'
    ]
    for campo in campos_obrigatorios:
        if not data.get(campo) or str(data.get(campo)).strip() == "":
            return jsonify({"success": False, "message": f"O campo {campo} é obrigatório."}), 400

    cnpj_limpo = somente_digitos(data.get('cnpj'))
    cpf_limpo = somente_digitos(data.get('representante_cpf'))
    
    if len(cnpj_limpo) != 14:
        return jsonify({"success": False, "message": "CNPJ deve conter 14 dígitos."}), 400
        
    if len(cpf_limpo) != 11:
        return jsonify({"success": False, "message": "CPF deve conter 11 dígitos."}), 400

    email_formatado = formatar_email(data.get('email'))
    if "@" not in email_formatado:
         return jsonify({"success": False, "message": "E-mail inválido."}), 400
         
    uf_empresa = normalizar_maiusculo(data.get('uf'))
    if uf_empresa not in UFS_VALIDAS:
        return jsonify({"success": False, "message": "UF da empresa inválida."}), 400

    crc_empresa = str(data.get('crc_empresa')).strip().upper()
    crc_rep = str(data.get('representante_crc')).strip().upper()
    
    if not validar_crc(crc_empresa):
        return jsonify({"success": False, "message": "CRC da Empresa inválido. Siga o padrão: UF 000000/O-0"}), 400
        
    if not validar_crc(crc_rep):
        return jsonify({"success": False, "message": "CRC do Representante inválido. Siga o padrão: UF 000000/O-0"}), 400
    
    razao_social_formatada = normalizar_maiusculo(data.get('razao_social'))
    
    nova_assessoria = Assessoria(
        slug=razao_social_formatada.lower().replace(' ', '_')[:50],
        razao_social=razao_social_formatada,
        uf=uf_empresa,
        representante_nome=normalizar_maiusculo(data.get('representante_nome')),
        cidade=normalizar_titulo(data.get('cidade')),
        logradouro=normalizar_titulo(data.get('logradouro')),
        bairro=normalizar_titulo(data.get('bairro')),
        cnpj=formatar_cnpj(data.get('cnpj')),
        cep=formatar_cep(data.get('cep')),
        representante_cpf=formatar_cpf(data.get('representante_cpf')),
        email=email_formatado,
        numero=str(data.get('numero')).strip(),
        crc_empresa=crc_empresa,
        representante_crc=crc_rep
    )
    
    db.session.add(nova_assessoria)
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "empresa": nova_assessoria.to_dict()
    }), 201

@assessorias_api.route("/<int:id>", methods=["PUT"])
@login_required
def atualizar_assessoria(id):
    assessoria = Assessoria.query.get(id)
    if not assessoria:
        return jsonify({"success": False, "message": "Assessoria não encontrada."}), 404

    data = request.json
    
    campos_obrigatorios = [
        'razao_social', 'cnpj', 'cidade', 'uf', 'logradouro', 'numero', 
        'bairro', 'cep', 'email', 'crc_empresa', 'representante_nome', 
        'representante_cpf', 'representante_crc'
    ]
    for campo in campos_obrigatorios:
        if not data.get(campo) or str(data.get(campo)).strip() == "":
            return jsonify({"success": False, "message": f"O campo {campo} é obrigatório."}), 400

    uf_empresa = normalizar_maiusculo(data.get('uf'))
    if uf_empresa not in UFS_VALIDAS:
        return jsonify({"success": False, "message": "UF da empresa inválida."}), 400

    email_formatado = formatar_email(data.get('email'))
    razao_social_formatada = normalizar_maiusculo(data.get('razao_social'))

    assessoria.razao_social = razao_social_formatada
    assessoria.slug = razao_social_formatada.lower().replace(' ', '_')[:50]
    assessoria.uf = uf_empresa
    assessoria.representante_nome = normalizar_maiusculo(data.get('representante_nome'))
    assessoria.cidade = normalizar_titulo(data.get('cidade'))
    assessoria.logradouro = normalizar_titulo(data.get('logradouro'))
    assessoria.bairro = normalizar_titulo(data.get('bairro'))
    assessoria.cnpj = formatar_cnpj(data.get('cnpj'))
    assessoria.cep = formatar_cep(data.get('cep'))
    assessoria.representante_cpf = formatar_cpf(data.get('representante_cpf'))
    assessoria.email = email_formatado
    assessoria.numero = str(data.get('numero')).strip()
    assessoria.crc_empresa = str(data.get('crc_empresa')).strip().upper()
    assessoria.representante_crc = str(data.get('representante_crc')).strip().upper()

    db.session.commit()
    
    return jsonify({
        "success": True, 
        "empresa": assessoria.to_dict()
    }), 200
