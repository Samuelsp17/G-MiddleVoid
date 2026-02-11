const logContainer = document.getElementById('log-container');
const keywordsInput = document.getElementById('keywords');
const apiKeyInput = document.getElementById('apiKey');

// Escuta as mensagens enviadas pelo devtools.js
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "NETWORK_CAPTURE") {
        const keywords = keywordsInput.value.split(',').map(k => k.trim().toLowerCase());
        const contentLower = msg.body.toLowerCase();
        const urlLower = msg.url.toLowerCase();

        // Verifica se algum termo alvo aparece na URL ou no corpo da resposta
        const found = keywords.filter(k => contentLower.includes(k) || urlLower.includes(k));

        if (found.length > 0) {
            renderLog(msg, found);
        }
    }
});

// ... (lógica de mensagens e storage anterior)

function renderLog(data, matches) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    
    // Gerando o snippet para o botão "Copy as Fetch"
    const fetchSnippet = `fetch("${data.url}", { method: "${data.method}" });`;

    div.innerHTML = `
        <div class="log-header">
            <span class="method">${data.method}</span>
            <span class="url">${data.url.substring(0, 80)}...</span>
            <button class="copy-btn" onclick="navigator.clipboard.writeText(\`${fetchSnippet}\`)">Copy Fetch</button>
        </div>
        <div class="matches">Padrões: ${matches.join(', ')}</div>
        <button class="ai-btn">Analisar com Gemini</button>
        <div class="ai-result-card" style="display:none;"></div>
    `;

    div.querySelector('.ai-btn').onclick = () => analyzeWithAI(data, div.querySelector('.ai-result-card'));
    logContainer.prepend(div);
}

async function analyzeWithAI(data, displayElement) {
    displayElement.style.display = 'block';
    displayElement.innerHTML = "Processando no Void...";
    
    const key = document.getElementById('apiKey').value;
    
    // PROMPT PARA JSON ESTRUTURADO (Item 2.1 da sua lista)
    const prompt = `Analise para Pentest (OWASP Top 10). Responda APENAS JSON:
    {
      "score": 0-10,
      "vulnerabilidade": "nome",
      "risco": "curto",
      "poc": "payload",
      "fix": "como mitigar, explicado de forma simples para inciantes"
    }
    Dados: ${data.method} ${data.url} | Body: ${data.body.substring(0, 1000)}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const resData = await response.json();
        const content = resData.candidates[0].content.parts[0].text;
        
        // Parsing do JSON da IA
        const report = JSON.parse(content.replace(/```json|```/g, ""));

        // ESTILIZAÇÃO POR SCORE (Item 3.3 da sua lista)
        const scoreColor = report.score > 7 ? "#ff4c4c" : (report.score > 4 ? "#ffaa00" : "#00ff41");

        displayElement.innerHTML = `
            <div style="border-left: 4px solid ${scoreColor}; padding: 10px;">
                <b style="color:${scoreColor}">SCORE: ${report.score} - ${report.vulnerabilidade}</b>
                <p><b>Risco:</b> ${report.risco}</p>
                <code>PoC: ${report.poc}</code>
            </div>
        `;
    } catch (e) {
        displayElement.innerText = "Erro na análise: " + e.message;
    }
}