from app import db

class Assessoria(db.Model):
    __tablename__ = "assessoria"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(50), unique=True, nullable=False)
    razao_social = db.Column(db.String(200), nullable=False)
    cidade = db.Column(db.String(100))
    uf = db.Column(db.String(2))
    logradouro = db.Column(db.String(200))
    numero = db.Column(db.String(30))
    bairro = db.Column(db.String(100))
    cep = db.Column(db.String(20))
    cnpj = db.Column(db.String(20))
    
    # Novos campos:
    email = db.Column(db.String(150))
    crc_empresa = db.Column(db.String(50))
    
    representante_nome = db.Column(db.String(200))
    representante_cpf = db.Column(db.String(20))
    representante_crc = db.Column(db.String(50))
    
    ativo = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            "id": self.id,
            "slug": self.slug,
            "razao_social": self.razao_social,
            "cidade": self.cidade,
            "uf": self.uf,
            "logradouro": self.logradouro,
            "numero": self.numero,
            "bairro": self.bairro,
            "cep": self.cep,
            "cnpj": self.cnpj,
            "email": self.email,
            "crc_empresa": self.crc_empresa,
            "representante_nome": self.representante_nome,
            "representante_cpf": self.representante_cpf,
            "representante_crc": self.representante_crc,
            "ativo": self.ativo
        }