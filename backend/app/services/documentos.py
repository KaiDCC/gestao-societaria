import json
import os
import platform

from docxtpl import DocxTemplate
from flask import current_app

from app import db
from app.models import Contrato
from app.models.assessoria import Assessoria
from app.utils.formatadores_contrato import (
    formatar_data_br,
    formatar_meses_pendentes,
    formatar_moeda_br,
)

TEMPLATES_GENERICOS = {
    "adesao": "contrato_adesao.docx",
    "distrato": "contrato_distrato.docx",
    "distrato_inadimplencia": "contrato_distrato_inadimplencia.docx",
    "distrato_inverso": "contrato_distratante_inverso.docx",
}

def obter_pasta_templates_contratos():
    return current_app.config["CONTRATOS_TEMPLATES_FOLDER"]

def obter_pasta_saida_contratos():
    pasta = current_app.config["CONTRATOS_OUTPUT_FOLDER"]
    pasta.mkdir(parents=True, exist_ok=True)

    return pasta

def montar_contexto_contrato(contrato):
    meses_pendentes = []

    if contrato.meses_pendentes:
        try:
            meses_pendentes = json.loads(contrato.meses_pendentes)
        except Exception:
            meses_pendentes = []

    ano_anterior = str(contrato.created_at.year - 1) if contrato.created_at else ""

    contexto = {
        "RAZAO_SOCIAL": contrato.razao_social or "",
        "MUNICIPIO": contrato.municipio or "",
        "UF": contrato.uf or "",
        "TIPO_ENDERECO": contrato.tipo_endereco or "",
        "RUA": contrato.rua or "",
        "NUMERO": contrato.numero or "",
        "COMPLEMENTO": contrato.complemento or "",
        "BAIRRO": contrato.bairro or "",
        "CEP": contrato.cep or "",
        "CNPJ": contrato.cnpj or "",
        "SOCIO_ADMINISTRADOR": contrato.socio_administrador or "",
        "CPF_SOCIO": contrato.cpf_socio or "",

        "VIGENCIA": formatar_data_br(contrato.vigencia) if contrato.vigencia else "",
        "VIGENCIA_EXTENSO": contrato.vigencia_extenso or "",

        "REGIME_TRIBUTACAO": contrato.regime_tributacao or "",
        "REGIME_APURACAO": contrato.regime_apuracao or "",
        "PERIODICIDADE_DEMONSTRATIVOS": contrato.periodicidade_demonstrativos or "",

        "HONORARIO_MENSAL": (
            formatar_moeda_br(contrato.honorario_mensal)
            if contrato.honorario_mensal is not None
            else ""
        ),
        "HONORARIO_MENSAL_EXTENSO": contrato.honorario_mensal_extenso or "",

        "ENCERRAMENTO_OBRIGACOES": (
            formatar_data_br(contrato.encerramento_obrigacoes)
            if contrato.encerramento_obrigacoes
            else ""
        ),
        "DATA_ASSINATURA_EXTENSO": contrato.data_assinatura_extenso or "",
        "ENCERRAMENTO_OBRIGACOES_EXTENSO": contrato.encerramento_obrigacoes_extenso or "",

        "VALOR_INADIMPLENCIA": (
            formatar_moeda_br(contrato.valor_inadimplencia)
            if contrato.valor_inadimplencia is not None
            else ""
        ),
        "VALOR_INADIMPLENCIA_EXTENSO": contrato.valor_inadimplencia_extenso or "",

        "MESES_PENDENTES": formatar_meses_pendentes(meses_pendentes),

        "ANO_ANTERIOR": ano_anterior,
    }

    assessoria = Assessoria.query.filter_by(slug=contrato.empresa_contratada).first()
    
    if assessoria:
        contexto.update({
            "ASS_RAZAO_SOCIAL": assessoria.razao_social or "",
            "ASS_CIDADE": assessoria.cidade or "",
            "ASS_UF": assessoria.uf or "",
            "ASS_LOGRADOURO": assessoria.logradouro or "",
            "ASS_NUMERO": assessoria.numero or "",
            "ASS_BAIRRO": assessoria.bairro or "",
            "ASS_CEP": assessoria.cep or "",
            "ASS_CNPJ": assessoria.cnpj or "",
            "ASS_EMAIL": assessoria.email or "",
            "ASS_CRC": assessoria.crc_empresa or "",
            
            "ASS_REP_NOME": assessoria.representante_nome or "",
            "ASS_REP_CPF": assessoria.representante_cpf or "",
            "ASS_REP_CRC": assessoria.representante_crc or "",
        })

    return contexto

def substituir_texto_em_paragrafo(paragrafo, substituicoes):
    if not paragrafo.runs:
        return

    for run in paragrafo.runs:
        if "{{" not in run.text:
            continue

        novo_texto = run.text

        for chave, valor in substituicoes.items():
            placeholder = f"{{{{{chave}}}}}"
            novo_texto = novo_texto.replace(placeholder, str(valor))

        run.text = novo_texto

def substituir_placeholders_documento(documento, contexto):
    """
    Substitui placeholders no corpo, tabelas, headers e footers.
    """

    def processar_paragrafos(paragrafos):
        for paragrafo in paragrafos:
            substituir_texto_em_paragrafo(paragrafo, contexto)

    def processar_tabelas(tabelas):
        for tabela in tabelas:
            for linha in tabela.rows:
                for celula in linha.cells:
                    processar_paragrafos(celula.paragraphs)
                    processar_tabelas(celula.tables)

    processar_paragrafos(documento.paragraphs)
    processar_tabelas(documento.tables)

    for section in documento.sections:
        processar_paragrafos(section.header.paragraphs)
        processar_tabelas(section.header.tables)

        processar_paragrafos(section.footer.paragraphs)
        processar_tabelas(section.footer.tables)

