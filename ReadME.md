# ✈️ STAER – Sistema de Monitorização de Tráfego Aéreo

**Autor:** Pedro Sousa  
**Unidade Curricular:** Sistemas de Telecomunicações e Arquitetura de Redes (STAER)  
**Ano Letivo:** 2025/2026  

---

## 📖 Sobre o Projeto

O **STAER** é uma aplicação Web baseada numa arquitetura **cliente-servidor** desenvolvida para a monitorização de tráfego aéreo em tempo quase real.  
O sistema consome dados brutos provenientes de radares secundários (**ADS-B**) através do descodificador `dump1090`, processa essa informação e apresenta-a num mapa interativo acessível via navegador Web.

Ao contrário de visualizadores simples, este projeto implementa **persistência de dados**, permitindo visualizar não apenas a posição atual das aeronaves, mas também o seu histórico de trajeto (*flight trails*), velocidade, altitude e identificação nacional.

---

## 🚀 Funcionalidades Principais

- **📡 Monitorização em Tempo Real:**  
  Atualização da posição das aeronaves a cada 2 segundos através de pedidos AJAX, sem necessidade de *refresh* da página.

- **💾 Persistência de Trajetos:**  
  Armazenamento do histórico de posições numa base de dados **SQLite**, permitindo desenhar o rasto completo dos voos.

- **🗺️ Interface Geoespacial Interativa:**  
  Visualização baseada em **Leaflet.js**, com suporte à rotação de ícones de aeronaves de acordo com o rumo (*track*).

- **🌙 Modo Escuro Automático:**  
  Adaptação visual da interface e das cores dos rastos para melhor legibilidade em ambientes noturnos.

- **🔎 Filtragem Dinâmica:**  
  Filtro interativo por altitude mínima, aplicado em tempo real no mapa.

- **🏳️ Enriquecimento de Dados:**  
  Associação automática da bandeira do país de origem com base no código ICAO hexadecimal da aeronave.

- **🛡️ Robustez e Tolerância a Falhas:**  
  Mecanismo de *fallback* que utiliza os últimos dados válidos armazenados localmente em caso de falha temporária da fonte de dados.

---

## 🛠️ Arquitetura do Sistema

O sistema encontra-se organizado de forma modular, separando claramente as responsabilidades de recolha, processamento, disponibilização e visualização dos dados.

### 1. Backend de Recolha (`fase1.py`)
- Script Python executado em *background* (daemon).
- Consome periodicamente o ficheiro JSON produzido pelo `dump1090`.
- Valida e normaliza os dados recebidos (ex.: altitude, velocidade).
- Persiste a informação na base de dados **SQLite** (`trafego_aereo.db`).
- Guarda o último JSON bruto para efeitos de *fallback*.

### 2. Servidor de API (`api_servidor.py`)
- Servidor Web desenvolvido em **Flask**.
- Disponibiliza *endpoints* REST:
  - `/api/aeronaves`
  - `/api/rasto/<hex>`
- Lê dados diretamente da base de dados e fornece-os ao cliente em formato JSON.

### 3. Frontend (HTML / CSS / JavaScript)
- Cliente Web leve e responsivo.
- Comunicação assíncrona com o servidor através da `fetch API`.
- Renderização gráfica dos dados geoespaciais com **Leaflet.js** e mapas OpenStreetMap.

---

## 🔁 Fluxo de Dados

1. O `dump1090` gera dados ADS-B em formato JSON.
2. O script `fase1.py` lê, valida e armazena os dados na base de dados.
3. O servidor Flask disponibiliza os dados através de uma API REST.
4. O cliente Web solicita os dados periodicamente via HTTP.
5. O mapa interativo é atualizado dinamicamente no navegador.

---

## 🌐 Arquitetura de Deployment

- **Cliente:** Navegador Web (PC do utilizador).
- **Servidor:** VM Ubuntu (Proxmox) a executar:
  - Backend de recolha
  - Servidor Flask
  - Base de dados SQLite
- **Comunicação:**
  - HTTP entre cliente e servidor
  - JSON como formato de troca de dados
- **Fonte Externa:** `dump1090` (ADS-B)

---

## 💻 Tecnologias Utilizadas

| Componente | Tecnologia |
|-----------|-----------|
| Linguagem Backend | Python 3 |
| Framework Web | Flask |
| Base de Dados | SQLite 3 |
| Frontend | HTML5, CSS3, JavaScript (ES6) |
| Mapas | Leaflet.js + OpenStreetMap / CartoDB Dark |
| Fonte de Dados | dump1090 (ADS-B JSON) |
| Infraestrutura | Ubuntu Server (VM Proxmox) |

---
## ⚙️ Instalação e Execução

### Pré-requisitos
- Python 3.x
- `dump1090` configurado e em execução
- Bibliotecas Python: `flask`, `requests`

### 1. Instalar dependências
pip install flask requests

### 2. Iniciar a Recolha de Dados
Num terminal, execute o script de backend para iniciar a captura e persistência de dados:
python fase1.py

### 3. Iniciar o Servidor Web
Num segundo terminal, inicie a API Flask:
python api_servidor.py

### 4. Aceder à Aplicação
Abra o navegador e aceda ao endereço local ou ao IP da máquina virtual:
http://192.168.100.3:5000/
