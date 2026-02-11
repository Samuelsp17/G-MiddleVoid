const logContainer = document.getElementById('log-container');
const keywordsInput = document.getElementById('keywords');
const apiKeyInput = document.getElementById('apiKey');

console.log("G-MiddleVoid: Painel carregado e aguardando dados...");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("Mensagem recebida no Panel:", msg); // DEBUG
    if (msg.type === "NETWORK_CAPTURE") {
        renderLog(msg);
    }
});

// Escuta as mensagens enviadas pelo devtools.js
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "NETWORK_CAPTURE") {
        const keywordsRaw = keywordsInput.value.trim();
        
        // Se não houver keywords, mostra tudo. Se houver, filtra.
        if (keywordsRaw === "") {
            renderLog(msg);
        } else {
            const keywords = keywordsRaw.split(',').map(k => k.trim().toLowerCase());
            const contentLower = (msg.body || "").toLowerCase();
            const urlLower = msg.url.toLowerCase();
            const found = keywords.filter(k => contentLower.includes(k) || urlLower.includes(k));

            if (found.length > 0) {
                renderLog(msg);
            }
        }
    }
});

// Função para tentar decodificar Base64 de forma segura
function tryDecode(str) {
    try {
        // Verifica se parece Base64 antes de tentar
        if (/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(str) && str.length > 4) {
            return atob(str);
        }
    } catch (e) {}
    return str;
}

// Analisador de "Hidden Patterns" (Arquivos ocultos ou nomes curtos suspeitos)
function findHiddenPatterns(url) {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    
    // Detecta arquivos com nomes de uma única letra (ex: /a, /z) ou nomes comuns de admin ocultos
    if (lastPart.length === 1 || /^(adm|cfg|bkp|v1|v2)$/i.test(lastPart)) {
        return `SUSPEITA: Caminho curto detectado (${lastPart}). Pode ser um endpoint oculto.`;
    }
    return null;
}

function renderLog(data) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    
    // Verifica se há algo suspeito na URL imediatamente
    const patternAlert = findHiddenPatterns(data.url);
    const alertStyle = patternAlert ? "border: 1px solid #ffaa00; background: #332200;" : "";

    div.setAttribute("style", alertStyle);

    div.innerHTML = `
        <div>
            <span class="method">[${data.method}]</span>
            <span class="url">${data.url}</span>
            <button class="copy-btn" onclick="navigator.clipboard.writeText(\`${data.url}\`)">Copy URL</button>
        </div>
        ${patternAlert ? `<div style="color:#ffaa00; font-size:10px;">⚠️ ${patternAlert}</div>` : ''}
        <button class="ai-btn">Analisar com G-MiddleVoid</button>
        <div class="ai-result-card" style="display:none;"></div>
    `;

    div.querySelector('.ai-btn').onclick = () => analyzeWithAI(data, div.querySelector('.ai-result-card'));
    logContainer.prepend(div);
}

async function analyzeWithAI(data, display) {
    display.style.display = 'block';
    display.innerHTML = "Void Scanning: Analisando Headers, Cookies e Payloads...";

    const decodedBody = tryDecode(data.body);
    const hiddenAlert = findHiddenPatterns(data.url);
    const key = apiKeyInput.value; // Puxando a chave do input global

    // CORRIGIDO: O prompt agora fecha corretamente e o JSON está limpo
    const prompt = `Aja como um Pentester Especialista. Analise este tráfego buscando:
    1. Vulnerabilidades em Cookies (Missing HttpOnly/Secure, Session Fixation).
    2. Passwords ou Tokens expostos no Body ou Headers.
    3. Endpoints ocultos ou suspeitos.
    4. OWASP Top 10.

    DADOS TÉCNICOS:
    URL: ${data.url}
    MÉTODO: ${data.method}
    HEADERS: ${JSON.stringify(data.requestHeaders)}
    BODY: ${decodedBody}
    ${hiddenAlert ? `ALERTA ESTRUTURAL: ${hiddenAlert}` : ''}

    Responda APENAS em JSON:
    {
      "score": 0-10,
      "vulnerabilidade": "Nome",
      "critico": "O que foi achado de sensível (cookies/senhas)",
      "poc": "Payload de teste",
      "exploracao": "Passo a passo, explicação para iniciantes",
      "risco": "Descrição curta do risco"
    }`; 

    try {
        // CORRIGIDO: URL do modelo ajustada para 2.0 Flash (ou use 1.5-flash se preferir)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const resData = await response.json();
        
        if (resData.error) throw new Error(resData.error.message);

        const content = resData.candidates[0].content.parts[0].text;
        
        // Limpeza de Markdown se a IA teimar em colocar
        const cleanJson = content.replace(/```json|```/g, "").trim();
        const report = JSON.parse(cleanJson);

        // CORRIGIDO: Usando a variável 'display' (que veio no argumento) e 'report.risco'
        const scoreColor = report.score > 7 ? "#ff4c4c" : (report.score > 4 ? "#ffaa00" : "#00ff41");

        display.innerHTML = `
            <div style="border-left: 4px solid ${scoreColor}; padding: 10px; background: #252526;">
                <b style="color:${scoreColor}">SCORE: ${report.score} - ${report.vulnerabilidade}</b>
                <p style="color: #ffaa00; font-size: 0.9em;"><b>Achado Crítico:</b> ${report.critico}</p>
                <p><b>Risco:</b> ${report.risco}</p>
                <code style="display:block; background:#000; padding:5px; color:#fff;">PoC: ${report.poc}</code>
                <p style="font-size: 0.8em; color: #888;"><b>Como explorar:</b> ${report.exploracao}</p>
            </div>
        `;
    } catch (e) {
        display.innerText = "Erro na análise: " + e.message;
        console.error("Erro completo:", e);
    }
}