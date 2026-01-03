import requests
import json
import sqlite3
import time
import os

URL_DUMP1090 = "https://ads-b.jcboliveira.xyz/dump1090/data/aircraft.json"
DB_FILE = "trafego_aereo.db"
INTERVALO_SEGUNDOS = 5

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
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS historico (
        hex TEXT,
        lat REAL,
        lon REAL,
        timestamp_recolha REAL
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_historico_hex ON historico(hex)")
    
    conexao.commit()
    conexao.close()
    print(f"Base de dados '{DB_FILE}' inicializada com histórico.")

def guardar_dados_db(lista_aeronaves, timestamp_recolha):
    if not lista_aeronaves:
        return

    conexao = sqlite3.connect(DB_FILE)
    cursor = conexao.cursor()
    
    registos_aeronaves = []
    registos_historico = []
    
    for aviao in lista_aeronaves:
        registo = (
            aviao.get('hex'),
            aviao.get('flight', '').strip(), 
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
        registos_aeronaves.append(registo)
        
        if aviao.get('lat') and aviao.get('lon'):
            hist = (
                aviao.get('hex'),
                aviao.get('lat'),
                aviao.get('lon'),
                timestamp_recolha
            )
            registos_historico.append(hist)
        
    try:
        cursor.executemany("""
        INSERT OR REPLACE INTO aeronaves (
            hex, flight, altitude, speed, lat, lon, track, vert_rate,
            squawk, seen, timestamp_recolha
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, registos_aeronaves)
        
        if registos_historico:
            cursor.executemany("""
            INSERT INTO historico (hex, lat, lon, timestamp_recolha) 
            VALUES (?, ?, ?, ?)
            """, registos_historico)
        
        conexao.commit()
        print(f"Sucesso: {len(registos_aeronaves)} aviões atualizados e rasto guardado.")
        
    except sqlite3.Error as e:
        print(f"Erro ao inserir na DB: {e}")
    finally:
        conexao.close()

def buscar_dados_aeronaves():
    print(f"A contactar {URL_DUMP1090}...")
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        resposta = requests.get(URL_DUMP1090, headers=headers, timeout=5)
        resposta.raise_for_status() 
        
        dados = resposta.json()
        lista_aeronaves = dados.get('aircraft', [])
        tempo_agora = dados.get('now', time.time())
        
        # Guardar backup local
        try:
            with open("aircraft.json", "w") as f:
                json.dump(dados, f)
        except: pass 
            
        print(f"✅ Online: Recolhidos {len(lista_aeronaves)} aviões.")
        return lista_aeronaves, tempo_agora

    except requests.exceptions.RequestException as e:
        print(f"⚠️ ERRO ONLINE: {e}")
        print("📂 A usar Backup Local...")
        
        if os.path.exists("aircraft.json"):
            try:
                with open("aircraft.json", "r") as f:
                    dados = json.load(f)
                return dados.get('aircraft', []), time.time()
            except: pass
        return None, None

def limpar_dados_antigos(tempo_atual):
    conexao = sqlite3.connect(DB_FILE)
    cursor = conexao.cursor()
    
    limite_vivo = tempo_atual - 120 
    cursor.execute("DELETE FROM aeronaves WHERE timestamp_recolha < ?", (limite_vivo,))
    
    limite_historico = tempo_atual - 3600
    cursor.execute("DELETE FROM historico WHERE timestamp_recolha < ?", (limite_historico,))
    
    conexao.commit()
    conexao.close()

def main():
    inicializar_db()
    print(f"Iniciando recolha (Rasto Persistente Ativo)...")
    
    while True:
        aeronaves, tempo = buscar_dados_aeronaves()
        if aeronaves is not None:
            guardar_dados_db(aeronaves, tempo)
            limpar_dados_antigos(tempo)
        time.sleep(INTERVALO_SEGUNDOS)

if __name__ == "__main__":
    main()