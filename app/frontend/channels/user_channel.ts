import { createConsumer } from '@anycable/web';
import { IRootStore } from '../stores/root-store';
import { camelizeResponse } from '../utils';
import { UserPushProcessor } from './processors/user_push_processor';

export const createUserSpecificConsumer = async () => {
  // @ts-expect-error - TypeScript can't determine the meta tag exists
  const BASE_WEBSOCKET_URL = document.querySelector("meta[name='action-cable-url']").content;
  console.log('[WebSocket Frontend] Base WebSocket URL:', BASE_WEBSOCKET_URL);

  try {
    console.log('[WebSocket Frontend] Fetching WebSocket token...');
    const response = await fetch('/api/websocket_token', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log('[WebSocket Frontend] Token response status:', response.status);
    if (!response.ok) {
      console.error('[WebSocket Frontend] Token fetch failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch WebSocket token: HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('[WebSocket Frontend] Token received, length:', data.token?.length || 'undefined');
    const finalUrl = `${BASE_WEBSOCKET_URL}?token=${encodeURIComponent(data.token)}`;
    console.log(
      '[WebSocket Frontend] Final WebSocket URL (token truncated):',
      finalUrl.substring(0, finalUrl.indexOf('?token=') + 15) + '...',
    );
    return createConsumer(finalUrl);
  } catch (error) {
    console.error('[WebSocket Frontend] Failed to create authenticated WebSocket consumer:', error);
    throw new Error('Failed to create WebSocket consumer due to authentication error');
  }
};

export const createUserChannelConsumer = async (userId: string, rootStore: IRootStore) => {
  const userPushProcessor = new UserPushProcessor(rootStore);
  try {
    console.log('[WebSocket Frontend] Creating consumer for user:', userId);
    const consumer = await createUserSpecificConsumer();
    console.log('[WebSocket Frontend] Consumer created, creating UserChannel subscription...');

    const subscription = consumer.subscriptions.create(
      { channel: 'UserChannel' },
      {
        connected() {
          // Called when the subscription is ready for use on the server
          console.log('[WebSocket Frontend] User Channel CONNECTED successfully for user:', userId);
        },
        disconnected() {
          // Called when the subscription has been terminated by the server
          console.log('[WebSocket Frontend] User Channel DISCONNECTED for user:', userId);
        },
        received(data) {
          // Called when there's incoming data on the websocket for this channel
          const camelizedData = camelizeResponse(data);
          console.log('[WebSocket Frontend] Data received on UserChannel:', camelizedData);
          userPushProcessor.process(camelizedData);
        },
        rejected() {
          console.error('[WebSocket Frontend] User Channel REJECTED - Authentication failed for user:', userId);
        },
      },
    );

    console.log('[WebSocket Frontend] UserChannel subscription created successfully');
    return { consumer, subscription };
  } catch (error) {
    console.error('[WebSocket Frontend] Failed to create user channel for user:', userId, 'Error:', error);
    throw error;
  }
};
