from app import app, db
from models import User, Company, Invoice

def clean_and_setup_db():
    with app.app_context():
        print("Veritabanı temizleme ve kurulum işlemi başlatılıyor...")
        
        # Tüm faturaları temizle
        print("Tüm faturalar siliniyor...")
        Invoice.query.delete()
        
        # Tüm şirketleri temizle
        print("Tüm şirketler siliniyor...")
        Company.query.delete()
        
        # Kullanıcıları kontrol et
        users = User.query.all()
        if not users:
            print("Kullanıcı bulunamadı, sabit kullanıcılar ekleniyor...")
            # Sabit kullanıcıları ekle
            users_to_add = [
                User(username="atakan1", password="lacs2024"),
                User(username="leyla1", password="lacs2024"),
                User(username="cagatay1", password="lacs2024"),
                User(username="sinan1", password="lacs2024")
            ]
            db.session.add_all(users_to_add)
        
        # Değişiklikleri kaydet
        db.session.commit()
        
        # İlk kullanıcıyı al
        first_user = User.query.first()
        
        if not first_user:
            print("Kullanıcı bulunamadı!")
            return
        
        # İstenen 3 şirketi ekle
        print("İstenen şirketler ekleniyor...")
        companies_to_add = [
            Company(name="Leyer Poland", user_id=first_user.id),
            Company(name="Lacs Group", user_id=first_user.id),
            Company(name="Kubpol", user_id=first_user.id)
        ]
        
        db.session.add_all(companies_to_add)
        db.session.commit()
        
        print("Veritabanı temizleme ve kurulum işlemi tamamlandı!")
        print("Eklenen şirketler:")
        for company in Company.query.all():
            print(f"- {company.name}")

if __name__ == "__main__":
    clean_and_setup_db()