def limpar_nome_arquivo(nome):
    caracteres_invalidos = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']

    nome_limpo = str(nome or "").strip()

    for caractere in caracteres_invalidos:
        nome_limpo = nome_limpo.replace(caractere, "-")

    while "  " in nome_limpo:
        nome_limpo = nome_limpo.replace("  ", " ")

    return nome_limpo

def gerar_hash_curto_contrato(contrato):
    import hashlib

    base = (
        f"{contrato.id}|"
        f"{contrato.tipo_contrato}|"
        f"{contrato.codigo_empresa}|"
        f"{contrato.razao_social}|"
        f"{contrato.created_at}"
    )

    return hashlib.sha1(base.encode("utf-8")).hexdigest()[:6].upper()

def gerar_nome_arquivo_contrato(contrato):
    razao_social = limpar_nome_arquivo(contrato.razao_social)
    hash_curto = gerar_hash_curto_contrato(contrato)

    if contrato.tipo_contrato == "adesao":
        return f"{razao_social} - Contrato de Prestação de Serviços Contábeis - {hash_curto}.docx"

    if contrato.tipo_contrato in ["distrato", "distrato_inadimplencia"]:
        return f"{razao_social} - Distrato PS e Carta - {hash_curto}.docx"

    return f"{razao_social} - Contrato - {hash_curto}.docx"

def gerar_docx_contrato(contrato_id):
    contrato = Contrato.query.get_or_404(contrato_id)

    if contrato.distratante_inverso and contrato.tipo_contrato == "distrato":
        tipo = "distrato_inverso"
    else:
        tipo = contrato.tipo_contrato

    if tipo not in TEMPLATES_GENERICOS:
        raise ValueError("Tipo de contrato inválido.")

    caminho_template = (
        obter_pasta_templates_contratos()
        / TEMPLATES_GENERICOS[tipo]
    )

    if not caminho_template.exists():
        raise FileNotFoundError(
            f"Template do contrato não encontrado: {caminho_template}"
        )

    doc = DocxTemplate(str(caminho_template))

    contexto = montar_contexto_contrato(contrato)

    doc.render(contexto, autoescape=True)

    caminho_saida = (
        obter_pasta_saida_contratos()
        / gerar_nome_arquivo_contrato(contrato)
    )

    doc.save(str(caminho_saida))

    contrato.arquivo_docx = "/".join([
        current_app.config["CONTRATOS_OUTPUT_RELATIVE"],
        caminho_saida.name,
    ])
    contrato.status = "gerado"

    db.session.commit()

    return contrato

def converter_docx_para_pdf_windows(caminho_docx, caminho_pdf):
    """
    Converte DOCX para PDF usando Microsoft Word no Windows.

    no Windows:
    pip install pywin32
    """

    try:
        import pythoncom
        import win32com.client
    except ImportError:
        raise RuntimeError(
            "pywin32 não está instalado. No Windows, instale com: pip install pywin32"
        )

    caminho_docx = os.path.abspath(str(caminho_docx))
    caminho_pdf = os.path.abspath(str(caminho_pdf))

    word = None
    documento = None

    try:
        pythoncom.CoInitialize()

        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = False

        documento = word.Documents.Open(caminho_docx)
        documento.SaveAs(caminho_pdf, FileFormat=17)

    finally:
        if documento is not None:
            documento.Close(False)

        if word is not None:
            word.Quit()

        pythoncom.CoUninitialize()

def converter_docx_para_pdf(caminho_docx, caminho_pdf):
    """
    Converte DOCX para PDF.

    Windows:
        Usa Microsoft Word.

    Linux/Ubuntu:
        Não converte. O sistema gera apenas DOCX nesse ambiente.
    """

    sistema = platform.system().lower()

    if sistema == "windows":
        converter_docx_para_pdf_windows(caminho_docx, caminho_pdf)
        return

    raise RuntimeError(
        "Conversão para PDF disponível apenas no Windows com Microsoft Word instalado. "
        "Neste ambiente Linux/Ubuntu, o sistema gera apenas o DOCX."
    )

def gerar_pdf_contrato(contrato_id):
    """
    Gera PDF de um contrato já salvo.

    Se o DOCX ainda não existir, gera o DOCX primeiro.
    No Windows, converte para PDF usando Word.
    No Linux/Ubuntu, levanta erro informando que PDF não está disponível.
    """

    contrato = Contrato.query.get_or_404(contrato_id)

    if not contrato.arquivo_docx:
        contrato = gerar_docx_contrato(contrato_id)

    caminho_docx = current_app.config["BASE_DIR"] / contrato.arquivo_docx

    if not caminho_docx.exists():
        raise FileNotFoundError(f"DOCX não encontrado: {caminho_docx}")

    caminho_pdf = caminho_docx.with_suffix(".pdf")

    converter_docx_para_pdf(
        caminho_docx=caminho_docx,
        caminho_pdf=caminho_pdf,
    )

    caminho_relativo_pdf = "/".join([
        current_app.config["CONTRATOS_OUTPUT_RELATIVE"],
        caminho_pdf.name
    ])

    contrato.arquivo_pdf = caminho_relativo_pdf
    contrato.status = "gerado"

    db.session.commit()

    return contrato
