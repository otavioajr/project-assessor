# 🎯 Como Acessar o Dashboard

## 🔑 UUID do Usuário de Teste

O usuário de teste principal é:
- **Telefone:** +5511999999999
- **UUID:** `33763842-47f2-47fd-b02a-9009848720c4`

## 🚀 Passo a Passo

### 1. Abrir o Dashboard

```bash
# Abrir no navegador
open http://localhost:5173
```

### 2. Configurar o UUID

Quando o dashboard abrir, **abra o Console do navegador** (F12 ou Cmd+Option+I) e execute:

```javascript
localStorage.setItem('userId', '33763842-47f2-47fd-b02a-9009848720c4');
location.reload();
```

### 3. Pronto! ✅

O dashboard agora vai mostrar:
- ✅ **8 categorias novas** (Custos Fixos, Conforto, etc.)
- ✅ Transações do usuário
- ✅ Eventos agendados

---

## 📊 Verificar Categorias

Se quiser confirmar que as categorias estão corretas:

```bash
curl -H "x-user-id: 33763842-47f2-47fd-b02a-9009848720c4" \
  http://localhost:3001/categories | jq '.[] | {id, name, kind, is_system}'
```

**Resultado esperado:**
```json
{
  "id": 105,
  "name": "Aumentar Renda/Empreender",
  "kind": "expense",
  "is_system": true
}
{
  "id": 103,
  "name": "Conforto",
  "kind": "expense",
  "is_system": true
}
...
```

---

## 🔄 Outros Usuários Disponíveis

Se quiser testar com outros usuários:

### Usuário 2 (também atualizado)
```javascript
localStorage.setItem('userId', '660e8400-e29b-41d4-a716-446655440001');
location.reload();
```

### Usuário 3 (WhatsApp com categorias novas)
```javascript
localStorage.setItem('userId', 'c697c9c1-d0eb-49c6-ab0f-340e48b95c0b');
location.reload();
```

---

## 🐛 Solução de Problemas

### Problema: Categorias antigas aparecem

**Solução:**
```bash
# Atualizar categorias do usuário
docker compose exec -T db psql -U assessor_user -d assessor -c "
DELETE FROM categories WHERE user_id = '33763842-47f2-47fd-b02a-9009848720c4';
SELECT create_default_categories('33763842-47f2-47fd-b02a-9009848720c4');
"

# Recarregar dashboard
# F5 ou Cmd+R no navegador
```

### Problema: Nenhuma categoria aparece

**Solução:**
1. Abra o Console do navegador (F12)
2. Vá para a aba **Application** > **Local Storage** > `http://localhost:5173`
3. Verifique se `userId` está definido
4. Se não, execute:
   ```javascript
   localStorage.setItem('userId', '33763842-47f2-47fd-b02a-9009848720c4');
   location.reload();
   ```

---

## 📱 Integração WhatsApp → Dashboard

Para ver transações criadas via WhatsApp no dashboard:

1. **Envie mensagem via WhatsApp** (script de teste):
   ```bash
   ./test-novo-fluxo.sh
   ```

2. **Obtenha o UUID do usuário WhatsApp:**
   ```bash
   docker compose exec -T db psql -U assessor_user -d assessor -c "
   SELECT id FROM users WHERE wa_number = '+5511944444444';
   "
   ```

3. **Configure no dashboard:**
   ```javascript
   localStorage.setItem('userId', 'UUID_OBTIDO');
   location.reload();
   ```

---

## ✅ Checklist

- [ ] Dashboard aberto em http://localhost:5173
- [ ] Console do navegador aberto (F12)
- [ ] UUID configurado no localStorage
- [ ] Página recarregada
- [ ] 8 categorias aparecem corretamente
- [ ] Pode criar/editar transações
- [ ] Categorias não podem ser deletadas (is_system = true)

---

## 🎯 Comando Rápido

```bash
# Ver UUID do usuário principal
docker compose exec -T db psql -U assessor_user -d assessor -c "
SELECT id, wa_number FROM users WHERE wa_number = '+5511999999999';
"
```

**Use este UUID no localStorage!**
