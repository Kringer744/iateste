#!/bin/sh
set -e

echo "=== CONCIERGE IA STARTUP ==="
echo "REDIS_URL: $REDIS_URL"
echo "DATABASE_URL: $DATABASE_URL"
echo "JWT_SECRET_KEY: $([ -n "$JWT_SECRET_KEY" ] && echo SET || echo NOT_SET)"

echo ""
echo "=== TESTANDO CONEXOES ==="
python3 -c "
import socket, sys, os

# Testa Redis
redis_url = os.environ.get('REDIS_URL', '')
host = 'hotelbot_redis'
try:
    s = socket.create_connection((host, 6379), timeout=5)
    s.close()
    print('Redis TCP: OK')
except Exception as e:
    print(f'Redis TCP: FALHOU - {e}')
    sys.exit(1)

# Testa PostgreSQL
try:
    s = socket.create_connection(('hotelbot_postgres', 5432), timeout=5)
    s.close()
    print('PostgreSQL TCP: OK')
except Exception as e:
    print(f'PostgreSQL TCP: FALHOU - {e}')
    sys.exit(1)
"

echo ""
echo "=== ALEMBIC ==="
alembic upgrade heads 2>&1

echo ""
echo "=== INICIANDO UVICORN ==="
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info
