var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' });
var satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' });
var escuro = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© CartoDB' });

var map = L.map('map', {
    center: [41.15, -8.62],
    zoom: 9,
    layers: [osm],
    zoomControl: false 
});

L.control.zoom({ position: 'topleft' }).addTo(map);
var baseMaps = { "Mapa Claro": osm, "Satélite": satelite, "Radar Noturno": escuro };
L.control.layers(baseMaps, null, { position: 'topleft' }).addTo(map);

map.on('baselayerchange', function(e) {
    let infoBox = document.querySelector('.info-box');
    let corRasto = '#3498db'; 
    if (e.name === "Radar Noturno") {
        infoBox.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        infoBox.style.color = "white";
        corRasto = '#f1c40f'; 
    } else {
        infoBox.style.backgroundColor = "rgba(255, 255, 255, 0.95)";
        infoBox.style.color = "black";
    }
    for (let hex in rastos) { rastos[hex].setStyle({ color: corRasto }); }
});

var markers = {}; 
var rastos = {}; 
var dbPaises = []; 

fetch('/static/paises.json').then(r => r.json()).then(d => dbPaises = d).catch(console.error);

function obterBandeira(hex) {
    if (!hex || dbPaises.length === 0) return '';
    let h = hex.toUpperCase();
    let pais = dbPaises.find(p => h.startsWith(p.prefix));
    return pais ? `<img src="https://flagcdn.com/20x15/${pais.id}.png" class="flag-icon" title="${pais.nome}">` : '';
}

function criarIconeAviao(rumo, cor = "#d63031") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" 
             style="transform: rotate(${rumo}deg); filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.5));">
            <path fill="${cor}" stroke="white" stroke-width="1" d="M21,16v-2l-8-5V3.5c0-0.83-0.67-1.5-1.5-1.5S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"/></svg>`;
    return L.divIcon({ html: svg, className: 'aviao-icon', iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -15] });
}
function atualizarValor(valor) {
    document.getElementById("valorAlt").innerText = valor;
}

document.addEventListener('DOMContentLoaded', function() {
    let slider = document.getElementById("filtroAlt");
    if (slider) {
        atualizarValor(slider.value);
    }
});

async function carregarRastoHistorico(hex) {
    try {
        const response = await fetch(`/api/rasto/${hex}`);
        if (!response.ok) return;
        const pontos = await response.json(); 
        
        if (pontos.length > 1) {
            let isDark = document.querySelector('.info-box').style.color === "white";
            let cor = isDark ? '#f1c40f' : '#3498db';
            
            if (rastos[hex]) map.removeLayer(rastos[hex]);

            rastos[hex] = L.polyline(pontos, { color: cor, weight: 2, opacity: 0.7 }).addTo(map);
        }
    } catch (e) { console.error("Erro rasto:", e); }
}

async function atualizarMapa() {
    try {
        let altMin = document.getElementById('filtroAlt').value;
        let textoPesquisa = document.getElementById('searchBox').value.toUpperCase();

        const response = await fetch(`/api/aeronaves?min_alt=${altMin}`);
        if (!response.ok) throw new Error("Erro API");
        const avioes = await response.json();

        let hexesNestaAtualizacao = new Set();
        let noMapa = 0;
        let isDark = document.querySelector('.info-box').style.color === "white";
        let corRastoAtual = isDark ? '#f1c40f' : '#3498db';

        avioes.forEach(aviao => {
            let voo = (aviao.flight || '').toUpperCase();
            let hex = (aviao.hex || '').toUpperCase();
            let passaPesquisa = (textoPesquisa === "") || voo.includes(textoPesquisa) || hex.includes(textoPesquisa);

            if (aviao.lat && aviao.lon && passaPesquisa) {
                noMapa++;
                hexesNestaAtualizacao.add(aviao.hex);
                let bandeiraHTML = obterBandeira(aviao.hex);
                
                let info = `
                    <div style="font-family: Arial, sans-serif; min-width: 120px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <b style="font-size:1.1em">${aviao.flight || 'N/A'}</b> ${bandeiraHTML}
                        </div>
                        <span style="font-size:0.8em; color:#888">${aviao.hex}</span>
                        <hr style="margin:5px 0; border: 0; border-top: 1px solid #ddd;">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 0.9em;">
                            <span>✈️ Alt:</span> <b>${aviao.altitude} ft</b>
                            <span>🚀 Vel:</span> <b>${aviao.speed} kt</b>
                            <span>📡 Sqk:</span> <b>${aviao.squawk || 'N/A'}</b>
                        </div>
                    </div>`;

                let novoIcone = criarIconeAviao(aviao.track || 0);

                if (markers[aviao.hex]) {
                    markers[aviao.hex].setLatLng([aviao.lat, aviao.lon]);
                    markers[aviao.hex].setIcon(novoIcone);
                    if (!markers[aviao.hex].isPopupOpen()) markers[aviao.hex].setPopupContent(info);
                    
                    if (rastos[aviao.hex]) {
                        rastos[aviao.hex].addLatLng([aviao.lat, aviao.lon]);
                    }
                } else {
                    markers[aviao.hex] = L.marker([aviao.lat, aviao.lon], {icon: novoIcone})
                             .bindPopup(info).addTo(map);
                    
                    carregarRastoHistorico(aviao.hex);
                }
            }
        });

        for (let hex in markers) {
            if (!hexesNestaAtualizacao.has(hex)) {
                map.removeLayer(markers[hex]);
                delete markers[hex];
                if (rastos[hex]) { map.removeLayer(rastos[hex]); delete rastos[hex]; }
            }
        }
        document.getElementById('status').innerHTML = `Detetados: <b>${avioes.length}</b> | Visíveis: <b>${noMapa}</b>`;

    } catch (e) { console.error("Erro JS:", e); }
}

setInterval(atualizarMapa, 2000);
atualizarMapa();
