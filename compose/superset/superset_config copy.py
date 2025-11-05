# Superset configuration

# Feature flags
FEATURE_FLAGS = {
    "ESTIMATE_QUERY_COST": False,
    "EMBEDDED_SUPERSET": True,
}

# Enable CORS for embedding
ENABLE_CORS = True

# Disable X-Frame-Options to allow embedding
# Flask-Security-Too uses X_FRAME_OPTIONS, but we also need to disable it in Talisman
X_FRAME_OPTIONS = 'ALLOW'

# Enable proxy fix for proper header handling
ENABLE_PROXY_FIX = True

# Configure Talisman for Content Security Policy (CSP)
TALISMAN_ENABLED = True

# Get default Talisman config and merge our settings
try:
    from superset.config import TALISMAN_CONFIG as TALISMAN_DEFAULTS
    
    # Merge CSP settings
    default_csp = TALISMAN_DEFAULTS.get("content_security_policy", {})
    if isinstance(default_csp, dict):
        merged_csp = dict(default_csp)
    else:
        merged_csp = {}
    
    # Add frame-ancestors to allow embedding
    merged_csp["frame-ancestors"] = [
        "'self'",
        "http://localhost:3000",
        "http://localhost:3001",
        "https://localhost:3000",
        "https://localhost:3001",
    ]
    
    # Merge with defaults
    TALISMAN_CONFIG = {
        **TALISMAN_DEFAULTS,
        "content_security_policy": merged_csp,
        "frame_options": None,  # Disable X-Frame-Options to allow embedding
        "force_https": False,  # Allow HTTP for local development
    }
except (ImportError, AttributeError):
    # Fallback if defaults can't be imported
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
        "frame_options": None,
        "force_https": False,
    }

# Guest role configuration for embedded Superset
GUEST_ROLE_NAME = "Gamma"

