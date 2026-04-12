import os
import sys

# Define base path
BASE_DIR = r"c:\Users\omen\Desktop\Cognivox\cognivox\ragflow"
sys.path.append(BASE_DIR)

# Set environment variables
os.environ["PYTHONPATH"] = BASE_DIR

from api.db.db_models import Tenant, TenantLLM, Knowledgebase, DB

def fix_format():
    with DB.connection_context():
        # Corrected identifier format: <model_name>@<provider>
        model_name = "bge-small-en-v1.5"
        provider = "LocalAI"
        formatted_id = f"{model_name}@{provider}"

        # 1. Update/Ensure TenantLLM
        # The validation check is usually against the 'description' or 'id' strings 
        # that come back from API, but internally RAGFlow expects the combined string 
        # in the 'embd_id' fields of other tables.
        
        tenant = Tenant.select().first()
        if not tenant:
            print("No tenant found.")
            return

        # 2. Update Tenant
        tenant.embd_id = formatted_id
        tenant.save()
        print(f"Updated Tenant embd_id to: {formatted_id}")

        # 3. Update all Knowledgebases
        kb_count = Knowledgebase.update(
            embd_id=formatted_id
        ).execute()
        print(f"Updated {kb_count} knowledgebases to use: {formatted_id}")

if __name__ == "__main__":
    try:
        fix_format()
        print("FORMAT_FIX_SUCCESS")
    except Exception as e:
        print(f"FIX_FAILED: {e}")
