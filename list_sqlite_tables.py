import sqlite3
import os

# En çok kullanılan dosya adlarını dene
for db_file in ["muhasebe.db", "database.db", "app.db"]:
    if os.path.exists(db_file):
        print(f"Tablolar ({db_file}):")
        conn = sqlite3.connect(db_file)
        c = conn.cursor()
        for row in c.execute("SELECT name FROM sqlite_master WHERE type='table';"):
            print("  ", row[0])
        conn.close()
    else:
        print(f"Dosya yok: {db_file}")
