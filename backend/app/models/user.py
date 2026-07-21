from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

from app import db


class User(UserMixin, db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)

    email = db.Column(db.String(150), unique=True, nullable=False)
    nome = db.Column(db.String(150), nullable=False)
    senha_hash = db.Column(db.String(256), nullable=False)

    is_admin = db.Column(db.Boolean, default=False)
    can_add = db.Column(db.Boolean, default=False)
    can_edit = db.Column(db.Boolean, default=False)
    can_delete = db.Column(db.Boolean, default=False)
    can_export = db.Column(db.Boolean, default=False)

    responsaveis = db.relationship(
        'Responsavel',
        back_populates='usuario',
        lazy=True
    )

    def set_password(self, senha):
        self.senha_hash = generate_password_hash(senha)

    def check_password(self, senha):
        return check_password_hash(self.senha_hash, senha)


class Responsavel(db.Model):
    __tablename__ = 'responsavel'

    id = db.Column(db.Integer, primary_key=True)

    nome = db.Column(db.String(100), nullable=False)

    __table_args__ = (
        db.UniqueConstraint('nome', name='uq_responsavel_nome'),
    )

    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id', name='fk_responsavel_usuario_id'),
        nullable=False
    )

    usuario = db.relationship(
        'User',
        back_populates='responsaveis'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'usuario_nome': self.usuario.nome if self.usuario else None
        }
