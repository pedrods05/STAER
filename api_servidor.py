import sqlite3
from flask import Flask, jsonify, render_template, request

DB_FILE = "trafego_aereo.db"

app = Flask(__name__, template_folder='templates')
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
   
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
   return render_template('index.html')

@app.route('/api/aeronaves')
def get_aeronaves():
   
    try:
        min_alt = request.args.get('min_alt', default=0, type=int)
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "SELECT * FROM aeronaves WHERE altitude >= ? AND altitude IS NOT NULL"
        cursor.execute(query, (min_alt,))
        lista_avioes = [dict(row) for row in cursor.fetchall()]

        conn.close()

   
        return jsonify(lista_avioes)

    except Exception as e:
        return jsonify({"erro": str(e)}), 500

if __name__ == '__main__':
  app.run(host='0.0.0.0', debug=True, port=5000)