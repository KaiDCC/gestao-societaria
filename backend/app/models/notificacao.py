from datetime import datetime

from app import db

#voltado apenas para o trello
class NotificacaoTrello(db.Model):
    __tablename__ = 'notificacao_trello'

    id = db.Column(db.Integer, primary_key=True)

    codigo_empresa = db.Column(db.String(20), nullable=False)
    tipo = db.Column(db.String(20), nullable=False)
    validade = db.Column(db.Date, nullable=False)

    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint(
            'codigo_empresa',
            'tipo',
            'validade',
            name='uq_notificacao_empresa_tipo_validade'
        ),
    )


class SchedulerMeta(db.Model):
    __tablename__ = 'scheduler_meta'

    key = db.Column(db.String(50), primary_key=True)
    value = db.Column(db.String(50), nullable=False)

#novo formato para o intranet
class NotificacaoValidade(db.Model):
    __tablename__ = 'notificacao_validade'

    id = db.Column(db.Integer, primary_key=True)

    chave_local = db.Column(db.String(255), nullable=False)
    codigo_empresa = db.Column(db.String(20), nullable=False)

    tipo_notificacao = db.Column(db.String(30), nullable=False)
    origem = db.Column(db.String(50), nullable=False)

    validade = db.Column(db.Date, nullable=False)

    destino = db.Column(db.String(50), nullable=False, default="intranet")
    status_envio = db.Column(db.String(30), nullable=False, default="pendente")

    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_envio = db.Column(db.DateTime, nullable=True)

    erro = db.Column(db.Text, nullable=True)

    __table_args__ = (
        db.UniqueConstraint(
            'chave_local',
            'destino',
            name='uq_notificacao_validade_chave_destino'
        ),
    )
