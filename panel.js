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

function renderLog(data, matches) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `
        <div><span class="method">[${data.method}]</span> <span class="url">${data.url}</span></div>
        <div style="color: #ffaa00; margin-top: 3px;">Padrões detectados: ${matches.join(', ')}</div>
        <button class="ai-btn">Analisar com Gemini</button>
        <div class="ai-response">Analisando vulnerabilidades...</div>
    `;

    // Botão para chamar a IA (Placeholder por enquanto)
    div.querySelector('.ai-btn').onclick = () => {
        const responseDiv = div.querySelector('.ai-response');
        responseDiv.style.display = 'block';
        analyzeWithAI(data, responseDiv);
    };

    logContainer.prepend(div);
}

// Função que fará a ponte com a API do Gemini
async function analyzeWithAI(data, displayElement) {
    const key = apiKeyInput.value;
    if (!key) {
        displayElement.innerText = "ERRO: Insira a API Key!";
        return;
    }

    // Encurtamos para evitar estouro de contexto
    const shortBody = data.body.substring(0, 3000); 

    // Prompt otimizado para economia de tokens e Score específico
    const prompt = `Analise este tráfego de rede para pentest. 
    Responda EXATAMENTE neste formato, sendo muito breve:
    SCORE: [0-10] [O que é o achado]
    RESUMO: [1 frase sobre o que é]
    RISCO: [1 frase sobre a falha]
    POC: [payload curto ou comando]
    Explicação de exploração: [O que colocar na aba "Console" para saber se a vulnerabilidade é explorável, explicando de maneira simplificada como explica para um iniciante na área.]

    Use a escala:
    0-4: Info importante, sem vulnerabilidade.
    4-6: Info crítica, sem vulnerabilidade clara.
    6-8: Suspeito, requer exploração ativa.
    8-10: Vulnerabilidade explorável detectada.

    Dados: ${data.method} ${data.url} | Body: ${shortBody}
    
    Não invente dados, nem vulnerabilidade. Não deduza Vulnerabildiade se você não tem certeza.`;

    

    try {
        // ATUALIZADO PARA O MODELO GEMINI 2.0 FLASH
        const urlAPI = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

        const response = await fetch(urlAPI, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const json = await response.json();
        console.log("DEBUG API (Gemini 2.5):", json);

        if (json.error) {
            displayElement.innerText = "Erro da API: " + json.error.message;
            return;
        }

        if (json.candidates && json.candidates[0].finishReason === "SAFETY") {
            displayElement.innerText = "⚠️ Bloqueado por filtros de segurança. Tente um alvo menos explícito.";
            return;
        }

        if (json.candidates && json.candidates[0].content) {
            displayElement.innerText = json.candidates[0].content.parts[0].text;
            displayElement.style.color = "#00ff41"; 
        } else {
            displayElement.innerText = "A API retornou um formato inesperado.";
        }
    } catch (error) {
        displayElement.innerText = "Erro de conexão: " + error.message;
    }
}