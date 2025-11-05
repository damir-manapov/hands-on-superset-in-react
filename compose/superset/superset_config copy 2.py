# Superset configuration

# Feature flags
FEATURE_FLAGS = {
    "ESTIMATE_QUERY_COST": False,
    "EMBEDDED_SUPERSET": True,
}

GUEST_ROLE_NAME = "Gamma"

# Clickjacking protection via CSP (only your app may frame Superset)
TALISMAN_ENABLED = True
TALISMAN_CONFIG = {
    "content_security_policy": {
        "frame-ancestors": [
            "'self'",
            "http://localhost:3000",  # dev app origin; replace/add prod origin(s)
            # "https://app.example.com",
        ],
    },
    # Needed if you are NOT using a reverse proxy to relax X-Frame-Options:
    # Disable XFO so CSP is the source of truth for embedding.
    "frame_options": None,
    "force_https": False,  # dev only; set True in prod behind TLS
}
