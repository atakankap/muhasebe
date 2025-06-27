# Web-based Pre-Accounting App

A simple, multi-user, multi-company pre-accounting application built with Flask and SQLite. Supports invoice management, company management, and basic reports.

## Features
- User registration/login
- Multi-company support
- Incoming/Outgoing invoice management
- Monthly & yearly reports
- SQLite database (single file)

## Setup
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the app:
   ```bash
   python app.py
   ```
3. Access via browser at [http://localhost:5000](http://localhost:5000)

## Structure
- `app.py`: Main Flask app
- `models.py`: Database models
- `routes/`: API endpoints
- `db.sqlite3`: SQLite database file
