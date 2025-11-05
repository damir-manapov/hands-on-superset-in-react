DEBUG = False
# Load from env/secret manager in prod:
# SECRET_KEY = os.environ["SUPERSET_SECRET_KEY"]

FEATURE_FLAGS = {
    "ESTIMATE_QUERY_COST": False,
    "EMBEDDED_SUPERSET": True,
}

# Create a minimal custom role later (view-only on specific dashboards/datasets)
GUEST_ROLE_NAME = "Gamma"  # <-- ok for first deploy; switch to "guest_embeds" later

TALISMAN_ENABLED = True
TALISMAN_CONFIG = {
    # Only your app(s) can frame Superset
    "content_security_policy": {
        "frame-ancestors": ["'self'", "https://app.example.com"],
    },
    # Keep SAMEORIGIN globally; relax on /embedded/* at the reverse proxy
    "frame_options": "SAMEORIGIN",
    "force_https": True,
}

# Cookies secure under HTTPS
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "Lax"
# In prod behind a domain, usually let Flask set cookie domain automatically:
SESSION_COOKIE_DOMAIN = None  # or ".example.com" if you truly need cross-subdomain

# If behind a proxy/load balancer:
ENABLE_PROXY_FIX = True
PROXY_FIX_CONFIG = {"x_for": 1, "x_proto": 1, "x_host": 1, "x_port": 1, "x_prefix": 1}
