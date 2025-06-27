from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db, Invoice, Company
from datetime import datetime, timedelta
import random

invoice_routes = Blueprint('invoice', __name__)

@invoice_routes.route('/api/faturalar', methods=['POST'])
@login_required
def fatura_ekle():
    data = request.get_json()
    tip = data.get('tip')  # 'gelen' veya 'giden'
    fatura_no = data.get('fatura_no')
    musteri_tedarikci = data.get('musteri_tedarikci')
    tarih = data.get('tarih')
    tutar = data.get('tutar')
    kdv_orani = data.get('kdv_orani')
    kdv_tutari = data.get('kdv_tutari')
    aciklama = data.get('aciklama')
    para_birimi = data.get('para_birimi', 'PLN')
    company_id = data.get('company_id')

    if not all([tip, fatura_no, musteri_tedarikci, tarih, tutar, kdv_orani, kdv_tutari, company_id]):
        return jsonify({'mesaj': 'Lütfen tüm zorunlu alanları doldurun.'}), 400
    if tip not in ['gelen', 'giden']:
        return jsonify({'mesaj': 'Fatura tipi geçersiz.'}), 400
    if para_birimi not in ['PLN', 'EUR', 'USD']:
        return jsonify({'mesaj': 'Para birimi geçersiz.'}), 400
    company = Company.query.filter_by(id=company_id, user_id=current_user.id).first()
    if not company:
        return jsonify({'mesaj': 'Şirket bulunamadı.'}), 404

    fatura = Invoice(
        tip=tip,
        fatura_no=fatura_no,
        musteri_tedarikci=musteri_tedarikci,
        tarih=tarih,
        tutar=tutar,
        kdv_orani=kdv_orani,
        kdv_tutari=kdv_tutari,
        aciklama=aciklama,
        para_birimi=para_birimi,
        company_id=company_id,
        user_id=current_user.id
    )
    db.session.add(fatura)
    db.session.commit()
    return jsonify({'mesaj': 'Fatura başarıyla kaydedildi.'})
# Demo faturalar için yardımcı fonksiyonlar

@invoice_routes.route('/api/demo-faturalar', methods=['POST'])
@login_required
def demo_faturalar_ekle():
    data = request.get_json() or {}
    company_id = data.get('company_id')
    adet = int(data.get('adet', 500))
    if not company_id:
        return jsonify({'mesaj': 'Şirket ID gerekli.'}), 400
    company = Company.query.filter_by(id=company_id, user_id=current_user.id).first()
    if not company:
        return jsonify({'mesaj': 'Şirket bulunamadı.'}), 404
    para_birimleri = ['PLN','EUR','USD']
    musteri_list = ['Firma A','Firma B','Firma C','Firma D']
    bugun = datetime.now()
    eklenen = 0
    for i in range(adet):
        tip = random.choice(['gelen','giden'])
        ay = random.randint(1,12)
        gun = random.randint(1,28)
        yil = bugun.year
        tarih = f"{yil}-{ay:02d}-{gun:02d}"
        tutar = round(random.uniform(100, 10000),2)
        kdv_orani = random.choice([1,8,18])
        kdv_tutari = round(tutar * kdv_orani / 100,2)
        para_birimi = random.choice(para_birimleri)
        musteri_tedarikci = random.choice(musteri_list)
        aciklama = f"Test veri {i+1}"
        fatura = Invoice(
            tip=tip,
            fatura_no=f"DMR-{yil}{ay:02d}{gun:02d}-{i+1}",
            musteri_tedarikci=musteri_tedarikci,
            tarih=tarih,
            tutar=tutar,
            kdv_orani=kdv_orani,
            kdv_tutari=kdv_tutari,
            aciklama=aciklama,
            para_birimi=para_birimi,
            company_id=company_id,
            user_id=current_user.id
        )
        db.session.add(fatura)
        eklenen += 1
    db.session.commit()
    return jsonify({'mesaj': f'{eklenen} demo fatura eklendi.'})

@invoice_routes.route('/api/faturalar', methods=['GET'])
@login_required
def faturalar_listele():
    company_id = request.args.get('company_id')
    tip = request.args.get('tip')  # 'gelen' veya 'giden' veya boş
    
    # Kullanıcı filtresini kaldır - tüm faturalar görünsün
    sorgu = Invoice.query
    
    if company_id:
        sorgu = sorgu.filter_by(company_id=company_id)
    if tip in ['gelen', 'giden']:
        sorgu = sorgu.filter_by(tip=tip)
        
    # Tarih formatı YYYY-MM-DD olduğu için string olarak sıralama doğru çalışacak
    # Ancak daha güvenli olması için tarih formatını kontrol edelim
    try:
        faturalar = sorgu.order_by(Invoice.tarih.desc()).all()
        # Tarih formatını kontrol et ve gerekirse düzelt
        for fatura in faturalar:
            try:
                # Tarih formatını kontrol et
                datetime.strptime(fatura.tarih, '%Y-%m-%d')
            except ValueError:
                # Hatalı tarih formatı, düzeltmeye çalış
                parts = fatura.tarih.split('-')
                if len(parts) == 3:
                    year, month, day = parts
                    # Yıl 4 haneli, ay ve gün 2 haneli olmalı
                    if len(year) == 4 and len(month) <= 2 and len(day) <= 2:
                        fatura.tarih = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                        db.session.commit()
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
    # Fatura listesini oluştur
    sonuc = [{
        'id': f.id,
        'tip': f.tip,
        'fatura_no': f.fatura_no,
        'musteri_tedarikci': f.musteri_tedarikci,
        'tarih': f.tarih,
        'tutar': f.tutar,
        'kdv_orani': f.kdv_orani,
        'kdv_tutari': f.kdv_tutari,
        'aciklama': f.aciklama,
        'para_birimi': f.para_birimi,
        'company_id': f.company_id
    } for f in faturalar]
    
    return jsonify(sonuc)

@invoice_routes.route('/api/faturalar/<int:fatura_id>', methods=['DELETE'])
@login_required
def fatura_sil(fatura_id):
    fatura = Invoice.query.get(fatura_id)
    
    if not fatura:
        return jsonify({'mesaj': 'Fatura bulunamadı.'}), 404
    
    # Faturayı sil
    db.session.delete(fatura)
    db.session.commit()
    
    return jsonify({'mesaj': 'Fatura başarıyla silindi.'}), 200
