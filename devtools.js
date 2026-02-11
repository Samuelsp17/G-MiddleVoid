chrome.devtools.network.onRequestFinished.addListener((request) => {
    // FILTRO XHR/Fetch: Ignora imagens, fontes e scripts estáticos
    const isXHR = request._resourceType === "xhr" || request._resourceType === "fetch";
    
    if (isXHR) {
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
    }
});