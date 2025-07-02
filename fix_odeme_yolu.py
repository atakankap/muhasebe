from app import app, db
from models import Invoice

with app.app_context():
    updated = 0
    for f in Invoice.query.all():
        if not f.odeme_yolu:
            f.odeme_yolu = 'banka'
            updated += 1
    db.session.commit()
    print(f"Güncellenen fatura sayısı: {updated}")
