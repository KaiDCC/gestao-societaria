from datetime import datetime

from app import db


class Certificado(db.Model):
    __tablename__ = 'certificado'

    id = db.Column(db.Integer, primary_key=True)

    empresa_id = db.Column(
        db.Integer,
        db.ForeignKey('empresa.id'),
        nullable=False
    )

    empresa = db.relationship(
        'Empresa',
        back_populates='certificados'
    )

    codigo_empresa = db.Column(db.String(20), nullable=False)
    cnpj = db.Column(db.String(20), nullable=False)
    razao_social = db.Column(db.String(100), nullable=False)

    validade = db.Column(db.Date)

    arquivo = db.Column(db.String(200))
    senha = db.Column(db.String(100))
    numero_serie = db.Column(db.String(100))
    algoritmo_assinatura = db.Column(db.String(100))
    issuer = db.Column(db.String(200))
    observacoes = db.Column(db.Text)

    def to_dict(self):
        hoje = datetime.now().date()

        if self.validade:
            dias_restantes = (self.validade - hoje).days

            if dias_restantes < 0:
                status = 'Vencido'
            elif dias_restantes <= 15:
                status = 'A Vencer'
            else:
                status = 'No Prazo'
        else:
            status = 'Sem Validade'

        return {
            'id': self.id,
            'codigo_empresa': self.codigo_empresa,
            'empresa': self.empresa.nome_emp if self.empresa else '',
            'cnpj': self.cnpj,
            'razao_social': self.razao_social,
            'validade': self.validade.strftime('%Y-%m-%d') if self.validade else 'N/A',
            'arquivo': self.arquivo,
            'senha': self.senha,
            'numero_serie': self.numero_serie,
            'algoritmo_assinatura': self.algoritmo_assinatura,
            'issuer': self.issuer,
            'observacoes': self.observacoes,
            'status': status
        }


class CertificadoEcpf(db.Model):
    __tablename__ = 'certificado_ecpf'

    id = db.Column(db.Integer, primary_key=True)

    empresa_id = db.Column(
        db.Integer,
        db.ForeignKey('empresa.id'),
        nullable=True
    )

    empresa = db.relationship(
        'Empresa',
        lazy=True
    )

    codi_emp = db.Column(db.String(20), nullable=True)

    nome_pessoa = db.Column(db.String(200), nullable=False)
    cpf = db.Column(db.String(20), nullable=False)

    validade = db.Column(db.Date)

    arquivo = db.Column(db.String(200))
    senha = db.Column(db.String(100))
    numero_serie = db.Column(db.String(100))
    algoritmo_assinatura = db.Column(db.String(100))
    issuer = db.Column(db.String(200))
    observacoes = db.Column(db.Text)

    def to_dict(self):
        hoje = datetime.now().date()

        if self.validade:
            dias_restantes = (self.validade - hoje).days

            if dias_restantes < 0:
                status = 'Vencido'
            elif dias_restantes <= 15:
                status = 'A Vencer'
            else:
                status = 'No Prazo'
        else:
            status = 'Sem Validade'

        return {
            'id': self.id,
            'codi_emp': self.codi_emp,
            'empresa': self.empresa.nome_emp if self.empresa and self.codi_emp != 'Todos' else (self.codi_emp if self.codi_emp == 'Todos' else ''),
            'nome_pessoa': self.nome_pessoa,
            'cpf': self.cpf,
            'validade': self.validade.strftime('%Y-%m-%d') if self.validade else 'N/A',
            'arquivo': self.arquivo,
            'senha': self.senha,
            'numero_serie': self.numero_serie,
            'algoritmo_assinatura': self.algoritmo_assinatura,
            'issuer': self.issuer,
            'observacoes': self.observacoes,
            'status': status
        }
