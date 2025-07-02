import os
import sys
from app import app, db
from models import Company, User

os.environ['FLASK_ENV'] = 'development'

def main():
    print("ID | Şirket Adı | User ID | Kullanıcı Adı")
    for c in Company.query.all():
        user = User.query.get(c.user_id)
        print(f"{c.id} | {c.name} | {c.user_id} | {user.username if user else 'BULUNAMADI'}")

if __name__ == "__main__":
    with app.app_context():
        main()
