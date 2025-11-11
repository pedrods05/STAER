import sqlite3
from flask import Flask, jsonify

# O nome da base de dados que o 'fase1.py' está a preencher
DB_FILE = "trafego_aereo.db"

# Cria a aplicação web Flask
app = Flask(__name__)

def get_db_connection():
    """Cria uma ligação à base de dados"""
    conn = sqlite3.connect(DB_FILE)
    # Isto faz com que a base de dados devolva dicts em vez de tuplos
    # o que é perfeito para converter para JSON!
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return "Servidor API do Tráfego Aéreo. Tente /api/aeronaves"

@app.route('/api/aeronaves')
def get_aeronaves():
    """
    O endpoint principal da API.
    Vai à base de dados e devolve todos os aviões como JSON.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Vai buscar todos os registos da tabela
        cursor.execute("SELECT * FROM aeronaves")

        # Recolhe todos os resultados
        # A 'row_factory' trata de os converter para uma lista de dicts
        lista_avioes = [dict(row) for row in cursor.fetchall()]

        conn.close()

        # 'jsonify' é uma função do Flask que formata
        # corretamente a nossa lista para JSON.
        return jsonify(lista_avioes)

    except Exception as e:
        # Devolve um erro 500 se algo correr mal
        return jsonify({"erro": str(e)}), 500

# --- Bloco para correr o servidor ---
if __name__ == '__main__':
    # Corre o servidor. 
    # O 'debug=True' é útil para desenvolvimento.
    app.run(debug=True, port=5000)