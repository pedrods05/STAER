// 1. Inicializar o Mapa
var map = L.map('map').setView([41.15, -8.62], 9);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

var markers = {}; 

// 2. Ícone do Avião (SVG)
function criarIconeAviao(rumo, cor = "#d63031") {
    const svgAviao = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" 
             style="transform: rotate(${rumo}deg); filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.5));">
            <path fill="${cor}" stroke="white" stroke-width="1" 
                  d="M21,16v-2l-8-5V3.5c0-0.83-0.67-1.5-1.5-1.5S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"/>
        </svg>`;

    return L.divIcon({
        html: svgAviao,
        className: 'aviao-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
}

// 3. Função Bandeiras
function obterBandeira(hex) {
    if (!hex) return '';
    let h = hex.toUpperCase();
    let pais = null;

    if (h.startsWith('49')) pais = 'pt';
    else if (h.startsWith('34')) pais = 'es';
    else if (h.startsWith('38') || h.startsWith('39') || h.startsWith('3A')) pais = 'fr';
    else if (h.startsWith('30')) pais = 'it';
    else if (h.startsWith('40') || h.startsWith('41') || h.startsWith('42')) pais = 'gb';
    else if (h.startsWith('4C')) pais = 'ie'; 
    else if (h.startsWith('3C') || h.startsWith('3D')) pais = 'de';
    else if (h.startsWith('4B')) pais = 'ch';
    else if (h.startsWith('48')) {
         let char = h[2];
         if (char >= '8') pais = 'pl'; else pais = 'nl'; 
    }
    else if (h.startsWith('44')) {
        let char = h[2];
        if (char >= '0' && char <= '7') pais = 'at';
        else pais = 'be';
    }
    else if (h.startsWith('4D')) {
        if (h.startsWith('4D2')) pais = 'mt';
        else pais = 'lu';
    }
    else if (h.startsWith('45')) pais = 'dk';
    else if (h.startsWith('46')) pais = 'se';
    else if (h.startsWith('47')) pais = 'no';
    else if (h.startsWith('0D') || h.startsWith('00')) pais = 'za';
    else if (h.startsWith('E4') || h.startsWith('E0')) pais = 'br';
    else if (h.startsWith('A')) pais = 'us';
    else if (h.startsWith('896')) pais = 'ae';
    else if (h.startsWith('71')) pais = 'kr';
    else if (h.startsWith('78')) pais = 'cn';
    else if (h.startsWith('C8')) pais = 'nz';
    else if (h.startsWith('7C')) pais = 'au';

    if (pais) return `<img src="https://flagcdn.com/20x15/${pais}.png" class="flag-icon" title="${pais}">`;
    return '';
}

function atualizarValor(val) {
    document.getElementById('valorAlt').innerText = val;
    atualizarMapa();
}

// 4. Função Principal
async function atualizarMapa() {
    try {
        let altMin = document.getElementById('filtroAlt').value;

        const response = await fetch(`/api/aeronaves?min_alt=${altMin}`);
        if (!response.ok) throw new Error("Erro na API");
        const avioes = await response.json();

        let hexesNestaAtualizacao = new Set();
        let noMapa = 0;

        avioes.forEach(aviao => {
            if (aviao.lat && aviao.lon) {
                noMapa++;
                hexesNestaAtualizacao.add(aviao.hex);

                let bandeiraHTML = obterBandeira(aviao.hex);
                let rumo = aviao.track || 0;

                let info = `
                    <div style="font-family: Arial, sans-serif; min-width: 220px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div style="display: flex; align-items: center;">
                                <h2 style="margin:0; color:#0056b3; font-size: 1.3em;">
                                    ${aviao.flight || 'N/A'}
                                </h2>
                                ${bandeiraHTML}
                            </div>
                            <span style="background:#eee; padding: 2px 5px; border-radius: 4px; font-size: 0.8em; font-family: monospace;">
                                ${aviao.hex}
                            </span>
                        </div>
                        
                        <table style="width: 100%; font-size: 0.9em; color: #333; border-top: 1px solid #eee; padding-top:5px;">
                            <tr><td><b>Alt:</b></td><td style="text-align: right;">${aviao.altitude} ft</td></tr>
                            <tr><td><b>Vel:</b></td><td style="text-align: right;">${aviao.speed} kt</td></tr>
                            <tr><td><b>Rumo:</b></td><td style="text-align: right;">${aviao.track}°</td></tr>
                            <tr><td><b>Squawk:</b></td><td style="text-align: right;">${aviao.squawk || 'N/A'}</td></tr>
                            <tr><td><b>Lat/Lon:</b></td><td style="text-align: right;">${aviao.lat.toFixed(3)}, ${aviao.lon.toFixed(3)}</td></tr>
                        </table>
                    </div>
                `;

                let novoIcone = criarIconeAviao(rumo);

                if (markers[aviao.hex]) {
                    markers[aviao.hex].setLatLng([aviao.lat, aviao.lon]);
                    markers[aviao.hex].setIcon(novoIcone);
                    markers[aviao.hex].setPopupContent(info);
                } else {
                    let m = L.marker([aviao.lat, aviao.lon], {icon: novoIcone})
                             .bindPopup(info)
                             .addTo(map);
                    markers[aviao.hex] = m;
                }
            }
        });

        for (let hexExistente in markers) {
            if (!hexesNestaAtualizacao.has(hexExistente)) {
                map.removeLayer(markers[hexExistente]);
                delete markers[hexExistente];
            }
        }

        document.getElementById('status').innerHTML = 
            `Detetados: <b>${avioes.length}</b> | No Mapa: <b>${noMapa}</b>`;

    } catch (e) {
        console.error("Erro no JS:", e);
    }
}

setInterval(atualizarMapa, 1000);
atualizarMapa();