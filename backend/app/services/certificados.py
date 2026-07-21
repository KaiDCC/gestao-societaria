from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.serialization.pkcs12 import load_key_and_certificates
from cryptography.x509.oid import NameOID


def processar_certificado(caminho_arquivo_pfx, senha):
    with open(caminho_arquivo_pfx, "rb") as f:
        pfx_data = f.read()

    private_key, cert, additional_certs = load_key_and_certificates(
        pfx_data,
        senha.encode(),
        default_backend()
    )

    if not cert:
        raise ValueError("Certificado (eCNPJ) não encontrado no arquivo .pfx")

    cn = None

    for attribute in cert.subject:
        if attribute.oid == NameOID.COMMON_NAME:
            cn = attribute.value

    if not cn:
        raise ValueError("Common Name (CN) não encontrado no certificado.")

    if ':' in cn:
        nome_empresa, cnpj = cn.split(':', 1)
        nome_empresa = nome_empresa.strip()
        cnpj = cnpj.strip()
    else:
        nome_empresa = cn.strip()
        cnpj = ''

    validade_fim = cert.not_valid_after_utc

    issuer_info = ", ".join([
        f"{attr.oid._name}: {attr.value}"
        for attr in cert.issuer
    ])

    if not nome_empresa or not cnpj:
        raise ValueError("Nome da empresa ou CNPJ não encontrados no certificado (eCNPJ).")

    return (
        nome_empresa,
        cnpj,
        validade_fim.date(),
        cert.serial_number,
        cert.signature_algorithm_oid._name,
        issuer_info
    )


def processar_certificado_ecpf(caminho_arquivo_pfx, senha):
    with open(caminho_arquivo_pfx, 'rb') as f:
        pfx_data = f.read()

    private_key, cert, additional_certs = load_key_and_certificates(
        pfx_data,
        senha.encode(),
        default_backend()
    )

    if not cert:
        raise ValueError("Certificado principal (e-CPF) não encontrado no arquivo .pfx")

    cn = None

    for attribute in cert.subject:
        if attribute.oid == NameOID.COMMON_NAME:
            cn = attribute.value

    if not cn:
        raise ValueError("CN não encontrado no certificado (e-CPF).")

    if ':' in cn:
        nome_pessoa, cpf = cn.split(':', 1)
        nome_pessoa = nome_pessoa.strip()
        cpf = cpf.strip()
    else:
        nome_pessoa = cn.strip()
        cpf = ''

    validade_fim = cert.not_valid_after_utc

    issuer_info = ", ".join([
        f"{attr.oid._name}: {attr.value}"
        for attr in cert.issuer
    ])

    return (
        nome_pessoa,
        cpf,
        validade_fim.date(),
        cert.serial_number,
        cert.signature_algorithm_oid._name,
        issuer_info
    )
