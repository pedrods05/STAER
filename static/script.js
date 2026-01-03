// static/js/script.js


var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
});

var satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri'
});

var escuro = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© CartoDB'
});

var map = L.map('map', {
    center: [41.15, -8.62],
    zoom: 9,
    layers: [osm] 
});

var baseMaps = {
    "Mapa de Rua": osm,
    "Satélite": satelite,
    "Radar Noturno": escuro
};
L.control.layers(baseMaps).addTo(map);

var markers = {}; 


function criarIconeAviao(rumo, cor = "#d63031") {
    const svgAviao = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" 
             style="transform: rotate(${rumo}deg); filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.5));">
            <path fill="${cor}" stroke="white" stroke-width="1" 
                  d="M21,16v-2l-8-5V3.5c0-0.83-0.67-1.5-1.5-1.5S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"/>
        </svg>`;

    return L.divIcon({
        html: svgAviao, className: 'aviao-icon', iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -15]
    });
}

function obterBandeira(hex) {
    if (!hex) return '';
    let h = hex.toUpperCase();
    let pais = null;
    
    if (h.startsWith('49')) pais = 'pt';
    else if (h.startsWith('34')) pais = 'es';
    else if (h.startsWith('38') || h.startsWith('39') || h.startsWith('3A')) pais = 'fr';
    else if (h.startsWith('30')) pais = 'it';
    else if (h.startsWith('40') || h.startsWith('41') || h.startsWith('42')) pais = 'gb';
    else if (h.startsWith('3C') || h.startsWith('3D')) pais = 'de';
    else if (h.startsWith('4B')) pais = 'ch';
    else if (h.startsWith('45')) pais = 'dk';
    else if (h.startsWith('46')) pais = 'se'; 
    else if (h.startsWith('4A')) pais = 'se'; 
    else if (h.startsWith('A')) pais = 'us';

    if (pais) return `<img src="https://flagcdn.com/20x15/${pais}.png" class="flag-icon" title="${pais}">`;
    return '';
}

function atualizarValor(val) {
    document.getElementById('valorAlt').innerText = val;
    atualizarMapa();
}


async function atualizarMapa() {
    try {
        let altMin = document.getElementById('filtroAlt').value;
        let textoPesquisa = document.getElementById('searchBox').value.toUpperCase();

        const response = await fetch(`/api/aeronaves?min_alt=${altMin}`);
        if (!response.ok) throw new Error("Erro na API");
        const avioes = await response.json();

        let hexesNestaAtualizacao = new Set();
        let noMapa = 0;

        avioes.forEach(aviao => {
            let voo = (aviao.flight || '').toUpperCase();
            let hex = (aviao.hex || '').toUpperCase();
            let passaPesquisa = (textoPesquisa === "") || voo.includes(textoPesquisa) || hex.includes(textoPesquisa);

            if (aviao.lat && aviao.lon && passaPesquisa) {
                noMapa++;
                hexesNestaAtualizacao.add(aviao.hex);

                let bandeiraHTML = obterBandeira(aviao.hex);
                let info = `
                    <div style="font-family: Arial, sans-serif;">
                        <b>${aviao.flight || 'N/A'}</b> ${bandeiraHTML}<br>
                        <span style="font-size:0.8em; color:#666">${aviao.hex}</span><hr style="margin:5px 0">
                        Alt: ${aviao.altitude} ft<br>Vel: ${aviao.speed} kt
                    </div>`;

                let novoIcone = criarIconeAviao(aviao.track || 0);

                if (markers[aviao.hex]) {
                    markers[aviao.hex].setLatLng([aviao.lat, aviao.lon]);
                    markers[aviao.hex].setIcon(novoIcone);
                    markers[aviao.hex].setPopupContent(info);
                } else {
                    markers[aviao.hex] = L.marker([aviao.lat, aviao.lon], {icon: novoIcone})
                             .bindPopup(info).addTo(map);
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
            `Detetados: <b>${avioes.length}</b> | Visíveis: <b>${noMapa}</b>`;

    } catch (e) {
        console.error("Erro no JS:", e);
    }
}

setInterval(atualizarMapa, 1000);
atualizarMapa();