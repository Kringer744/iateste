"""
Script para limpar o banco de dados e manter apenas a primeira empresa cadastrada,
evitando qualquer risco de contaminação multi-tenant.
Também limpa o cache do Redis para remover estados antigos de conversas e unidades.

Execute no terminal do container bot:
  python3 limpar_banco.py
"""
import asyncio
import os
import asyncpg
import redis.asyncio as aioredis
from dotenv import load_dotenv

load_dotenv()

def build_dsn():
    raw = os.getenv("DATABASE_URL", "")
    if not raw:
        raise RuntimeError("DATABASE_URL não definida no ambiente")
    if raw.startswith("postgres://"):
        raw = raw.replace("postgres://", "postgresql://", 1)
    if "?" in raw:
        raw = raw.split("?")[0]
    return raw

async def main():
    dsn = build_dsn()
    redis_url = os.getenv("REDIS_URL")
    
    print("Connecting to PostgreSQL...")
    conn = await asyncpg.connect(dsn)
    
    # 1. Identifica a primeira empresa cadastrada (menor ID)
    primeira_empresa = await conn.fetchrow(
        "SELECT id, nome, created_at FROM empresas ORDER BY id ASC LIMIT 1"
    )
    
    if not primeira_empresa:
        print("❌ Nenhuma empresa encontrada no banco de dados!")
        await conn.close()
        return
        
    empresa_principal_id = primeira_empresa["id"]
    print(f"⭐ Empresa principal identificada para MANTER: ID={empresa_principal_id} - Nome: {primeira_empresa['nome']}")
    
    # 2. Lista empresas que serão removidas
    outras_empresas = await conn.fetch(
        "SELECT id, nome FROM empresas WHERE id != $1 ORDER BY id ASC", 
        empresa_principal_id
    )
    
    if outras_empresas:
        print(f"⚠️ As seguintes {len(outras_empresas)} empresas (e todos os seus dados relacionados) serão REMOVIDAS:")
        for emp in outras_empresas:
            print(f"   - ID: {emp['id']} | Nome: {emp['nome']}")
            
        # Executa a deleção das outras empresas (o ON DELETE CASCADE cuidará do resto)
        print("\nDeletando empresas secundárias...")
        deleted = await conn.execute(
            "DELETE FROM empresas WHERE id != $1", 
            empresa_principal_id
        )
        print(f"✅ Remoção de empresas concluída: {deleted}")
    else:
        print("ℹ️ Nenhuma outra empresa encontrada para remover.")

    # 3. Garante que só existam registros da empresa 1 nas tabelas principais
    # (Caso existam registros órfãos ou inconsistências)
    print("\nVerificando integridade das tabelas...")
    tables_to_check = [
        "unidades", "conversas", "mensagens", "usuarios", 
        "integracoes", "personalidade_ia", "planos", 
        "templates_followup", "followups", "faq"
    ]
    for table in tables_to_check:
        try:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM {table} WHERE empresa_id != $1", empresa_principal_id)
            if count > 0:
                print(f"   - Removendo {count} registros órfãos da tabela '{table}'...")
                await conn.execute(f"DELETE FROM {table} WHERE empresa_id != $1", empresa_principal_id)
        except Exception as e:
            print(f"   - Erro ao verificar tabela '{table}': {e}")
            
    await conn.close()
    print("PostgreSQL limpo com sucesso!")
    
    # 4. Limpeza do Redis
    if redis_url:
        print("\nConnecting to Redis...")
        try:
            redis_client = aioredis.from_url(redis_url, decode_responses=True)
            print("Limpando cache do Redis...")
            await redis_client.flushdb()
            print("✅ Cache do Redis limpo com sucesso!")
            await redis_client.close()
        except Exception as e:
            print(f"❌ Erro ao conectar ou limpar o Redis: {e}")
    else:
        print("\n⚠️ REDIS_URL não definida. Cache do Redis não pôde ser limpo automaticamente.")

    print("\n🎉 Processo de limpeza concluído com sucesso!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nCancelado pelo usuário.")
    except Exception as e:
        print(f"\n❌ Erro durante a execução: {e}")
