import json
import logging

from app import db
from app.models import Contrato, Empresa, TipoEnderecoDominio
from app.models.assessoria import Assessoria
from app.services.empresas import criar_conexao_dominio
from app.utils.formatadores_contrato import (
    converter_para_data,
    converter_para_decimal,
    formatar_dados_empresa_para_contrato,
    formatar_data_extenso,
    valor_por_extenso,
    normalizar_maiusculo,
    formatar_complemento_contrato,
)

def converter_codigo_tipo_endereco(valor):
    if valor is None:
        return None

    try:
        codigo = int(valor)
    except (TypeError, ValueError):
        return None

    if codigo == 0:
        return None

    return codigo


def resolver_tipo_endereco_por_codigo(codigo_tipo_endereco):
    """
    Recebe o código do tipo de endereço vindo do Domínio.

    Regra:
    - None, vazio ou 0: retorna ""
    - código encontrado no SQLite: retorna descrição
    - código não encontrado: retorna ""
    """

    codigo = converter_codigo_tipo_endereco(codigo_tipo_endereco)

    if codigo is None:
        return ""

    tipo = TipoEnderecoDominio.query.filter_by(
        codigo=codigo
    ).first()

    if not tipo:
        logging.warning(
            f"Tipo de endereço não cadastrado no SQLite: {codigo}"
        )
        return ""

    return tipo.descricao


def escolher_campo_opcional(dados_formulario, dados_tela, dados_empresa, campo):
    """
    Usado para campos opcionais que o usuário pode apagar manualmente.

    Se o campo veio no formulário, respeita o valor da tela, inclusive vazio.
    Se não veio no formulário, usa o valor buscado no Domínio.
    """

    if isinstance(dados_formulario, dict) and campo in dados_formulario:
        return dados_tela.get(campo) or ""

    return dados_empresa.get(campo) or ""

def buscar_dados_contratante_por_codigo(codigo_empresa):
    """
    busca na dominio na tabela: bethadba.geempre

    """

    if not codigo_empresa:
        logging.error("Código da empresa não informado para buscar dados do contratante.")
        return None

    codigo_empresa = str(codigo_empresa).strip()

    db_conn = criar_conexao_dominio()

    if not db_conn.conn:
        logging.error("Não foi possível conectar ao Domínio para buscar dados do contratante.")
        return None

    query = """
SELECT TOP 1
    codi_emp,
    nome_emp,
    cida_emp,
    esta_emp,
    ende_emp,
    nume_emp,
    bair_emp,
    cepe_emp,
    cgce_emp,
    rleg_emp,
    cpf_leg_emp,
    tipo_end_emp,
    comp_emp
FROM bethadba.geempre
WHERE codi_emp = ?
"""

    try:
        resultado = db_conn.execute_query(
            query,
            (codigo_empresa,)
        )

        if not resultado:
            logging.info(
                f"Nenhuma empresa encontrada no Domínio para codi_emp={codigo_empresa}."
            )
            return None

        row = resultado[0]

        tipo_endereco_codigo = converter_codigo_tipo_endereco(row[11])
        tipo_endereco = resolver_tipo_endereco_por_codigo(row[11])

        dados_brutos = {
            "codigo_empresa": str(row[0]) if row[0] is not None else "",
            "razao_social": row[1],
            "municipio": row[2],
            "uf": row[3],
            "rua": row[4],
            "numero": row[5],
            "bairro": row[6],
            "cep": row[7],
            "cnpj": row[8],
            "socio_administrador": row[9],
            "cpf_socio": row[10],
            "tipo_endereco_codigo": tipo_endereco_codigo,
            "tipo_endereco": tipo_endereco,
            "complemento": row[12],
        }

        dados_formatados = formatar_dados_empresa_para_contrato(dados_brutos)

        dados_formatados["codigo_empresa"] = dados_brutos["codigo_empresa"]

        return dados_formatados

    except Exception as e:
        logging.error(f"Erro ao buscar dados do contratante no Domínio: {e}")
        return None

    finally:
        db_conn.close()

def normalizar_meses_pendentes(meses_pendentes):
    """
    Recebe:
    - lista: ["03/2025", "04/2025"]
    - string: "03/2025, 04/2025"

    Retorna JSON string para salvar no SQLite
    """

    if not meses_pendentes:
        return None

    if isinstance(meses_pendentes, list):
        meses = [
            str(mes).strip()
            for mes in meses_pendentes
            if str(mes).strip()
        ]

    else:
        meses = [
            mes.strip()
            for mes in str(meses_pendentes).split(",")
            if mes.strip()
        ]

    if not meses:
        return None

    return json.dumps(meses, ensure_ascii=False)


