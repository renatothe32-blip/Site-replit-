# RA Studio - Plataforma SaaS (scaffold)

RA Studio é um scaffold para uma plataforma SaaS inspirada no Replit. Fornece frontend (Next.js + Monaco), backend (Express + Prisma + PostgreSQL), autenticação JWT, deploy via Docker/Railway e infra mínima para executar e hospedar projetos Node.js.

Principais features:
- Login / cadastro (JWT)
- Dashboard / perfil
- Criar, editar e excluir projetos
- Sistema de arquivos por projeto
- Editor de código online (Monaco)
- Terminal web (via WebSocket)
- Hospedagem / deploy básico (container runner placeholder)
- Logs em tempo real (Socket.IO)
- Tema escuro
- Painel administrativo
- Limite de recursos por usuário (placeholder)
- API REST documentada
- Templates
- Integração GitHub (esqueleto)
- Preparado para IA futura

Pré-requisitos locais:
- Node.js 20+
- Docker & docker-compose
- npm

Como rodar localmente:
1. Copie `.env.example` para `.env` e preencha.
2. Instale dependências:
   npm ci
3. Inicie serviços com docker-compose (Postgres + app):
   docker-compose up --build
4. Em outro terminal, rode migrações Prisma:
   cd apps/api
   npx prisma migrate dev --name init
5. Acesse:
   - Frontend: http://localhost:3000
   - API: http://localhost:4000
   - WebSocket / terminal: integrado na API

Deploy (Railway):
- Use `railway.json` provido como ponto de partida (defina variáveis de ambiente no Railway).

Estrutura resumida:
- apps/web           (Next.js + Tailwind + Monaco)
- apps/api           (Express + Prisma + Socket.IO)
- apps/runner        (Runner que cria containers via Docker)
- docker-compose.yml
- Dockerfile
- railway.json
- README.md

Próximos passos recomendados:
- Implementar runner isolado (containerized execution) para cada projeto.
- Integrar OAuth GitHub completo.
- Adicionar monitoramento/observabilidade.

Licença: MIT
