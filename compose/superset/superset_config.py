# Superset configuration

# Feature flags
FEATURE_FLAGS = {
    "ESTIMATE_QUERY_COST": False,
    "EMBEDDED_SUPERSET": True,
}

# Enable CORS for embedding
ENABLE_CORS = True

# Configure Talisman for Content Security Policy (CSP)
TALISMAN_ENABLED = True
TALISMAN_CONFIG = {
    "content_security_policy": {
        "frame-ancestors": [
            "'self'",
            "http://localhost:3000",
            "http://localhost:3001",
            "https://localhost:3000",
            "https://localhost:3001",
        ],
    },
}

# Guest role configuration for embedded Superset
GUEST_ROLE_NAME = "Gamma"

