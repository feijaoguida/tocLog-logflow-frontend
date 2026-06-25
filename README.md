# LogFlow2 - Web Frontend

Este é o frontend web do LogFlow2, uma aplicação React construída com Next.js 15, focada em performance e uma experiência de usuário rica com dashboard customizável.

## 🛠️ Tecnologias

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Linguagem:** TypeScript
- **Estilização:** [TailwindCSS](https://tailwindcss.com/)
- **UI Kit:** [Shadcn UI](https://ui.shadcn.com/)
- **Gráficos:** Recharts
- **Dashboard:** React-Grid-Layout (Drag-and-drop)

## 🚀 Configuração e Execução

### Pré-requisitos
- Node.js (v18+)

### Passos:

1.  **Instalar dependências:**
    ```bash
    npm install
    ```

2.  **Configurar Variáveis de Ambiente:**
    Crie um arquivo `.env.local` na raiz:
    ```bash
    NEXT_PUBLIC_API_URL=http://localhost:3333
    ```

3.  **Executar em Desenvolvimento:**
    ```bash
    npm run dev
    ```
    Acesse em `http://localhost:4000`.

4.  **Build para Produção:**
    ```bash
    npm run build
    npm start
    ```

## ✨ Funcionalidades Destaque

### Dashboard Personalizável (`/dashboard`)
O sistema permite que cada colaborador crie suas próprias visões de painel.
- **Engine:** Localizada em `components/dashboard/dashboard-engine.tsx`.
- **Widgets:** Registrados em `components/dashboard/widget-registry.tsx`.
- **Funcionalidades:** Adicionar, remover, redimensionar e mover widgets.

### Autenticação
Gerenciada via `AuthContext`, persistindo o token JWT e controlando o acesso às rotas protegidas.
