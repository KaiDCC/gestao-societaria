from datetime import datetime

from app import db


class TipoAlvara(db.Model):
    __tablename__ = 'tipo_alvara'

    id = db.Column(db.Integer, primary_key=True)

    nome = db.Column(db.String(100), unique=True, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome
        }


class Alvara(db.Model):
    __tablename__ = 'alvara'

    id = db.Column(db.Integer, primary_key=True)

    empresa_id = db.Column(
        db.Integer,
        db.ForeignKey('empresa.id'),
        nullable=False
    )

    empresa = db.relationship(
        'Empresa',
        back_populates='alvaras'
    )

    tipo = db.Column(db.String(100), nullable=False)
    responsavel = db.Column(db.String(100), nullable=False)
    responsavel_id = db.Column(db.Integer, db.ForeignKey('responsavel.id'), nullable=True)
    responsavel_rel = db.relationship('Responsavel', lazy=True)

    validade = db.Column(db.Date)
    notificacao_dias = db.Column(db.Integer, nullable=False, default=30)

    anexo = db.Column(db.String(200))
    observacoes = db.Column(db.Text)

    dispensada = db.Column(db.Boolean, default=False)
    indeterminada = db.Column(db.Boolean, default=False)
    arquivado = db.Column(db.Boolean, default=False)
    em_renovacao = db.Column(db.Boolean, default=False)
    pendente = db.Column(db.Boolean, default=False)

    @property
    def status(self):
        if self.dispensada or self.indeterminada:
            return 'No Prazo'

        hoje = datetime.now().date()

        if self.validade:
            dias_restantes = (self.validade - hoje).days

            if dias_restantes < 0:
                return 'Vencido'
            elif dias_restantes <= self.notificacao_dias:
                return 'A Vencer'
            else:
                return 'No Prazo'

        return 'Sem Validade'

    def to_dict(self):
        return {
            'id': self.id,
            'empresa_id': self.empresa_id,
            'empresa': self.empresa.nome_emp if self.empresa else '',
            'tipo': self.tipo,
            'responsavel': self.responsavel_rel.nome if self.responsavel_rel else self.responsavel,
            'responsavel_id': self.responsavel_id,
            'validade': self.validade.strftime('%Y-%m-%d') if self.validade else 'N/A',
            'notificacao_dias': self.notificacao_dias,
            'anexo': self.anexo,
            'observacoes': self.observacoes,
            'status': self.status,
            'dispensada': self.dispensada,
            'indeterminada': self.indeterminada,
            'arquivado': self.arquivado,
            'em_renovacao': self.em_renovacao,
            'pendente': self.pendente
        }
