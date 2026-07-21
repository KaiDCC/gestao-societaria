import logging
import re
from datetime import date, datetime

from flask import current_app

from app import db
from app.integrations.intranet_client import enviar_payload_intranet
from app.models import (
    Alvara,
    Certificado,
    Empresa,
    NotificacaoValidade,
    SchedulerMeta
)


DESTINO_INTRANET = "intranet"


def _normalizar_para_chave(valor):
    if not valor:
        return "SEM_TIPO"

    valor = str(valor).strip().upper()
    valor = re.sub(r"[^A-Z0-9]+", "_", valor)
    valor = valor.strip("_")

    return valor or "SEM_TIPO"


def _set_scheduler_meta(key, value):
    rec = SchedulerMeta.query.get(key)

    if rec:
        rec.value = value
    else:
        rec = SchedulerMeta(
            key=key,
            value=value
        )
        db.session.add(rec)

    db.session.commit()


def _mark_intranet_run_ok():
    _set_scheduler_meta(
        "intranet_last_success",
        date.today().isoformat()
    )


def _montar_chave_alvara(alv):
    tipo_alvara = _normalizar_para_chave(alv.tipo)

    return (
        f"alvara:"
        f"{alv.empresa.codigo_empresa}:"
        f"{tipo_alvara}:"
        f"{alv.validade.isoformat()}"
    )


def _montar_chave_certificado(cert):
    return (
        f"certificado:"
        f"ecnpj:"
        f"{cert.empresa.codigo_empresa}:"
        f"{cert.validade.isoformat()}"
    )


def _criar_ou_atualizar_registro_local(
    chave_local,
    codigo_empresa,
    tipo_notificacao,
    origem,
    validade
):
    registro = NotificacaoValidade.query.filter_by(
        chave_local=chave_local,
        destino=DESTINO_INTRANET
    ).first()

    if registro:
        registro.codigo_empresa = str(codigo_empresa)
        registro.tipo_notificacao = tipo_notificacao
        registro.origem = origem
        registro.validade = validade

        return registro

    registro = NotificacaoValidade(
        chave_local=chave_local,
        codigo_empresa=str(codigo_empresa),
        tipo_notificacao=tipo_notificacao,
        origem=origem,
        validade=validade,
        destino=DESTINO_INTRANET,
        status_envio="pendente"
    )

    db.session.add(registro)

    return registro


def _montar_item_alvara(alv):
    empresa = alv.empresa

    chave_local = _montar_chave_alvara(alv)

    registro = _criar_ou_atualizar_registro_local(
        chave_local=chave_local,
        codigo_empresa=empresa.codigo_empresa,
        tipo_notificacao="alvara",
        origem="alvara",
        validade=alv.validade
    )

    item_payload = {
        "chave_local": chave_local,
        "tipo_notificacao": "alvara",
        "origem": "alvara",
        "codigo_cliente": str(empresa.codigo_empresa),
        "cnpj_cliente": empresa.cnpj or "",
        "razao_social": empresa.nome_emp or "",
        "subtipo": alv.tipo or "",
        "data_vencimento": alv.validade.isoformat(),
        "observacoes": alv.observacoes or ""
    }

    return registro, item_payload


def _montar_item_certificado(cert):
    empresa = cert.empresa

    chave_local = _montar_chave_certificado(cert)

    registro = _criar_ou_atualizar_registro_local(
        chave_local=chave_local,
        codigo_empresa=empresa.codigo_empresa,
        tipo_notificacao="certificado",
        origem="certificado",
        validade=cert.validade
    )

    item_payload = {
        "chave_local": chave_local,
        "tipo_notificacao": "certificado",
        "origem": "certificado",
        "codigo_cliente": str(empresa.codigo_empresa),
        "cnpj_cliente": empresa.cnpj or "",
        "razao_social": empresa.nome_emp or "",
        "subtipo": "e-CNPJ",
        "data_vencimento": cert.validade.isoformat(),
        "observacoes": cert.observacoes or ""
    }

    return registro, item_payload


def _buscar_notificacoes_para_enviar():
    hoje = datetime.now().date()

    registros_para_atualizar = []
    dados_payload = []

    logging.info(
        f"Verificando notificações de validade para intranet em {hoje.isoformat()}"
    )

    # Alvarás:
    # Usa a quantidade de dias de cada alvará: alv.notificacao_dias
    for alv in Alvara.query.all():
        if not alv.validade or not alv.empresa:
            continue

        if alv.notificacao_dias is None:
            continue

        dias_para_vencimento = (alv.validade - hoje).days

        if 0 <= dias_para_vencimento <= alv.notificacao_dias:
            registro, item_payload = _montar_item_alvara(alv)

            if registro.status_envio != "enviado":
                registros_para_atualizar.append(registro)
                dados_payload.append(item_payload)

    # Certificados:
    # Mantém a regra de 15 dias antes do vencimento
    certificados = Certificado.query.join(Empresa).filter(
        Empresa.stat_emp == "A"
    ).all()

    for cert in certificados:
        if not cert.validade or not cert.empresa:
            continue

        dias_restantes = (cert.validade - hoje).days

        if 0 <= dias_restantes <= 15:
            registro, item_payload = _montar_item_certificado(cert)

            if registro.status_envio != "enviado":
                registros_para_atualizar.append(registro)
                dados_payload.append(item_payload)

    return registros_para_atualizar, dados_payload


def check_and_sync_intranet_notifications():
    from run import app

    with app.app_context():
        registros, dados = _buscar_notificacoes_para_enviar()

        db.session.commit()

        if not dados:
            logging.info("Nenhuma notificação nova de validade para enviar à intranet.")
            _mark_intranet_run_ok()
            return

        sistema_id = current_app.config.get("SISTEMA_ID")

        if not sistema_id:
            logging.error("SISTEMA_ID não configurado no .env")
            return

        payload = {
            "sistema_id": str(sistema_id),
            "tipo_sync": current_app.config.get(
                "INTRANET_TIPO_SYNC",
                "notificacao_validade"
            ),
            "gerado_em": datetime.now().isoformat(timespec="seconds"),
            "dados": dados
        }

        try:
            resposta = enviar_payload_intranet(payload)

            agora = datetime.utcnow()

            for registro in registros:
                registro.status_envio = "enviado"
                registro.data_envio = agora
                registro.erro = None

            db.session.commit()

            _mark_intranet_run_ok()

            logging.info(
                f"Notificações enviadas para intranet com sucesso. "
                f"Total: {len(dados)} | Resposta: {resposta}"
            )

        except Exception as e:
            db.session.rollback()

            erro = str(e)

            for registro in registros:
                registro.status_envio = "erro"
                registro.erro = erro[:2000]

            db.session.commit()

            logging.error(
                f"Erro ao enviar notificações para intranet: {erro}"
            )
