from app import db


class Empresa(db.Model):
    __tablename__ = 'empresa'

    id = db.Column(db.Integer, primary_key=True)

    codigo_empresa = db.Column(db.String(20), unique=True, nullable=False)
    apel_emp = db.Column(db.String(100), nullable=False)
    nome_emp = db.Column(db.String(100), nullable=False)

    cnpj = db.Column(db.String(20), nullable=False)
    cnpj_base = db.Column(db.String(8), nullable=False)

    razao_social = db.Column(db.String(100), nullable=True)
    ijuc_emp = db.Column(db.String(50), nullable=True)
    dcad_emp = db.Column(db.Date, nullable=True)
    stat_emp = db.Column(db.String(1), nullable=True)
    cida_emp = db.Column(db.String(100), nullable=True)
    esta_emp = db.Column(db.String(2), nullable=True)
    iest_emp = db.Column(db.String(50), nullable=True)
    imun_emp = db.Column(db.String(50), nullable=True)
    njud_emp = db.Column(db.String(100), nullable=True)

    alvaras = db.relationship(
        'Alvara',
        back_populates='empresa',
        lazy=True
    )

    certificados = db.relationship(
        'Certificado',
        back_populates='empresa',
        lazy=True
    )

    def to_dict(self):
        return {
            'id': self.id,
            'codigo_empresa': self.codigo_empresa,
            'apel_emp': self.apel_emp,
            'nome_emp': self.nome_emp,
            'cnpj': self.cnpj,
            'cnpj_base': self.cnpj_base,
            'razao_social': self.razao_social,
            'ijuc_emp': self.ijuc_emp,
            'dcad_emp': self.dcad_emp.strftime('%Y-%m-%d') if self.dcad_emp else None,
            'stat_emp': self.stat_emp,
            'cida_emp': self.cida_emp,
            'esta_emp': self.esta_emp,
            'iest_emp': self.iest_emp,
            'imun_emp': self.imun_emp,
            'njud_emp': self.njud_emp
        }
