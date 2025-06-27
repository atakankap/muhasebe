from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from models import db, User
import os

auth_bp = Blueprint('auth', __name__)

# Sabit kullanıcılar ve şifreleri
SABIT_KULLANICILAR = {
    'atakan1': 'lacs2024',
    'leyla1': 'lacs2024',
    'cagatay1': 'lacs2024',
    'sinan1': 'lacs2024'
}

@auth_bp.route('/api/register', methods=['POST'])
def kullanici_kayit():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'mesaj': 'Kullanıcı adı ve şifre zorunlu.'}), 400
        
    # Sadece belirlenen 4 kullanıcıya izin ver
    if username not in SABIT_KULLANICILAR:
        return jsonify({'mesaj': 'Yetkisiz erişim. Kayıt yetkiniz yok.'}), 403
    
    # Şifre kontrolü
    if password != SABIT_KULLANICILAR[username]:
        return jsonify({'mesaj': 'Geçersiz şifre.'}), 401
        
    # Kullanıcı zaten var mı kontrolü
    if User.query.filter_by(username=username).first():
        return jsonify({'mesaj': 'Bu kullanıcı zaten kayıtlı.'}), 409
        
    user = User(username=username, password=password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'mesaj': 'Kullanıcı başarıyla kaydedildi.'})

@auth_bp.route('/api/login', methods=['POST'])
def kullanici_giris():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    # Kullanıcı adı ve şifre kontrolü
    if not username or not password:
        return jsonify({'mesaj': 'Kullanıcı adı ve şifre zorunlu.'}), 400
        
    # Sadece izin verilen kullanıcılar
    if username not in SABIT_KULLANICILAR:
        return jsonify({'mesaj': 'Kullanıcı bulunamadı.'}), 401
    
    user = User.query.filter_by(username=username).first()
    
    # Kullanıcı yoksa otomatik oluştur (ilk giriş için)
    if not user:
        user = User(username=username, password=SABIT_KULLANICILAR[username])
        db.session.add(user)
        db.session.commit()
    
    # Şifre kontrolü
    if user and user.check_password(password):
        login_user(user)
        return jsonify({'mesaj': 'Giriş başarılı.'})
    
    return jsonify({'mesaj': 'Geçersiz şifre.'}), 401

@auth_bp.route('/api/logout', methods=['POST'])
@login_required
def cikis():
    logout_user()
    return jsonify({'mesaj': 'Çıkış yapıldı.'})
