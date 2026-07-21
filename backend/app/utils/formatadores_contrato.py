import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from num2words import num2words


MESES_PT_BR = {
    1: "janeiro",
    2: "fevereiro",
    3: "março",
    4: "abril",
    5: "maio",
    6: "junho",
    7: "julho",
    8: "agosto",
    9: "setembro",
    10: "outubro",
    11: "novembro",
    12: "dezembro",
}


PALAVRAS_MINUSCULAS_TITULO = {
    "da",
    "de",
    "do",
    "das",
    "dos",
    "e",
}


def somente_digitos(valor):
    if valor is None:
        return ""

    return re.sub(r"\D", "", str(valor))


def normalizar_maiusculo(valor):
    if valor is None:
        return ""

    return str(valor).strip().upper()


def normalizar_titulo(valor):
    """
    Exemplo:
    'CURITIBA' -> 'Curitiba'
    """
    if valor is None:
        return ""

    texto = str(valor).strip().lower()

    if not texto:
        return ""

    palavras = texto.split()
    resultado = []

    for i, palavra in enumerate(palavras):
        if i > 0 and palavra in PALAVRAS_MINUSCULAS_TITULO:
            resultado.append(palavra)
        else:
            resultado.append(palavra[:1].upper() + palavra[1:])

    return " ".join(resultado)

def formatar_complemento_contrato(valor):
    """
    Formata complemento de endereço para uso no contrato.

    Exemplos:
    'CONJ 141 BLOCO ATALAIA ED' -> 'Conj 141 Bloco Atalaia Ed, '
    None -> ''
    '' -> ''
    """

    if valor is None:
        return ""

    texto = normalizar_titulo(valor)

    if not texto:
        return ""

    texto = texto.rstrip(",").strip()

    if not texto:
        return ""

    return f"{texto}, "


def formatar_cnpj(valor):
    digitos = somente_digitos(valor)

    if len(digitos) != 14:
        return str(valor).strip() if valor is not None else ""

    return (
        f"{digitos[0:2]}."
        f"{digitos[2:5]}."
        f"{digitos[5:8]}/"
        f"{digitos[8:12]}-"
        f"{digitos[12:14]}"
    )


def formatar_cpf(valor):
    digitos = somente_digitos(valor)

    if len(digitos) != 11:
        return str(valor).strip() if valor is not None else ""

    return (
        f"{digitos[0:3]}."
        f"{digitos[3:6]}."
        f"{digitos[6:9]}-"
        f"{digitos[9:11]}"
    )


def formatar_cep(valor):
    digitos = somente_digitos(valor)

    if len(digitos) != 8:
        return str(valor).strip() if valor is not None else ""

    return f"{digitos[0:5]}-{digitos[5:8]}"


def converter_para_data(valor):
    """
    Aceita:
    - date
    - datetime
    - '2026-04-22'
    - '22/04/2026'
    """
    if valor is None or valor == "":
        return None

    if isinstance(valor, datetime):
        return valor.date()

    if isinstance(valor, date):
        return valor

    texto = str(valor).strip()

    for formato in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(texto, formato).date()
        except ValueError:
            pass

    raise ValueError(f"Data inválida: {valor}")


def formatar_data_br(valor):
    data = converter_para_data(valor)

    if not data:
        return ""

    return data.strftime("%d/%m/%Y")


def formatar_data_extenso(valor):
    data = converter_para_data(valor)

    if not data:
        return ""

    mes_extenso = MESES_PT_BR[data.month]

    return f"{data.day} de {mes_extenso} de {data.year}"


def converter_para_decimal(valor):
    """
    Aceita:
    - 150
    - 150.00
    - '150,00'
    - 'R$ 150,00'
    - '1.500,25'
    """
    if valor is None or valor == "":
        return None

    if isinstance(valor, Decimal):
        return valor

    if isinstance(valor, int):
        return Decimal(valor)

    if isinstance(valor, float):
        return Decimal(str(valor)).quantize(Decimal("0.01"))

    texto = str(valor).strip()

    texto = texto.replace("R$", "").strip()
    texto = texto.replace(".", "")
    texto = texto.replace(",", ".")

    try:
        return Decimal(texto).quantize(Decimal("0.01"))
    except InvalidOperation:
        raise ValueError(f"Valor monetário inválido: {valor}")


def formatar_moeda_br(valor):
    """
    Retorna sem R$ porque o template já possui R$.

    Exemplo:
    150 -> '150,00'
    1500.25 -> '1.500,25'
    """
    decimal = converter_para_decimal(valor)

    if decimal is None:
        return ""

    inteiro, centavos = f"{decimal:.2f}".split(".")

    partes = []

    while inteiro:
        partes.insert(0, inteiro[-3:])
        inteiro = inteiro[:-3]

    inteiro_formatado = ".".join(partes)

    return f"{inteiro_formatado},{centavos}"


def valor_por_extenso(valor):
    """
    Retorna minúsculo.

    Exemplo:
    150 -> 'cento e cinquenta reais'
    150.50 -> 'cento e cinquenta reais e cinquenta centavos'
    """
    decimal = converter_para_decimal(valor)

    if decimal is None:
        return ""

    inteiro = int(decimal)
    centavos = int((decimal - Decimal(inteiro)) * 100)

    partes = []

    if inteiro == 0:
        partes.append("zero real")
    elif inteiro == 1:
        partes.append("um real")
    else:
        partes.append(f"{num2words(inteiro, lang='pt_BR')} reais")

    if centavos > 0:
        if centavos == 1:
            partes.append("um centavo")
        else:
            partes.append(f"{num2words(centavos, lang='pt_BR')} centavos")

    return " e ".join(partes).lower()


def formatar_meses_pendentes(meses):
    """
    Recebe lista:
    ['03/2025', '04/2025', '06/2025']

    Retorna:
    '03/2025, 04/2025 e 06/2025'
    """
    if not meses:
        return ""

    meses_limpos = [
        str(mes).strip()
        for mes in meses
        if str(mes).strip()
    ]

    if len(meses_limpos) == 0:
        return ""

    if len(meses_limpos) == 1:
        return meses_limpos[0]

    if len(meses_limpos) == 2:
        return f"{meses_limpos[0]} e {meses_limpos[1]}"

    return f"{', '.join(meses_limpos[:-1])} e {meses_limpos[-1]}"


def formatar_dados_empresa_para_contrato(dados):
    """
    Recebe os dados brutos vindos do Domínio e devolve os dados já no padrão do contrato.
    """
    return {
        "razao_social": normalizar_maiusculo(dados.get("razao_social")),
        "municipio": normalizar_titulo(dados.get("municipio")),
        "uf": normalizar_maiusculo(dados.get("uf")),
        "tipo_endereco_codigo": dados.get("tipo_endereco_codigo"),
        "tipo_endereco": normalizar_titulo(dados.get("tipo_endereco")),
        "rua": normalizar_titulo(dados.get("rua")),
        "numero": str(dados.get("numero") or "").strip(),
        "complemento": formatar_complemento_contrato(dados.get("complemento")),
        "bairro": normalizar_titulo(dados.get("bairro")),
        "cep": formatar_cep(dados.get("cep")),
        "cnpj": formatar_cnpj(dados.get("cnpj")),
        "socio_administrador": normalizar_maiusculo(dados.get("socio_administrador")),
        "cpf_socio": formatar_cpf(dados.get("cpf_socio")),
    }
