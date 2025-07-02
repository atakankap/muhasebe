import sqlite3

conn = sqlite3.connect('muhasebe.db')
c = conn.cursor()

try:
    c.execute("ALTER TABLE invoice ADD COLUMN odeme_yolu VARCHAR(10) NOT NULL DEFAULT 'banka';")
    print("Kolon eklendi!")
except Exception as e:
    print("Zaten ekli veya hata:", e)

conn.commit()
conn.close()
