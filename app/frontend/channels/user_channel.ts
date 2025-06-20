import { createConsumer } from '@anycable/web';
import { IRootStore } from '../stores/root-store';
import { camelizeResponse } from '../utils';
import { UserPushProcessor } from './processors/user_push_processor';

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
      throw new Error(`Failed to fetch WebSocket token: HTTP ${response.status}`);
    }

    const data = await response.json();
    const finalUrl = `${BASE_WEBSOCKET_URL}?token=${encodeURIComponent(data.token)}`;
    return createConsumer(finalUrl);
  } catch (error) {
    console.error('Failed to create authenticated WebSocket consumer:', error);
    throw new Error('Failed to create WebSocket consumer due to authentication error');
  }
};

export const createUserChannelConsumer = async (userId: string, rootStore: IRootStore) => {
  const userPushProcessor = new UserPushProcessor(rootStore);
  try {
    const consumer = await createUserSpecificConsumer();
    const subscription = consumer.subscriptions.create(
      { channel: 'UserChannel', userId },
      {
        connected() {
          // Called when the subscription is ready for use on the server
          import.meta.env.DEV && console.log('User Channel CONNECTED');
        },
        disconnected() {
          // Called when the subscription has been terminated by the server
          import.meta.env.DEV && console.log('User Channel DISCONNECTED');
        },
        received(data) {
          // Called when there's incoming data on the websocket for this channel
          const camelizedData = camelizeResponse(data);
          import.meta.env.DEV && console.log('[DEV] DATA', camelizedData);
          userPushProcessor.process(camelizedData);
        },
        rejected() {
          import.meta.env.DEV && console.error('User Channel REJECTED - check authentication');
        },
      },
    );
    return { consumer, subscription };
  } catch (error) {
    console.error('Failed to create user channel:', error);
    throw error;
  }
};
