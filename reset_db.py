from app import app, db
from models import User

# Flask uygulama bağlamı içinde çalış
with app.app_context():
    # Tüm tabloları sil
    db.drop_all()
    print("Tüm tablolar silindi.")
    
    # Tabloları yeniden oluştur
    db.create_all()
    print("Tablolar yeniden oluşturuldu.")
    
    # Sabit kullanıcıları ekle
    users = [
        User(username="atakan1", password="lacs2024"),
        User(username="leyla1", password="lacs2024"),
        User(username="cagatay1", password="lacs2024"),
        User(username="sinan1", password="lacs2024")
    ]
    
    db.session.add_all(users)
    db.session.commit()
    print("Sabit kullanıcılar eklendi.")
    
    print("Veritabanı başarıyla sıfırlandı!")
