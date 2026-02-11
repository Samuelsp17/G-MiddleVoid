// devtools.js
chrome.devtools.panels.create(
    "G-MiddleVoid", // Nome da Aba
    null,           // Ícone
    "panel.html",   // O arquivo que ele vai abrir
    (panel) => {
        console.log("G-MiddleVoid registrado com sucesso!");
    }
);

// Escuta o tráfego de rede e repassa para o painel
chrome.devtools.network.onRequestFinished.addListener((request) => {
    request.getContent((body) => {
        chrome.runtime.sendMessage({
            type: "NETWORK_CAPTURE",
            url: request.request.url,
            method: request.request.method,
            requestHeaders: request.request.headers,
            responseHeaders: request.response.headers,
            status: request.response.status,
            body: body || ""
        });
    });
});