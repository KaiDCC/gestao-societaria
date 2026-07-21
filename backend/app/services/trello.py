#A lógica real do Trello, aqui cria de fato o card sempre verificando no banco se já existe e o NotificacaoTrello
import logging
from datetime import date, datetime, timedelta

from flask import current_app

from app import db
from app.integrations.trello_client import criar_trello_session
from app.models import (
    Alvara,
    Certificado,
    Empresa,
    NotificacaoTrello,
    SchedulerMeta
)


trello_session = criar_trello_session()

#chama o trello_client que já fica retentando automaticamente
def criar_card_trello(nome_card, list_id):
    resp = trello_session.post(
        "https://api.trello.com/1/cards",
        params={
            'key': current_app.config['TRELLO_API_KEY'],
            'token': current_app.config['TRELLO_TOKEN'],
            'idList': list_id,
            'name': nome_card
        },
        timeout=15
    )

    resp.raise_for_status()


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


def _get_scheduler_meta(key):
    rec = SchedulerMeta.query.get(key)

    return rec.value if rec else None


def _mark_trello_run_ok():
    _set_scheduler_meta(
        'trello_last_success',
        date.today().isoformat()
    )


def _ran_today():
    return _get_scheduler_meta('trello_last_success') == date.today().isoformat()

#pega data de hoje e verifica alvarás e certificados e cria caso não tenha - Função principal
def check_and_create_trello_cards():
    from run import app
    with app.app_context():
        hoje = datetime.now().date()

        logging.info(
            f"Verificando certificados com vencimento de hoje até 15 dias: "
            f"{hoje.isoformat()} a {(hoje + timedelta(days=15)).isoformat()}"
        )

        #se alvará não tem validade ou empresa ele ignora
        for alv in Alvara.query.all():
            if not alv.validade or not alv.empresa:
                continue

            dias_para_vencimento = (alv.validade - hoje).days

        #o card é criado a partir do dia da notificação e se não verifica até vencer
            if 0 <= dias_para_vencimento <= alv.notificacao_dias:
                ja_registrado = NotificacaoTrello.query.filter_by(
                    codigo_empresa=alv.empresa.codigo_empresa,
                    tipo="alvara",
                    validade=alv.validade
                ).first()

                if not ja_registrado:
                    titulo = f"{alv.empresa.nome_emp} | {alv.tipo} | {alv.empresa.codigo_empresa}"

                    try:
                        criar_card_trello(
                            titulo,
                            current_app.config['TRELLO_ALVARAS_LIST_ID']
                        )
                        #antes de criar card já procura se não existe
                        db.session.add(NotificacaoTrello(
                            codigo_empresa=alv.empresa.codigo_empresa,
                            tipo="alvara",
                            validade=alv.validade
                        ))

                        logging.info(
                            f"Card criado para alvará de {alv.empresa.codigo_empresa} "
                            f"(vence em {alv.validade}, notificação {alv.notificacao_dias} dias antes)"
                        )

                    except Exception as e:
                        logging.error(
                            f"Erro ao criar card para alvará {alv.empresa.codigo_empresa}: {e}"
                        )

        ativos = Certificado.query.join(Empresa).filter(
            Empresa.stat_emp == 'A'
        ).all()

        for cert in ativos:
            if not cert.validade:
                continue

            dias_restantes = (cert.validade - hoje).days
            # verifica a partir dos 15 dias antes de vencer até o vencimento
            if 0 <= dias_restantes <= 15:
                ja_registrado = NotificacaoTrello.query.filter_by(
                    codigo_empresa=cert.codigo_empresa,
                    tipo="certificado",
                    validade=cert.validade
                ).first()

                if not ja_registrado:
                    titulo = (
                        f"{cert.codigo_empresa} - "
                        f"{cert.empresa.nome_emp} - "
                        f"{cert.validade.strftime('%d/%m/%Y')}"
                    )

                    for tentativa in range(3):
                        try:
                            criar_card_trello(
                                titulo,
                                current_app.config['TRELLO_CERTIFICADOS_LIST_ID']
                            )

                            db.session.add(NotificacaoTrello(
                                codigo_empresa=cert.codigo_empresa,
                                tipo="certificado",
                                validade=cert.validade
                            ))

                            logging.info(
                                f"Card criado para certificado {cert.codigo_empresa}"
                            )

                            break

                        except Exception as e:
                            logging.warning(
                                f"Tentativa {tentativa + 1}/3 falhou ao criar card do Trello "
                                f"para {cert.codigo_empresa}: {e}"
                            )

                            if tentativa == 2:
                                logging.error(
                                    f"Falha final ao criar card para certificado {cert.codigo_empresa}"
                                )

        try:
            db.session.commit()
            _mark_trello_run_ok() #grava em SchedulerMeta se deu certo e o dia
            logging.info("Notificações do Trello finalizadas com sucesso.")

        except Exception as e:
            db.session.rollback()
            logging.error(f"Erro ao salvar notificações no banco: {e}")


def watchdog_trello_cards():
    from run import app  # Importação local para evitar import circular
    
    with app.app_context():
        if not _ran_today():
            logging.warning(
                "Watchdog: nenhuma execução OK registrada hoje, reexecutando criação de cards."
            )

            try:
                # O contexto já está ativo aqui, então a função principal vai rodar sem problemas
                check_and_create_trello_cards()

            except Exception as e:
                logging.error(f"Watchdog falhou: {e}")
