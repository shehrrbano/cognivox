import os
import sys

# Define base path
BASE_DIR = r"c:\Users\omen\Desktop\Cognivox\cognivox\ragflow"
sys.path.append(BASE_DIR)

# Set environment variables so RAGFlow can load its own modules
os.environ["PYTHONPATH"] = BASE_DIR

from api.db.db_models import Tenant, TenantLLM, Knowledgebase, DB


def emergency_fix():
    with DB.connection_context():
        # 1. Update or create the Local Embedding Model in TenantLLM
        # We model it as a "LocalAI" or similar type, but pointing to our TEI container
        
        # Get the first tenant (usually the only one in local dev)
        tenant = Tenant.select().first()
        if not tenant:
            print("No tenant found!")
            return

        print(f"Fixing Tenant: {tenant.id}")

        # Define the local model config
        # TEI is running at http://localhost:6380
        # Model ID is BAAI/bge-small-en-v1.5
        
        local_model_name = "bge-small-en-v1.5"
        factory = "LocalAI" # RAGFlow supports this as a generic OpenAI-compatible provider
        
        # Try to find existing or create new
        tenant_llm, created = TenantLLM.get_or_create(
            tenant_id=tenant.id,
            llm_factory=factory,
            llm_name=local_model_name,
            defaults={
                "model_type": "embedding",
                "api_base": "http://localhost:6380/v1",
                "api_key": "not-needed",
                "status": "1"
            }
        )
        
        if not created:
            tenant_llm.api_base = "http://localhost:6380/v1"
            tenant_llm.api_key = "not-needed"
            tenant_llm.model_type = "embedding"
            tenant_llm.status = "1"
            tenant_llm.save()

        print(f"Local Embedding Model ensured: {tenant_llm.id}")

        # 2. Update Tenant's default embedding model
        tenant.embd_id = local_model_name
        tenant.tenant_embd_id = tenant_llm.id
        tenant.save()
        print("Tenant default embedding model updated.")

        # 3. Update all Knowledgebases (Datasets) to use this model
        kb_count = Knowledgebase.update(
            embd_id=local_model_name,
            tenant_embd_id=tenant_llm.id
        ).execute()
        print(f"Updated {kb_count} knowledgebases to use local embedding.")

if __name__ == "__main__":
    try:
        emergency_fix()
        print("EMERGENCY_FIX_SUCCESS")
    except Exception as e:
        print(f"FIX_FAILED: {e}")
        import traceback
        traceback.print_exc()
