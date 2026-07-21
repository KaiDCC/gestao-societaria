from app import db

#pega da domínio mas na tabela empresa retorna apenas um id, fiz uma tabela com o que era qual ID (naquela empresa) para a tela já converter e não ficar consufuso para o usu´rio trazendo só um código.
class TipoEnderecoDominio(db.Model):
    __tablename__ = "tipo_endereco_dominio"

    id = db.Column(db.Integer, primary_key=True)

    codigo = db.Column(
        db.Integer,
        unique=True,
        nullable=False
    )

    descricao = db.Column(
        db.String(50),
        nullable=False
    )

    def to_dict(self):
        return {
            "id": self.id,
            "codigo": self.codigo,
            "descricao": self.descricao,
        }
