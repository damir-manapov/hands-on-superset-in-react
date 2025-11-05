import axios, { AxiosError } from 'axios';

// pnpm tsx back/scripts/forge-guest-token.ts

interface GenerateGuestTokenDto {
  resources: Array<{
    type: 'dashboard' | 'chart';
    id: string;
  }>;
  user?: {
    username: string;
    first_name?: string;
    last_name?: string;
  };
  rls?: Array<{
    clause: string;
  }>;
}

interface GuestTokenResponse {
  token: string;
}

async function forgeGuestToken() {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

  const axiosInstance = axios.create({
    baseURL: backendUrl,
    timeout: 10000,
  });

  try {
    console.log('🔗 Connecting to backend...');
    console.log(`   URL: ${backendUrl}`);

    // Get dashboard/chart IDs from command line args or use defaults
    const args = process.argv.slice(2);
    const resources: Array<{ type: 'dashboard' | 'chart'; id: string }> = [];

    if (args.length > 0) {
      // Parse arguments: --dashboard=123 --chart=456
      for (const arg of args) {
        if (arg.startsWith('--dashboard=')) {
          resources.push({
            type: 'dashboard',
            id: arg.split('=')[1] || '',
          });
        } else if (arg.startsWith('--chart=')) {
          resources.push({
            type: 'chart',
            id: arg.split('=')[1] || '',
          });
        }
      }
    }

    // If no resources provided, use a default dashboard ID
    if (resources.length === 0) {
      console.log('⚠️  No resources specified, using default dashboard ID: 1');
      resources.push({
        type: 'dashboard',
        id: '1',
      });
    }

    console.log('\n🎫 Requesting guest token from backend...');
    console.log(`   Resources: ${JSON.stringify(resources, null, 2)}`);

    // Prepare request body
    const requestBody: GenerateGuestTokenDto = {
      resources,
      user: {
        username: 'guest',
        first_name: 'Guest',
        last_name: 'User',
      },
      rls: [],
    };

    // Call backend API
    const response = await axiosInstance.post<GuestTokenResponse>(
      '/api/superset/guest-token',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n✨ Guest token generated successfully!');
    console.log('\n📋 Token:');
    console.log(response.data.token);
    console.log('\n💡 Usage:');
    console.log(
      `   Use this token in your React app to embed Superset dashboards/charts`
    );
    console.log(
      `   The backend will handle authentication with Superset automatically`
    );

    return response.data.token;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('\n❌ Error generating guest token:');
      console.error(`   Status: ${axiosError.response?.status}`);
      console.error(
        `   Message: ${axiosError.response?.data?.message || axiosError.message}`
      );
      if (axiosError.response?.data) {
        console.error(
          `   Response: ${JSON.stringify(axiosError.response.data, null, 2)}`
        );
      }
    } else {
      console.error('\n❌ Unexpected error:');
      console.error(error);
    }
    process.exit(1);
  }
}

void forgeGuestToken();
