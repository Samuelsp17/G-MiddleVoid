// Cria a aba no painel do F12
chrome.devtools.panels.create(
    "Gemini Pentest", 
    null, 
    "panel.html", 
    (panel) => { console.log("Painel Ativado!"); }
);

// Escuta o tráfego de rede e envia para o panel.js
chrome.devtools.network.onRequestFinished.addListener((request) => {
    request.getContent((body) => {
        if (body) {
            chrome.runtime.sendMessage({
                type: "NETWORK_CAPTURE",
                url: request.request.url,
                method: request.request.method,
                body: body,
                status: request.response.status
            });
        }
    });
});