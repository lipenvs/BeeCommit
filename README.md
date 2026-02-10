# 🐝 BeeCommit

**BeeCommit** é uma extensão para Google Chrome que sincroniza automaticamente suas soluções aceitas no [Beecrowd](https://judge.beecrowd.com/) diretamente para um repositório no GitHub.

![Banner do BeeCommit](PLACEHOLDER_BANNER_IMAGE_HERE)

## ✨ Funcionalidades

- **Sincronização Manual Simplificada**:
  - Botão 🐝 na lista de submissões (`/runs`) para sincronizar sem sair da página.
  - Botão flutuante na página de código (`/runs/code/{ID}`).
- **Sem conflitos**: Verifica se o arquivo já existe e atualiza se necessário.
- **Suporte a múltiplas linguagens**: Detecta automaticamente a linguagem (C++, Python, Java, Rust, etc.) e salva com a extensão correta.
- **Organização Automática**: Cria pastas por problema (`beecrowd/{ID}/problem_{ID}.ext`).
- **Commits Semânticos**: Mensagens padronizadas como `feat: solve problem 1930 in Rust`.

## 🛠️ Instalação (Modo Desenvolvedor)

Como esta extensão ainda não está na Chrome Web Store, você deve instalá-la manualmente:

1. Clone este repositório ou baixe o código fonte.
2. Abra o Chrome e acesse `chrome://extensions`.
3. Ative o **Modo do desenvolvedor** no canto superior direito.
4. Clique em **Carregar sem compactação** (Load unpacked).
5. Selecione a pasta onde você baixou/clonou o projeto (a pasta que contém o `manifest.json`).

![Como instalar extensão no Chrome](PLACEHOLDER_INSTALLATION_SCREENSHOT)

## ⚙️ Configuração

1. Clique no ícone da extensão 🐝 na barra do navegador.
2. **GitHub Token**: Insira seu Personal Access Token (PAT).
    > **Dica:** Recomendamos usar um [Fine-grained PAT](https://github.com/settings/personal-access-tokens/new) limitado apenas ao repositório de destino com permissão de `Contents: Read and write`.
3. **Repositório**: Selecione o repositório onde suas soluções serão salvas.
4. Clique em **Salvar**.

![Configurando a extensão](PLACEHOLDER_CONFIGURATION_SCREENSHOT)

## 🚀 Como Usar

### Opção 1: Pela Lista de Submissões (`/runs`)

1. Acesse sua lista de submissões em [judge.beecrowd.com/pt/runs](https://judge.beecrowd.com/pt/runs).
2. Você verá um ícone 🐝 ao lado de cada submissão **Accepted**.
3. Clique no ícone para sincronizar.
   - ⏳ **Ampulheta**: Sincronizando...
   - ✅ **Check**: Sucesso! Código no GitHub.
   - ❌ **X**: Erro (passe o mouse para ver o detalhe).

![Sincronização na lista de runs](PLACEHOLDER_RUNS_PAGE_SCREENSHOT)

### Opção 2: Pela Página do Código (`/runs/code/{ID}`)

1. Acesse o código de uma submissão aceita.
2. Um botão flutuante **"🐝 Sync to GitHub"** aparecerá no canto inferior direito.
3. Clique para enviar.

![Botão flutuante na página de código](PLACEHOLDER_CODE_PAGE_SCREENSHOT)

## 📁 Estrutura no GitHub

Suas soluções serão organizadas da seguinte forma:

```
nome-do-repositorio/
└── beecrowd/
    ├── 1000/
    │   └── problem_1000.cpp
    ├── 1001/
    │   └── problem_1001.py
    └── 1930/
        └── problem_1930.rs
```

## 🔒 Privacidade e Segurança

- O seu **GitHub Token** é salvo apenas no armazenamento local do seu navegador (`chrome.storage.sync`) e não é compartilhado com ninguém.
- A extensão se comunica diretamente com a API do GitHub, sem intermediários.

## 🤝 Contribuição

Pull requests são bem-vindos! Para mudanças maiores, por favor abra uma issue primeiro para discutir o que você gostaria de mudar.

---
Feito com 💜 e Rust (brincadeira, é JS mesmo).
