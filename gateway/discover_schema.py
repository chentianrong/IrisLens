import json

import litellm


def schema():
    providers = sorted(set(getattr(litellm, "provider_list", []) or []))
    return {
        "version": getattr(litellm, "version", None),
        "providers": [
            {
                "provider": provider,
                "protocols": ["http", "https"],
                "requiredFields": ["base_url", "api_key", "model"],
                "defaults": {"endpoint_protocol": "https"},
                "compatibility": {"streaming": ["chat/completions"]},
            }
            for provider in providers
        ],
    }


print(json.dumps(schema()))
