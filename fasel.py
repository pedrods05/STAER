import requests
import json
import sqlite3
import time

# --- Configuração ---
# URL ATUALIZADO de acordo com a tua informação
URL_DUMP1090 = "https://ads-b.jcboliveira.xyz/dump1090/data/aircraft.json"
DB_FILE = "trafego_aereo.db"
INTERVALO_SEGUNDOS = 30 # Podes ajustar. 10-30 segundos é razoável.

# --- Funções da Base de Dados ---
def inicializar_db():
    conexao = sqlite3.connect(DB_FILE)
    cursor = conexao.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS aeronaves (
        hex TEXT PRIMARY KEY,
        flight TEXT,
        altitude INTEGER,
        speed INTEGER,
        lat REAL,
        lon REAL,
        track INTEGER,
        vert_rate INTEGER,
        squawk TEXT,
        seen REAL,
        timestamp_recolha REAL
    )
    """)
    conexao.commit()
    conexao.close()
    print(f"Base de dados '{DB_FILE}' inicializada.")

def guardar_dados_db(lista_aeronaves, timestamp_recolha):
    if not lista_aeronaves:
        return

    conexao = sqlite3.connect(DB_FILE)
    cursor = conexao.cursor()
    
    registos_para_inserir = []
    
    for aviao in lista_aeronaves:
        # Usamos .get(key) para evitar erros se uma chave não existir
        registo = (
            aviao.get('hex'),
            aviao.get('flight', '').strip(), # Limpa espaços extra
            aviao.get('altitude'),
            aviao.get('speed'),
            aviao.get('lat'),
            aviao.get('lon'),
            aviao.get('track'),
            aviao.get('vert_rate'),
            aviao.get('squawk'),
            aviao.get('seen'),
            timestamp_recolha
        )
        registos_para_inserir.append(registo)
        
    try:
        cursor.executemany("""
        INSERT OR REPLACE INTO aeronaves (
            hex, flight, altitude, speed, lat, lon, track, vert_rate,
            squawk, seen, timestamp_recolha
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, registos_para_inserir)
        
        conexao.commit()
        print(f"Sucesso: {len(registos_para_inserir)} registos guardados/atualizados.")
        
    except sqlite3.Error as e:
        print(f"Erro ao inserir na base de dados: {e}")
    finally:
        conexao.close()

# --- Função de Recolha ---
def buscar_dados_aeronaves():
    print(f"A contactar {URL_DUMP1090}...")
    try:
        # Adiciona um User-Agent para parecer um browser normal
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
        }
        
        # Aumentei o timeout para 10s caso a ligação seja lenta
        resposta = requests.get(URL_DUMP1090, headers=headers, timeout=10)
        
        # Verifica se o pedido foi bem-sucedido (código 200)
        resposta.raise_for_status() 
        
        dados = resposta.json()
        
        lista_aeronaves = dados.get('aircraft', [])
        tempo_agora = dados.get('now', 0)
        
        print(f"Recolhidos {len(lista_aeronaves)} aviões às {tempo_agora}")
        return lista_aeronaves, tempo_agora

    except requests.exceptions.RequestException as e:
        print(f"Erro ao contactar o dump1090: {e}")
        return None, None

# --- Loop Principal ---
def main():
    inicializar_db()
    
    print(f"Iniciando recolha de dados a cada {INTERVALO_SEGUNDOS} segundos...")
    
    while True:
        aeronaves, tempo = buscar_dados_aeronaves()
        
        if aeronaves is not None:
            guardar_dados_db(aeronaves, tempo)
            
        print(f"A aguardar {INTERVALO_SEGUNDOS} segundos...")
        time.sleep(INTERVALO_SEGUNDOS)

if __name__ == "__main__":
    main()