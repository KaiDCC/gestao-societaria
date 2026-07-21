#agenda a execução
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor

from app.scheduler.jobs import (
    check_and_create_trello_cards,
    watchdog_trello_cards
)


def start_scheduler_once(app):
    if getattr(app, "_scheduler_started", False):
        return

    jobstores = {
        'default': SQLAlchemyJobStore(
            url='sqlite:///scheduler_jobs.sqlite'
        )
    }

    executors = {
        'default': ThreadPoolExecutor(5)
    }

    job_defaults = {
        'coalesce': True,
        'max_instances': 1,
        'misfire_grace_time': 3600
    }

    scheduler = BackgroundScheduler(
        timezone="America/Sao_Paulo",
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults
    )

    #verifica vencimentos e cria cards
    scheduler.add_job(
        check_and_create_trello_cards,
        trigger='cron',
        hour=8,
        minute=0,
        second=0,
        id='trello_notificacoes_geral',
        replace_existing=True,
        jitter=30
    )

    #verifica se primeiro job rodou senão ele tenta de novo
    scheduler.add_job(
        watchdog_trello_cards,
        trigger='cron',
        hour=8,
        minute=30,
        second=0,
        id='trello_watchdog',
        replace_existing=True,
        jitter=30
    )

    scheduler.start()

    app._scheduler_started = True

    logging.getLogger('apscheduler').setLevel(logging.INFO)
    logging.info("APScheduler iniciado")

