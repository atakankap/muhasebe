import os
import secrets
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, render_template, session
from flask_login import LoginManager
from flask_cors import CORS
from extensions import db
from models import User
from datetime import timedelta

# SECRET_KEY
SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)

# Flask uygulama başlat
app = Flask(__name__, static_folder='static', template_folder='templates')

# CORS ayarı
CORS(app, supports_credentials=True)

# Temel güvenlik ayarları
app.config['SECRET_KEY'] = SECRET_KEY
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('PRODUCTION', 'False') == 'True'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=1)
app.config['SESSION_TYPE'] = 'filesystem'

# DATABASE bağlantısı
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'sqlite:///db.sqlite3'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Oturumu kalıcı yap
@app.before_request
def make_session_permanent():
    session.permanent = True

# DB ve login ayarları
db.init_app(app)
login_manager = LoginManager(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Ana sayfa
@app.route('/')
def index():
    return render_template('index.html')

# Blueprint kayıtları
from routes.auth_routes import auth_bp
from routes.company_routes import company_bp
from routes.invoice_routes import invoice_routes
from routes.report_routes import report_routes

app.register_blueprint(auth_bp)
app.register_blueprint(company_bp)
app.register_blueprint(invoice_routes)
app.register_blueprint(report_routes)

# Geliştirme ortamı için veritabanı oluştur
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
