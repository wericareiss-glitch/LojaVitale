# Vitale Concierge — Estética Avançada & Mercado Pago

Aplicação web completa para agendamento de procedimentos estéticos a domicílio em Teresina - PI, com integração oficial à API do **Mercado Pago** (PIX e Cartão de Crédito em até 12x), seletor de data e horário, e painel de gerenciamento de pedidos.

---

## 🚀 Como sincronizar com o Git e subir para o GitHub

Se o seu repositório ainda não foi inicializado ou você quer atualizar o GitHub:

### 1. Inicializar e salvar as alterações locais
```bash
git init
git add .
git commit -m "feat: integração mercado pago, agendamento de data/hora e correção github pages"
git branch -M main
```

### 2. Conectar ao seu repositório no GitHub
Substitua pelo link do seu repositório no GitHub:
```bash
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
```
*(Se o `origin` já existir, use `git remote set-url origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git`)*

### 3. Enviar para o GitHub
```bash
git push -u origin main --force
```

---

## 🌐 Publicação Automática no GitHub Pages

Este repositório já inclui um fluxo de automação (**GitHub Actions**) em `.github/workflows/deploy.yml`.

### Como ativar no GitHub:
1. Acesse o seu repositório no GitHub.
2. Vá na aba **Settings** (Configurações) > menu lateral **Pages**.
3. Em **Build and deployment** > **Source**, mude para **GitHub Actions**.
4. Pronto! A cada `git push` na branch `main`, o GitHub fará o build do Vite automaticamente e colocará o site no ar sem erros de página em branco.

---

## 💻 Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor full-stack (Express + Vite)
npm run dev

# 3. Compilar para produção
npm run build
```

---

## 🔑 Configuração do Mercado Pago
Crie um arquivo `.env` (baseado no `.env.example`):
```env
MERCADO_PAGO_ACCESS_TOKEN="TEST-seu-access-token"
MERCADO_PAGO_PUBLIC_KEY="TEST-sua-public-key"
```
Mesmo sem credenciais cadastradas, o aplicativo possui um simulador local integrado que permite testar o fluxo de agendamento, PIX e cartão sem custos.
