# Contribuindo para o Assessor Financeiro

Obrigado por considerar contribuir com este projeto! 🎉

## Como Contribuir

### 1. Reportar Bugs

Abra uma [issue](https://github.com/seu-usuario/assessor-financeiro/issues) com:
- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs atual
- Screenshots (se aplicável)
- Ambiente (OS, Node version, etc.)

### 2. Sugerir Features

Abra uma issue com:
- Descrição da feature
- Problema que resolve
- Exemplos de uso
- Mockups (se aplicável)

### 3. Enviar Pull Requests

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Faça suas alterações
4. Commit: `git commit -m 'feat: adiciona minha feature'`
5. Push: `git push origin feature/minha-feature`
6. Abra um Pull Request

## Padrões de Código

### Commits (Conventional Commits)

```
feat: nova funcionalidade
fix: correção de bug
docs: documentação
style: formatação
refactor: refatoração
test: testes
chore: tarefas gerais
```

### TypeScript

- Use tipos estritos (evite `any`)
- Documente funções públicas
- Siga o ESLint configurado

### Testes

- Adicione testes para novas features
- Mantenha cobertura > 80%
- Execute `npm test` antes do PR

### Segurança

- **NUNCA** commit credenciais ou secrets
- Respeite o isolamento por `user_id`
- Teste RLS em queries novas

## Estrutura de Pastas

```
backend/
  src/
    config/     # Configurações
    routes/     # Rotas da API
    nlp/        # Parser de mensagens
    jobs/       # Cron jobs
    tests/      # Testes

frontend/
  src/
    components/ # Componentes React
    pages/      # Páginas
    lib/        # Utilitários
    hooks/      # Custom hooks
```

## Checklist do PR

- [ ] Código segue os padrões do projeto
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Build passa sem erros
- [ ] Lint passa sem warnings
- [ ] Testado localmente

## Dúvidas?

Abra uma issue ou entre em contato!
