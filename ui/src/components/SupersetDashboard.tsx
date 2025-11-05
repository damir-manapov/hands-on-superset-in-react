import { useEffect, useRef, useState } from 'react';
import { embedDashboard } from '@superset-ui/embedded-sdk';

interface SupersetDashboardProps {
  dashboardId: string;
  supersetUrl?: string;
  backendUrl?: string;
}

function SupersetDashboard({
  dashboardId,
  supersetUrl = 'http://localhost:8088',
  backendUrl = 'http://localhost:3001',
}: SupersetDashboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Function to fetch guest token - will be called by SDK when needed
    async function fetchGuestToken(): Promise<string> {
      console.log('[SupersetDashboard] fetchGuestToken called');
      console.log(
        '[SupersetDashboard] Fetching from:',
        `${backendUrl}/api/superset/guest-token`
      );

      try {
        const response = await fetch(`${backendUrl}/api/superset/guest-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resources: [
              {
                type: 'dashboard',
                id: dashboardId,
              },
            ],
            user: {
              username: 'guest',
              first_name: 'Guest',
              last_name: 'User',
            },
            rls: [],
          }),
        });

        console.log('[SupersetDashboard] Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[SupersetDashboard] Error response:', errorText);
          throw new Error(
            `Failed to get guest token: ${response.status} ${response.statusText} - ${errorText}`
          );
        }

        const data = (await response.json()) as { token: string };
        console.log(
          '[SupersetDashboard] Token received, length:',
          data.token.length
        );
        return data.token;
      } catch (err) {
        console.error('[SupersetDashboard] fetchGuestToken error:', err);
        throw err;
      }
    }

    async function loadDashboard() {
      try {
        console.log('[SupersetDashboard] Starting to load dashboard');
        console.log('[SupersetDashboard] Dashboard ID:', dashboardId);
        console.log('[SupersetDashboard] Superset URL:', supersetUrl);
        console.log('[SupersetDashboard] Backend URL:', backendUrl);

        setLoading(true);
        setError(null);

        // Wait for container ref to be available
        if (!containerRef.current) {
          console.warn(
            '[SupersetDashboard] Container ref not available, waiting...'
          );
          // Use requestAnimationFrame to wait for next render
          requestAnimationFrame(() => {
            if (mounted && containerRef.current) {
              void loadDashboard();
            }
          });
          return;
        }

        console.log('[SupersetDashboard] Container ref is available');

        // Test fetchGuestToken directly first
        console.log('[SupersetDashboard] Testing fetchGuestToken directly...');
        try {
          const testToken = await fetchGuestToken();
          console.log(
            '[SupersetDashboard] Direct fetchGuestToken test succeeded, token length:',
            testToken.length
          );
        } catch (testErr) {
          console.error(
            '[SupersetDashboard] Direct fetchGuestToken test failed:',
            testErr
          );
          throw testErr;
        }

        // Embed the dashboard
        // The SDK will call fetchGuestToken when needed
        console.log('[SupersetDashboard] About to call embedDashboard with:', {
          id: dashboardId,
          supersetDomain: supersetUrl,
          mountPoint: containerRef.current ? 'exists' : 'null',
        });

        const result = await embedDashboard({
          id: dashboardId,
          supersetDomain: supersetUrl,
          mountPoint: containerRef.current,
          fetchGuestToken,
          dashboardUiConfig: {
            hideTitle: false,
            hideChartControls: false,
            hideTab: false,
            filters: {
              expanded: true,
            },
          },
          debug: true, // Enable debug mode
        });

        console.log('[SupersetDashboard] embedDashboard result:', result);
        console.log('[SupersetDashboard] embedDashboard completed');

        // Don't set loading to false immediately - let the SDK handle it
        // The SDK might need time to load the dashboard
        setTimeout(() => {
          if (mounted) {
            setLoading(false);
          }
        }, 1000);
      } catch (err) {
        console.error('[SupersetDashboard] Error embedding dashboard:', err);
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to load dashboard'
          );
          setLoading(false);
        }
      }
    }

    // Wait a bit for the ref to be attached
    const timer = setTimeout(() => {
      if (mounted && containerRef.current) {
        void loadDashboard();
      } else {
        console.warn(
          '[SupersetDashboard] Container ref not available after timeout'
        );
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      mounted = false;
    };
  }, [dashboardId, supersetUrl, backendUrl]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '800px' }}>
      {/* Always render the container so ref is available */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {/* Show loading overlay */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <p>Loading dashboard...</p>
        </div>
      )}
      {/* Show error overlay */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            color: 'red',
          }}
        >
          <p>Error: {error}</p>
        </div>
      )}
    </div>
  );
}

export default SupersetDashboard;
