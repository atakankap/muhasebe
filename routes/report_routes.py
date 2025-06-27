from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime
from extensions import db
from collections import defaultdict
from models import Invoice, Company
import traceback

report_routes = Blueprint('report', __name__)

def serialize_invoice(f):
    return {
        'id': f.id,
        'tip': f.tip,
        'fatura_no': f.fatura_no,
        'musteri_tedarikci': f.musteri_tedarikci,
        'tarih': f.tarih,
        'tutar': f.tutar,
        'kdv_orani': f.kdv_orani,
        'kdv_tutari': f.kdv_tutari,
        'aciklama': f.aciklama,
        'para_birimi': f.para_birimi
    }

@report_routes.route('/api/rapor/ozet', methods=['GET'])
@login_required
def rapor_ozet():
    try:
        company_id = request.args.get('company_id', type=int)
        yil = request.args.get('yil', type=int)
        ay = request.args.get('ay', type=int)

        if not company_id:
            return jsonify({'mesaj': 'Şirket seçilmedi.'}), 400

        sorgu = Invoice.query.filter_by(user_id=current_user.id, company_id=company_id)
        if yil:
            sorgu = sorgu.filter(Invoice.tarih.like(f"{yil}-%"))
        if ay and yil:
            ay_str = str(ay).zfill(2)
            sorgu = sorgu.filter(Invoice.tarih.like(f"{yil}-{ay_str}%"))
        
        try:
            faturalar = sorgu.all()
        except Exception as e:
            print(f"Fatura sorgulama hatası: {str(e)}")
            return jsonify({'error': f"Fatura sorgulama hatası: {str(e)}", 'veri_var_mi': False}), 500
            
        # Eğer fatura yoksa boş rapor döndür
        if not faturalar:
            return jsonify({
                'veri_var_mi': False,
                'toplam_gelen': 0,
                'toplam_giden': 0,
                'toplam_kdv_gelen': 0,
                'toplam_kdv_giden': 0,
                'toplam_kdv_net': 0,
                'adet_gelen': 0,
                'adet_giden': 0,
                'toplam_acik': 0,
                'para_birimi_breakdown': {},
                'aylik_breakdown': {},
                'yillik_breakdown': {},
                'son10': [],
                'acik_faturalar': [],
                'aylik_detay': []
            })

        # Güvenli hesaplamalar
        try:
            toplam_gelen = sum(f.tutar or 0 for f in faturalar if f.tip == 'gelen')
            toplam_giden = sum(f.tutar or 0 for f in faturalar if f.tip == 'giden')
            toplam_kdv_gelen = sum(f.kdv_tutari or 0 for f in faturalar if f.tip == 'gelen')
            toplam_kdv_giden = sum(f.kdv_tutari or 0 for f in faturalar if f.tip == 'giden')
            adet_gelen = sum(1 for f in faturalar if f.tip == 'gelen')
            adet_giden = sum(1 for f in faturalar if f.tip == 'giden')
        except Exception as e:
            print(f"Toplam hesaplama hatası: {str(e)}")
            return jsonify({'error': f"Toplam hesaplama hatası: {str(e)}", 'veri_var_mi': False}), 500

        try:
            acik_faturalar = [
                f for f in faturalar
                if f.aciklama and ('açık' in f.aciklama.lower() or 'odeme' in f.aciklama.lower())
            ]
            toplam_acik = sum(f.tutar or 0 for f in acik_faturalar)
        except Exception as e:
            print(f"Açık fatura hesaplama hatası: {str(e)}")
            acik_faturalar = []
            toplam_acik = 0

        try:
            pb = defaultdict(lambda: {'gelen': 0, 'giden': 0})
            for f in faturalar:
                try:
                    para_birimi = f.para_birimi or 'TL'
                    tip = f.tip if f.tip in ['gelen', 'giden'] else 'gelen'
                    tutar = f.tutar or 0
                    pb[para_birimi][tip] += tutar
                except Exception as e:
                    print(f"Para birimi hesaplama hatası (fatura ID: {f.id}): {str(e)}")
                    continue
        except Exception as e:
            print(f"Para birimi breakdown hatası: {str(e)}")
            pb = defaultdict(lambda: {'gelen': 0, 'giden': 0})

        try:
            aylik = defaultdict(lambda: {'gelen': 0, 'giden': 0})
            for f in faturalar:
                try:
                    if not f.tarih or len(f.tarih) < 7:
                        continue
                    ay_key = f.tarih[:7]
                    tip = f.tip if f.tip in ['gelen', 'giden'] else 'gelen'
                    tutar = f.tutar or 0
                    aylik[ay_key][tip] += tutar
                except Exception as e:
                    print(f"Aylık hesaplama hatası (fatura ID: {f.id}): {str(e)}")
                    continue
        except Exception as e:
            print(f"Aylık breakdown hatası: {str(e)}")
            aylik = defaultdict(lambda: {'gelen': 0, 'giden': 0})

        try:
            yillik = defaultdict(lambda: {'gelen': 0, 'giden': 0})
            for f in faturalar:
                try:
                    yil_str = f.tarih[:4]
                    tip = f.tip if f.tip in ['gelen', 'giden'] else 'gelen'
                    tutar = f.tutar or 0
                    yillik[yil_str][tip] += tutar
                except Exception as e:
                    print(f"Yıllık hesaplama hatası (fatura ID: {f.id}): {str(e)}")
                    continue
        except Exception as e:
            print(f"Yıllık breakdown hatası: {str(e)}")
            yillik = defaultdict(lambda: {'gelen': 0, 'giden': 0})

        try:
            son10 = sorted(faturalar, key=lambda x: x.tarih if x.tarih else '', reverse=True)[:10]
            son10_list = []
            for f in son10:
                try:
                    son10_list.append({
                        'id': f.id,
                        'tip': f.tip if f.tip in ['gelen', 'giden'] else 'gelen',
                        'fatura_no': f.fatura_no or '',
                        'musteri_tedarikci': f.musteri_tedarikci or '',
                        'tarih': f.tarih or '',
                        'tutar': f.tutar or 0,
                        'kdv_orani': f.kdv_orani or 0,
                        'kdv_tutari': f.kdv_tutari or 0,
                        'aciklama': f.aciklama or '',
                        'para_birimi': f.para_birimi or 'TL'
                    })
                except Exception as e:
                    print(f"Son10 fatura dönüştürme hatası (fatura ID: {f.id}): {str(e)}")
                    continue
        except Exception as e:
            print(f"Son10 fatura listesi hatası: {str(e)}")
            son10_list = []

        try:
            acik_list = []
            for f in acik_faturalar:
                try:
                    acik_list.append(serialize_invoice(f))
                except Exception as e:
                    print(f"Açık fatura dönüştürme hatası (fatura ID: {f.id}): {str(e)}")
                    continue
        except Exception as e:
            print(f"Açık fatura listesi hatası: {str(e)}")
            acik_list = []

        ay_isimleri = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                       'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
        aylik_detay = []

        try:
            for ay_key, deger in sorted(aylik.items()):
                try:
                    ay_kdv_gelir = sum(f.kdv_tutari or 0 for f in faturalar if f.tip == 'gelen' and f.tarih and f.tarih.startswith(ay_key))
                    ay_kdv_giden = sum(f.kdv_tutari or 0 for f in faturalar if f.tip == 'giden' and f.tarih and f.tarih.startswith(ay_key))
                except Exception as e:
                    print(f"Ay KDV hesaplama hatası ({ay_key}): {str(e)}")
                    ay_kdv_gelir = 0
                    ay_kdv_giden = 0

            try:
                kdv_oranlari = defaultdict(lambda: {'gelen': 0, 'giden': 0})
                for f in faturalar:
                    if f.tarih and f.tarih.startswith(ay_key):
                        try:
                            # Eğer kdv_orani None ise veya geçersizse, '0' olarak kabul et
                            kdv_key = f.kdv_orani if f.kdv_orani is not None else '0'
                            # Eğer tip geçersizse, varsayılan olarak 'gelen' kabul et
                            tip_key = f.tip if f.tip in ['gelen', 'giden'] else 'gelen'
                            # KDV tutarı None ise 0 olarak kabul et
                            kdv_tutari = f.kdv_tutari if f.kdv_tutari is not None else 0
                            kdv_oranlari[kdv_key][tip_key] += kdv_tutari
                        except Exception as e:
                            print(f"KDV hesaplama hatası: {str(e)} - Fatura ID: {f.id}")
                            continue
            except Exception as e:
                print(f"KDV oranları hesaplama hatası ({ay_key}): {str(e)}")
                kdv_oranlari = defaultdict(lambda: {'gelen': 0, 'giden': 0})

            try:
                kdv_orani_detay = []
                for oran, oran_data in kdv_oranlari.items():
                    try:
                        kdv_orani_detay.append({
                            'oran': oran,
                            'gelen': oran_data['gelen'],
                            'giden': oran_data['giden'],
                            'net': oran_data['gelen'] - oran_data['giden']
                        })
                    except Exception as e:
                        print(f"KDV oran detay hatası (oran: {oran}): {str(e)}")
                        continue
            except Exception as e:
                print(f"KDV oran detayları hatası: {str(e)}")
                kdv_orani_detay = []

            try:
                if ay_key and '-' in ay_key:
                    y, m = ay_key.split('-')
                    try:
                        ay_adi = ay_isimleri[int(m)-1]
                        gosterim = f"{ay_adi} {y}"
                    except (ValueError, IndexError):
                        gosterim = ay_key
                else:
                    gosterim = ay_key or 'Bilinmeyen'
            except Exception as e:
                print(f"Ay gösterim hatası ({ay_key}): {str(e)}")
                gosterim = ay_key or 'Bilinmeyen'

            try:
                aylik_detay.append({
                    'ay': ay_key,
                    'ay_gosterim': gosterim,
                    'gelir': deger['gelen'],
                    'gider': deger['giden'],
                    'net': deger['gelen'] - deger['giden'],
                    'kdv_gelir': ay_kdv_gelir,
                    'kdv_gider': ay_kdv_giden,
                    'kdv_net': ay_kdv_gelir - ay_kdv_giden,
                    'kdv_oranlari': kdv_orani_detay
                })
            except Exception as e:
                print(f"Aylık detay ekleme hatası ({ay_key}): {str(e)}")
        except Exception as e:
            print(f"Aylık detay hesaplama genel hatası: {str(e)}")
            aylik_detay = []

        return jsonify({
            'veri_var_mi': len(faturalar) > 0,
            'toplam_gelen': toplam_gelen,
            'toplam_giden': toplam_giden,
            'toplam_kdv_gelen': toplam_kdv_gelen,
            'toplam_kdv_giden': toplam_kdv_giden,
            'toplam_kdv_net': toplam_kdv_gelen - toplam_kdv_giden,
            'adet_gelen': adet_gelen,
            'adet_giden': adet_giden,
            'toplam_acik': toplam_acik,
            'para_birimi_breakdown': dict(pb),
            'aylik_breakdown': dict(aylik),
            'yillik_breakdown': dict(yillik),
            'son10': son10_list,
            'acik_faturalar': acik_list,
            'aylik_detay': aylik_detay
        })

    except Exception as e:
        print(f"Hata: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f"Rapor oluşturulurken hata: {str(e)}"}), 500
