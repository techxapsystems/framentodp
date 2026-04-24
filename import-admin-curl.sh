#!/bin/bash

# URL da API
API_URL="https://3000-i90n1ebgf23qldo6ezzlj-54ddb660.us1.manus.computer/api/trpc/importAdministrative.importEmployees"

# Ler arquivo JSON
EMPLOYEES=$(cat /tmp/administrative_employees.json)

# Fazer requisição
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"employees\": $EMPLOYEES}" \
  -v

echo ""
echo "✅ Importação enviada"
