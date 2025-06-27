from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
import os

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    companies = db.relationship('Company', backref='owner', lazy=True)

    def __init__(self, username, password):
        self.username = username
        self.set_password(password)

    def set_password(self, password):
        # Daha güçlü şifreleme metodu kullan
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256:150000')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    # UserMixin için gerekli metotlar (flask_login için)
    def get_id(self):
        return str(self.id)
        
    @property
    def is_active(self):
        return True
        
    @property
    def is_authenticated(self):
        return True
        
    @property
    def is_anonymous(self):
        return False

class Company(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Invoice(db.Model):
    """
    Fatura Modeli
    - tip: 'gelen' veya 'giden'
    - fatura_no: Fatura Numarası
    - musteri_tedarikci: Müşteri veya Tedarikçi adı
    - tarih: Fatura tarihi
    - tutar: Fatura tutarı
    - kdv_orani: KDV oranı (%)
    - kdv_tutari: KDV tutarı
    - aciklama: Açıklama
    - para_birimi: PLN, EUR, USD
    - company_id: Hangi şirkete ait
    - user_id: Hangi kullanıcıya ait
    """
    id = db.Column(db.Integer, primary_key=True)
    tip = db.Column(db.String(10), nullable=False)  # 'gelen' veya 'giden'
    fatura_no = db.Column(db.String(50), nullable=False)
    musteri_tedarikci = db.Column(db.String(120), nullable=False)
    tarih = db.Column(db.String(20), nullable=False)
    tutar = db.Column(db.Float, nullable=False)
    kdv_orani = db.Column(db.Float, nullable=False)
    kdv_tutari = db.Column(db.Float, nullable=False)
    aciklama = db.Column(db.String(255))
    para_birimi = db.Column(db.String(10), nullable=False, default='PLN')
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    company = db.relationship('Company', backref='faturalar', lazy=True)
    user = db.relationship('User', backref='faturalar', lazy=True)
