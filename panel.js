const logContainer = document.getElementById('log-container');
const keywordsInput = document.getElementById('keywords');
const apiKeyInput = document.getElementById('apiKey');
const clearBtn = document.getElementById('clearBtn');

// 1. Função para limpar a tela
clearBtn.onclick = () => {
    logContainer.innerHTML = '';
};

// 2. ÚNICO LISTENER: Gerencia a chegada de dados e aplica o filtro
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "NETWORK_CAPTURE") {
        const keywordsRaw = keywordsInput.value.trim();
        
        // Se o campo de Keywords estiver vazio, mostra tudo
        if (keywordsRaw === "") {
            renderLog(msg, []); 
        } else {
            const keywords = keywordsRaw.split(',').map(k => k.trim().toLowerCase());
            const contentLower = (msg.body || "").toLowerCase();
            const urlLower = msg.url.toLowerCase();

            // Verifica se alguma palavra-chave existe na URL ou no Corpo
            const matches = keywords.filter(k => contentLower.includes(k) || urlLower.includes(k));

            // SÓ renderiza se encontrar os termos (Filtro Ativo)
            if (matches.length > 0) {
                renderLog(msg, matches);
            }
        }
    }
});

// 3. FUNÇÃO RENDERLOG ÚNICA: Adiciona badge visual para os termos encontrados
function renderLog(data, matches = []) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    
    const patternAlert = findHiddenPatterns(data.url);
    const alertStyle = patternAlert ? "border: 1px solid #ffaa00; background: #332200;" : "";
    div.setAttribute("style", alertStyle);

    // Badge para mostrar qual termo ativou o filtro
    const matchBadge = matches.length > 0 
        ? `<div style="color: #00ff41; font-size: 10px; margin-top: 5px; font-weight: bold;">🎯 TERMOS: ${matches.join(', ')}</div>` 
        : '';

    div.innerHTML = `
        <div>
            <span class="method">[${data.method}]</span>
            <span class="url">${data.url}</span>
            <button class="copy-btn" onclick="navigator.clipboard.writeText(\`${data.url}\`)">Copy URL</button>
        </div>
        ${matchBadge}
        ${patternAlert ? `<div style="color:#ffaa00; font-size:10px;">⚠️ ${patternAlert}</div>` : ''}
        <button class="ai-btn">Analisar com G-MiddleVoid</button>
        <div class="ai-result-card" style="display:none;"></div>
    `;

    div.querySelector('.ai-btn').onclick = () => analyzeWithAI(data, div.querySelector('.ai-result-card'));
    logContainer.prepend(div);
}

// 4. FUNÇÕES DE APOIO (Decodificação e Padrões Ocultos)
function tryDecode(str) {
    try {
        if (/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(str) && str.length > 4) {
            return atob(str);
        }
    } catch (e) {}
    return str;
}

function findHiddenPatterns(url) {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 1 || /^(adm|cfg|bkp|v1|v2)$/i.test(lastPart)) {
        return `SUSPEITA: Caminho curto detectado (${lastPart}). Pode ser um endpoint oculto.`;
    }
    return null;
}

// 5. ANÁLISE COM IA (Gemini)
async function analyzeWithAI(data, display) {
    display.style.display = 'block';
    display.innerHTML = "Void Scanning: Analisando tráfego...";

    const decodedBody = tryDecode(data.body);
    const key = apiKeyInput.value.trim();
    
    // Mantendo a versão 2.5-flash conforme solicitado
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

    const prompt = `Aja como um Pentester Especialista. Analise este tráfego buscando:
    1. Vulnerabilidades em Cookies (Missing HttpOnly/Secure).
    2. Passwords ou Tokens expostos.
    3. Endpoints ocultos.
    4. OWASP Top 10.
    5. Não invente dados. Se não souber, diga que não encontrou nada.
    6. A explicação da exploração deve ser clara para um iniciante entender.
    DADOS: URL: ${data.url} | Headers: ${JSON.stringify(data.requestHeaders)} | Body: ${decodedBody}
    Responda APENAS em JSON: {"score": 0-10, "vulnerabilidade": "Nome", "critico": "Achado", "poc": "Payload", "exploracao": "Passos", "risco": "Descrição"}`; 

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                // Esta configuração força a IA a entregar um JSON puro e válido
                generationConfig: {
                    response_mime_type: "application/json"
                }
            })
        });

        const resData = await response.json();
        
        if (!resData.candidates || resData.candidates.length === 0) {
            throw new Error("A IA não retornou candidatos. Verifique sua cota ou chave.");
        }

        const content = resData.candidates[0].content.parts[0].text;

        // O parse agora será bem-sucedido pois o MIME type garante a estrutura
        const report = JSON.parse(content);

        const scoreColor = report.score > 7 ? "#ff4c4c" : (report.score > 4 ? "#ffaa00" : "#00ff41");

        display.innerHTML = `
            <div style="border-left: 4px solid ${scoreColor}; padding: 10px; background: #252526;">
                <b style="color:${scoreColor}">SCORE: ${report.score} - ${report.vulnerabilidade}</b>
                <p><b>Crítico:</b> ${report.critico}</p>
                <p><b>Risco:</b> ${report.risco}</p>
                <code style="display:block; background:#000; padding:5px; color:#00ff41; margin-top:5px; white-space: pre-wrap;">PoC: ${report.poc}</code>
                <p style="font-size:0.8em; margin-top:10px;"><b>Exploração:</b> ${report.exploracao}</p>
            </div>
        `;
    } catch (e) {
        display.innerHTML = `
            <div style="color: #ff4c4c; padding: 10px; background: #301010; border-radius: 4px;">
                <b>Erro de Processamento:</b> ${e.message} <br>
                <button id="retryBtn" style="background:#444; color:#fff; border:none; padding:5px; cursor:pointer; margin-top:10px;">Tentar Novamente</button>
            </div>
        `;
        display.querySelector('#retryBtn').onclick = () => analyzeWithAI(data, display);
    }
}