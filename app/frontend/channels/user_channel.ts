import { createConsumer } from '@anycable/web';
import { IRootStore } from '../stores/root-store';
import { camelizeResponse } from '../utils';
import { UserPushProcessor } from './processors/user_push_processor';

interface WebSocketTokenResponse {
  token: string;
}

export const createUserSpecificConsumer = async () => {
  // @ts-expect-error - TypeScript can't determine the meta tag exists
  const BASE_WEBSOCKET_URL = document.querySelector("meta[name='action-cable-url']").content;

  try {
    const response = await fetch('/api/websocket_token', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[WebSocket] Token fetch failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch WebSocket token: HTTP ${response.status}`);
    }

    const data: WebSocketTokenResponse = await response.json();

    if (!data.token || typeof data.token !== 'string') {
      console.error('[WebSocket] Invalid token response from server');
      throw new Error('Invalid token response from server');
    }

    const finalUrl = `${BASE_WEBSOCKET_URL}?token=${encodeURIComponent(data.token)}`;
    return createConsumer(finalUrl);
  } catch (error) {
    console.error('[WebSocket] Failed to create authenticated consumer:', error);
    throw new Error('Failed to create WebSocket consumer due to authentication error');
  }
};

export const createUserChannelConsumer = async (userId: string, rootStore: IRootStore) => {
  const userPushProcessor = new UserPushProcessor(rootStore);
  try {
    const consumer = await createUserSpecificConsumer();

    const subscription = consumer.subscriptions.create(
      { channel: 'UserChannel' },
      {
        connected() {
          import.meta.env.DEV && console.log('[WebSocket] User Channel connected for user:', userId);
        },
        disconnected() {
          import.meta.env.DEV && console.log('[WebSocket] User Channel disconnected for user:', userId);
        },
        received(data) {
          const camelizedData = camelizeResponse(data);
          userPushProcessor.process(camelizedData);
        },
        rejected() {
          console.error('[WebSocket] User Channel rejected - Authentication failed for user:', userId);
        },
      },
    );

    return { consumer, subscription };
  } catch (error) {
    console.error('[WebSocket] Failed to create user channel for user:', userId, 'Error:', error);
    throw error;
  }
};
