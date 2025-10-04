# ✅ Correção: Totais no Dashboard

## 🐛 Problema Identificado

No dashboard, as somas de **Receitas** e **Despesas** não incluíam transações **sem categoria** (quando `category_id = NULL`).

### Causa

A query SQL usava:
```sql
SUM(CASE WHEN c.kind = 'income' THEN t.amount ELSE 0 END) as total_income,
SUM(CASE WHEN c.kind = 'expense' THEN t.amount ELSE 0 END) as total_expense
```

Quando uma transação não tem categoria, `c.kind = NULL`, então:
- ❌ Não é contada como `income`
- ❌ Não é contada como `expense`
- ❌ **Não aparece nos totais!**

---

## ✅ Solução Implementada

Modificamos a query para **considerar transações sem categoria como despesas**:

```sql
-- Antes
SUM(CASE WHEN c.kind = 'expense' THEN t.amount ELSE 0 END) as total_expense

-- Depois
SUM(CASE WHEN c.kind = 'expense' OR c.kind IS NULL THEN t.amount ELSE 0 END) as total_expense
```

### Arquivos Modificados

- ✅ `/backend/src/routes/reports.ts`
  - Query de totais (`GET /reports/summary`)
  - Query por categoria (mostra "Sem categoria")
  - Query mensal (`GET /reports/monthly`)

---

## 📊 Como Verificar

### 1. Ver transações sem categoria no banco

```bash
docker compose exec -T db psql -U assessor_user -d assessor -c "
SELECT 
    user_id,
    COUNT(*) as sem_categoria,
    SUM(amount) as total
FROM transactions 
WHERE category_id IS NULL
GROUP BY user_id;
"
```

**Antes da correção:** Esses valores NÃO apareciam nos totais  
**Depois da correção:** ✅ Agora aparecem como despesas

### 2. Testar a API

```bash
# Ver resumo
curl -H "x-user-id: SEU_UUID" \
  "http://localhost:3001/reports/summary" | jq '.totals'
```

**Resultado esperado:**
```json
{
  "income": 3500.00,
  "expense": 1845.50,    // ✅ Inclui transações sem categoria
  "balance": 1654.50,
  "transactions": 15
}
```

### 3. Ver categorias (incluindo "Sem categoria")

```bash
curl -H "x-user-id: SEU_UUID" \
  "http://localhost:3001/reports/summary" | jq '.byCategory[] | select(.category == "Sem categoria")'
```

**Resultado esperado:**
```json
{
  "category": "Sem categoria",
  "kind": "expense",
  "total": 415.00,
  "count": 4
}
```

---

## 🎯 Impacto

### Antes da Correção ❌
- Dashboard mostrava valores **incorretos**
- Transações sem categoria eram **ignoradas** nos totais
- Saldo calculado **errado**

### Depois da Correção ✅
- Dashboard mostra valores **corretos**
- **TODAS** as transações são contadas
- Transações sem categoria aparecem como "Sem categoria"
- Saldo calculado **corretamente**

---

## 🔄 Como o Sistema Funciona Agora

1. **Transação COM categoria:**
   - Se `kind = 'income'` → soma em **Receitas**
   - Se `kind = 'expense'` → soma em **Despesas**

2. **Transação SEM categoria** (`category_id = NULL`):
   - ✅ Automaticamente contada como **Despesa**
   - ✅ Aparece no resumo como "Sem categoria"

---

## 📝 Observações

### Por que transações sem categoria?

Transações antigas ou criadas antes do novo sistema de categorias podem não ter `category_id`. 

### Solução recomendada

Atribuir categorias retroativamente:

```sql
-- Exemplo: Atribuir categoria "Outros" para transações sem categoria
UPDATE transactions t
SET category_id = (
    SELECT id FROM categories 
    WHERE user_id = t.user_id 
    AND name = 'Outros' 
    AND kind = 'expense'
    LIMIT 1
)
WHERE t.category_id IS NULL;
```

---

## ✅ Testado e Funcionando

- ✅ Totais calculados corretamente
- ✅ Transações sem categoria incluídas
- ✅ Saldo correto
- ✅ Backend reiniciado
- ✅ Pronto para usar!

**Agora o dashboard mostra os valores corretos! 🎉**