def criar_contrato_rascunho(tipo_contrato, codigo_empresa, empresa_contratada, dados_formulario, usuario_id=None):
    """
    Cria um contrato rascunho no SQLite.

    tipo_contrato:
    - adesao
    - distrato
    - distrato_inadimplencia

    dados_formulario:
    dict com os campos preenchidos pelo usuário.
    """

    tipo_contrato = str(tipo_contrato or "").strip().lower()
    codigo_empresa = str(codigo_empresa or "").strip()
    empresa_contratada = str(empresa_contratada or "").strip().lower()

    tipos_validos = {
        "adesao",
        "distrato",
        "distrato_inadimplencia",
    }

    if tipo_contrato not in tipos_validos:
        raise ValueError("Tipo de contrato inválido.")
    
    assessoria = Assessoria.query.filter_by(slug=empresa_contratada).first()
    if not assessoria:
        raise ValueError(f"Assessoria não cadastrada no sistema (Slug: {empresa_contratada}).")

    if not codigo_empresa:
        raise ValueError("Código da empresa é obrigatório.")

    dados_empresa = buscar_dados_contratante_por_codigo(codigo_empresa) or {}

    empresa_local = Empresa.query.filter_by(
        codigo_empresa=codigo_empresa
    ).first()

    dados_tela = formatar_dados_empresa_para_contrato(dados_formulario)

    contrato = Contrato(
        tipo_contrato=tipo_contrato,
        empresa_contratada=empresa_contratada,
        status="rascunho",

        empresa_id=empresa_local.id if empresa_local else None,
        codigo_empresa=codigo_empresa,

        razao_social=dados_tela.get("razao_social") or dados_empresa.get("razao_social"),
        municipio=dados_tela.get("municipio") or dados_empresa.get("municipio"),
        uf=dados_tela.get("uf") or dados_empresa.get("uf"),
        tipo_endereco_codigo=dados_empresa.get("tipo_endereco_codigo"),
        tipo_endereco=escolher_campo_opcional(
            dados_formulario, dados_tela, dados_empresa, "tipo_endereco"
        ),
        rua=dados_tela.get("rua") or dados_empresa.get("rua"),
        numero=dados_tela.get("numero") or dados_empresa.get("numero"),
        complemento=escolher_campo_opcional(
            dados_formulario, dados_tela, dados_empresa, "complemento"
        ),
        bairro=dados_tela.get("bairro") or dados_empresa.get("bairro"),
        cep=dados_tela.get("cep") or dados_empresa.get("cep"),
        cnpj=dados_tela.get("cnpj") or dados_empresa.get("cnpj"),
        socio_administrador=dados_tela.get("socio_administrador") or dados_empresa.get("socio_administrador"),
        cpf_socio=dados_tela.get("cpf_socio") or dados_empresa.get("cpf_socio"),

        distratante_inverso=bool(dados_formulario.get("distratante_inverso", False)),

        created_by=usuario_id,
        updated_by=usuario_id,
    )

    if tipo_contrato == "adesao":
        vigencia = converter_para_data(dados_formulario.get("vigencia"))
        honorario_mensal = converter_para_decimal(dados_formulario.get("honorario_mensal"))
        contrato.vigencia = vigencia
        contrato.vigencia_extenso = formatar_data_extenso(vigencia)
        contrato.regime_tributacao = normalizar_maiusculo(dados_formulario.get("regime_tributacao"))
        contrato.regime_apuracao = normalizar_maiusculo(dados_formulario.get("regime_apuracao"))
        contrato.periodicidade_demonstrativos = normalizar_maiusculo(dados_formulario.get("periodicidade_demonstrativos"))
        contrato.honorario_mensal = honorario_mensal
        contrato.honorario_mensal_extenso = valor_por_extenso(honorario_mensal)

    elif tipo_contrato in ["distrato", "distrato_inadimplencia"]:
        encerramento = converter_para_data(dados_formulario.get("encerramento_obrigacoes"))
        data_assinatura = converter_para_data(dados_formulario.get("data_assinatura") or dados_formulario.get("data_contrato"))
        contrato.encerramento_obrigacoes = encerramento
        contrato.data_assinatura_extenso = formatar_data_extenso(data_assinatura)
        contrato.encerramento_obrigacoes_extenso = None

        if tipo_contrato == "distrato_inadimplencia":
            valor_inadimplencia = converter_para_decimal(dados_formulario.get("valor_inadimplencia"))
            contrato.valor_inadimplencia = valor_inadimplencia
            contrato.valor_inadimplencia_extenso = valor_por_extenso(valor_inadimplencia)
            contrato.meses_pendentes = normalizar_meses_pendentes(dados_formulario.get("meses_pendentes"))

    db.session.add(contrato)
    db.session.commit()

    return contrato