from datetime import datetime

from app import db
from app.models.user import User


class Contrato(db.Model):
    __tablename__ = "contrato"

    id = db.Column(db.Integer, primary_key=True)

    tipo_contrato = db.Column(db.String(30), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="rascunho")
    empresa_contratada = db.Column(db.String(50), nullable=False)

    empresa_id = db.Column(
        db.Integer,
        db.ForeignKey("empresa.id"),
        nullable=True
    )

    empresa = db.relationship(
        "Empresa",
        lazy=True
    )

    codigo_empresa = db.Column(db.String(20), nullable=False)

    # infos direto da dominio conforme código pesquisado
    razao_social = db.Column(db.String(200), nullable=False)
    municipio = db.Column(db.String(100))
    uf = db.Column(db.String(2))
    tipo_endereco_codigo = db.Column(db.Integer, nullable=True)
    tipo_endereco = db.Column(db.String(50), nullable=True)
    rua = db.Column(db.String(200))
    numero = db.Column(db.String(30))
    complemento = db.Column(db.String(200), nullable=True)
    bairro = db.Column(db.String(100))
    cep = db.Column(db.String(20))
    cnpj = db.Column(db.String(20))
    socio_administrador = db.Column(db.String(200))
    cpf_socio = db.Column(db.String(20))

    # adesão
    vigencia = db.Column(db.Date)
    vigencia_extenso = db.Column(db.String(100))

    regime_tributacao = db.Column(db.String(50))
    regime_apuracao = db.Column(db.String(50))
    periodicidade_demonstrativos = db.Column(db.String(50))

    honorario_mensal = db.Column(db.Numeric(12, 2))
    honorario_mensal_extenso = db.Column(db.String(300))

    # distrato
    encerramento_obrigacoes = db.Column(db.Date)
    data_assinatura_extenso = db.Column(db.String(100))
    encerramento_obrigacoes_extenso = db.Column(db.String(100))

    # distrato com inadimplência
    valor_inadimplencia = db.Column(db.Numeric(12, 2))
    valor_inadimplencia_extenso = db.Column(db.String(300))

    # salva como JSON
    meses_pendentes = db.Column(db.Text)

    # Flag para inversão de distratante/distratado
    distratante_inverso = db.Column(db.Boolean, default=False, nullable=False)

    # Arquivos gerados
    arquivo_docx = db.Column(db.String(300))
    arquivo_pdf = db.Column(db.String(300))

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    created_by = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=True
    )

    updated_by = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=True
    )

    usuario_criacao = db.relationship(
        "User",
        foreign_keys=[created_by],
        lazy=True
    )

    usuario_atualizacao = db.relationship(
        "User",
        foreign_keys=[updated_by],
        lazy=True
    )

    def to_dict(self):
        resultado = {
            "id": self.id,
            "tipo_contrato": self.tipo_contrato,
            "empresa_contratada": self.empresa_contratada,
            "status": self.status,

            "empresa_id": self.empresa_id,
            "codigo_empresa": self.codigo_empresa,

            "razao_social": self.razao_social,
            "municipio": self.municipio,
            "uf": self.uf,
            "tipo_endereco_codigo": self.tipo_endereco_codigo,
            "tipo_endereco": self.tipo_endereco,
            "rua": self.rua,
            "numero": self.numero,
            "complemento": self.complemento,
            "bairro": self.bairro,
            "cep": self.cep,
            "cnpj": self.cnpj,
            "socio_administrador": self.socio_administrador,
            "cpf_socio": self.cpf_socio,

            "vigencia": self.vigencia.strftime("%Y-%m-%d") if self.vigencia else None,
            "vigencia_extenso": self.vigencia_extenso,

            "regime_tributacao": self.regime_tributacao,
            "regime_apuracao": self.regime_apuracao,
            "periodicidade_demonstrativos": self.periodicidade_demonstrativos,

            "honorario_mensal": float(self.honorario_mensal) if self.honorario_mensal is not None else None,
            "honorario_mensal_extenso": self.honorario_mensal_extenso,

            "encerramento_obrigacoes": self.encerramento_obrigacoes.strftime("%Y-%m-%d") if self.encerramento_obrigacoes else None,
            "encerramento_obrigacoes_extenso": self.encerramento_obrigacoes_extenso,
            "data_assinatura_extenso": self.data_assinatura_extenso,

            "valor_inadimplencia": float(self.valor_inadimplencia) if self.valor_inadimplencia is not None else None,
            "valor_inadimplencia_extenso": self.valor_inadimplencia_extenso,
            "meses_pendentes": self.meses_pendentes,

            "distratante_inverso": self.distratante_inverso,

            "arquivo_docx": self.arquivo_docx,
            "arquivo_pdf": self.arquivo_pdf,

            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S") if self.updated_at else None,

            "created_by": self.created_by,
            "updated_by": self.updated_by,
        }

        if self.created_by:
            usuario = User.query.get(self.created_by)
            resultado["criado_por_nome"] = usuario.nome if usuario else "Sistema"
        else:
            resultado["criado_por_nome"] = "Sistema"

        return resultado

    def __repr__(self):
        return f"<Contrato {self.id} - {self.tipo_contrato} - {self.codigo_empresa}>"
