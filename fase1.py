import requests
import json
import sqlite3
import time
import os

URL_DUMP1090 = "https://ads-b.jcboliveira.xyz/dump1090/data/aircraft.json"
DB_FILE = "trafego_aereo.db"
INTERVALO_SEGUNDOS = 20

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

def buscar_dados_aeronaves():
    print(f"A contactar {URL_DUMP1090}...")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0'
        }
        resposta = requests.get(URL_DUMP1090, headers=headers, timeout=5)
        resposta.raise_for_status() 
        
        dados = resposta.json()
        lista_aeronaves = dados.get('aircraft', [])
        tempo_agora = dados.get('now', time.time())
        
        print(f"✅ Online: Recolhidos {len(lista_aeronaves)} aviões.")
        
        try:
            with open("aircraft.json", "w") as f:
                json.dump(dados, f)
        except:
            pass 
            
        return lista_aeronaves, tempo_agora

    except requests.exceptions.RequestException as e:
        print(f"⚠️ ERRO ONLINE: {e}")
        print("📂 A ativar MODO DE EMERGÊNCIA (Ler aircraft.json local)...")
        
        if os.path.exists("aircraft.json"):
            try:
                with open("aircraft.json", "r") as f:
                    dados = json.load(f)
                
                lista_aeronaves = dados.get('aircraft', [])
                tempo_simulado = time.time() 
                
                print(f"✅ Backup Local: Carregados {len(lista_aeronaves)} aviões.")
                return lista_aeronaves, tempo_simulado
                
            except Exception as e_local:
                print(f"❌ Erro fatal: O backup local também falhou: {e_local}")
        else:
            print("❌ Erro: Ficheiro 'aircraft.json' não existe na pasta.")
        
        return None, None
def limpar_dados_antigos(tempo_atual):
    """
    Remove aviões que não foram atualizados há mais de 2 minutos (120s).
    Isto evita 'aviões fantasma' no mapa.
    """
    conexao = sqlite3.connect(DB_FILE)
    cursor = conexao.cursor()
    
    limite = tempo_atual - 120 
    cursor.execute("DELETE FROM aeronaves WHERE timestamp_recolha < ?", (limite,))
    
    apagados = cursor.rowcount
    if apagados > 0:
        print(f"Limpeza: {apagados} aviões antigos removidos da base de dados.")
    
    conexao.commit()
    conexao.close()
def main():
    inicializar_db()
    
    print(f"Iniciando recolha de dados a cada {INTERVALO_SEGUNDOS} segundos...")
    
    while True:
        aeronaves, tempo = buscar_dados_aeronaves()
        
        if aeronaves is not None:
            guardar_dados_db(aeronaves, tempo)
            limpar_dados_antigos(tempo)
        print(f"A aguardar {INTERVALO_SEGUNDOS} segundos...")
        time.sleep(INTERVALO_SEGUNDOS)

if __name__ == "__main__":
    main()
