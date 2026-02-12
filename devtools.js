chrome.devtools.panels.create(
    "G-MiddleVoid", 
    null,           
    "panel.html",   
    (panel) => {
        console.log("G-MiddleVoid registrado com sucesso!");
    }
);

chrome.devtools.network.onRequestFinished.addListener((request) => {
    const url = request.request.url;

    // 1. Filtra para aceitar apenas HTTP/HTTPS (remove chrome-extension://)
    if (!url.startsWith('http')) return;

    // 2. Filtra arquivos estáticos comuns que não interessam ao Pentest
    const ignoreExtensions = ['.css', '.woff', '.woff2', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'];
    if (ignoreExtensions.some(ext => url.toLowerCase().split('?')[0].endsWith(ext))) return;

    request.getContent((body) => {
        chrome.runtime.sendMessage({
            type: "NETWORK_CAPTURE",
            url: url,
            method: request.request.method,
            requestHeaders: request.request.headers,
            responseHeaders: request.response.headers,
            status: request.response.status,
            body: body || ""
        });
    });
});