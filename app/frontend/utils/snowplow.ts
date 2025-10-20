/**
 * Snowplow Analytics Integration
 *
 * This integrates with BC Government's centralized Snowplow infrastructure
 * Collector: spm.apps.gov.bc.ca
 */

import { newTracker, trackPageView, trackStructEvent, enableActivityTracking } from '@snowplow/browser-tracker';
import { LinkClickTrackingPlugin, enableLinkClickTracking } from '@snowplow/browser-plugin-link-click-tracking';
import { FormTrackingPlugin, enableFormTracking } from '@snowplow/browser-plugin-form-tracking';

// BC Gov Snowplow collector endpoint URL
const BC_GOV_COLLECTOR = 'https://spm.apps.gov.bc.ca';

// Your application identifier
const APP_ID = 'Snowplow_standalone';

// Tracker namespace
const TRACKER_NAMESPACE = 'rt';

/**
 * Initialize Snowplow tracker with BC Gov configuration
 * Call this once when your app loads
 */
export const initializeSnowplow = () => {
  try {
    newTracker(TRACKER_NAMESPACE, BC_GOV_COLLECTOR, {
      // Application identification
      appId: APP_ID,
      platform: 'web',

      // Cookie configuration
      cookieLifetime: 86400 * 548, // ~1.5 years
      cookieDomain: undefined, // Auto-detect domain
      cookieSameSite: 'Lax',

      // Context tracking
      contexts: {
        webPage: true,
      },

      // Privacy settings
      respectDoNotTrack: true, // Respect browser DNT setting
      anonymousTracking: false, // We want to track users (anonymously via cookies)

      // State storage
      stateStorageStrategy: 'cookieAndLocalStorage',

      // Session tracking
      sessionCookieTimeout: 1800, // 30 minutes

      // Plugins
      plugins: [LinkClickTrackingPlugin(), FormTrackingPlugin()],
    });

    // Enable automatic activity tracking
    // Tracks user engagement (heartbeat every 30 seconds while active)
    enableActivityTracking({
      minimumVisitLength: 30, // Start tracking after 30 seconds
      heartbeatDelay: 30, // Ping every 30 seconds
    });

    // Enable automatic link click tracking
    // Tracks clicks on all <a> elements
    enableLinkClickTracking();

    // Enable automatic form tracking
    // Tracks form submissions, focus, and change events
    enableFormTracking();
  } catch (error) {
    console.error('Failed to initialize Snowplow:', error);
  }
};

/**
 * Track a page view event
 */
export const trackPageViewEvent = (title?: string) => {
  try {
    trackPageView({
      title: title || document.title,
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
};

export const trackEvent = (category: string, action: string, label?: string, property?: string, value?: number) => {
  try {
    trackStructEvent({
      category,
      action,
      label,
      property,
      value,
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

export const trackApplicationStatusChange = (applicationId: string, oldStatus: string, newStatus: string) => {
  trackEvent('applications', 'status_change', `${oldStatus}_to_${newStatus}`, applicationId);
};

export const trackUserLogin = (userRole: string) => {
  trackEvent('authentication', 'login', userRole);
};

export const trackUserLogout = () => {
  trackEvent('authentication', 'logout');
};

export const trackSearchQuery = (searchTerm: string, resultCount: number) => {
  trackEvent('search', 'query', searchTerm, undefined, resultCount);
};

export const trackFormValidationError = (formName: string, fieldName: string) => {
  trackEvent('forms', 'validation_error', formName, fieldName);
};
