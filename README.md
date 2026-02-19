# G-MiddleVoid: IA-Powered Network Pentest Assistant

O G-MiddleVoid é uma extensão para o Chrome DevTools projetada para auxiliar em atividades de Pentest de rede. Ele captura tráfego em tempo real, filtra dados sensíveis e utiliza a API do Gemini 2.5-Flash para analisar possíveis vulnerabilidades de segurança.

## Funcionalidades

* **Monitoramento de Rede**: Captura requisições HTTP/HTTPS ignorando arquivos estáticos desnecessários (CSS, imagens, fontes).
* **Filtro de Palavras-Chave**: Sistema de busca em tempo real que isola requisições contendo termos como "admin", "token", "password" ou "config".
* **Detecção de Padrões**: Identifica automaticamente endpoints suspeitos ou ocultos com base na estrutura da URL.
* **Análise por Inteligência Artificial**: Integração com Gemini 2.5-Flash para gerar relatórios sobre vulnerabilidades como Cookies inseguros, exposição de tokens e conformidade com OWASP Top 10.
* **Decodificação de Dados**: Suporte nativo para decodificação de payloads em Base64 para análise imediata.

## Estrutura do Projeto

* **manifest.json**: Configurações da extensão e permissões de acesso ao navegador.
* **devtools.html / devtools.js**: Responsáveis por registrar a ferramenta dentro do painel de desenvolvedor do Chrome.
* **panel.html / panel.js**: Interface do usuário e lógica de comunicação com a API de IA.

## Como Instalar

1. **Preparação dos Arquivos**: Certifique-se de que todos os arquivos do sistema estejam em uma única pasta local.
2. **Acesso ao Chrome**: Abra o navegador e acesse a URL `chrome://extensions/`.
3. **Modo do Desenvolvedor**: Ative a chave "Modo do desenvolvedor" localizada no canto superior direito.
4. **Carregar Extensão**: Clique no botão "Carregar sem compactação" e selecione a pasta onde os arquivos foram salvos.
5. **Confirmação**: A extensão G-MiddleVoid aparecerá na lista de extensões instaladas.

## Modo de Uso

1. **Abertura**: Abra o Chrome DevTools (F12 ou Ctrl+Shift+I).
2. **Navegação**: Clique na aba superior chamada **G-MiddleVoid**.
3. **Configuração**:
* Insira sua chave de API do Gemini no campo correspondente.
* No campo "Keywords", digite os termos que deseja monitorar separados por vírgula.


4. **Captura**: Navegue no site alvo. As requisições que coincidirem com seus filtros aparecerão no painel automaticamente.
5. **Análise**: Clique no botão "Analisar com G-MiddleVoid" em um log específico para receber o diagnóstico da IA, incluindo Score de risco e prova de conceito (PoC).

## Aviso Legal

Este software é destinado exclusivamente para testes de segurança autorizados. O uso desta ferramenta para acessar dados sem permissão ou em sistemas de terceiros sem consentimento é ilegal e de inteira responsabilidade do usuário.