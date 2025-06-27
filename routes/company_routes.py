from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db, Company

company_bp = Blueprint('company', __name__)

@company_bp.route('/api/sirketler', methods=['GET'])
@login_required
def sirketleri_getir():
    # Tüm şirketleri getir, kullanıcı filtresini kaldır
    sirketler = Company.query.all()
    return jsonify([{'id': c.id, 'ad': c.name} for c in sirketler])

@company_bp.route('/api/sirketler', methods=['POST'])
@login_required
def sirket_ekle():
    data = request.get_json()
    ad = data.get('ad')
    if not ad:
        return jsonify({'mesaj': 'Şirket adı zorunlu.'}), 400
    sirket = Company(name=ad, user_id=current_user.id)
    db.session.add(sirket)
    db.session.commit()
    return jsonify({'mesaj': 'Şirket başarıyla eklendi.', 'id': sirket.id})
