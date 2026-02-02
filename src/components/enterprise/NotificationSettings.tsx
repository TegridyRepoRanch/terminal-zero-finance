// Notification Settings Component
// Configure multi-channel alert delivery

import React, { useState, useEffect } from 'react';
import {
  notificationService,
  type NotificationPreferences,
  type NotificationType,
  type NotificationPriority,
} from '../../lib/notification-service';

// ============================================================================
// TYPES
// ============================================================================

interface NotificationSettingsProps {
  onSave?: (preferences: NotificationPreferences) => void;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  onSave,
  className,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    notificationService.getPreferences()
  );
  const [activeTab, setActiveTab] = useState<'channels' | 'filters' | 'test'>('channels');
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    // Load preferences from localStorage
    const saved = localStorage.getItem('notification_preferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences(parsed);
        notificationService.setPreferences(parsed);
      } catch (e) {
        console.error('Failed to load notification preferences:', e);
      }
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Save to localStorage
      localStorage.setItem('notification_preferences', JSON.stringify(preferences));

      // Update service
      notificationService.setPreferences(preferences);

      // Callback
      onSave?.(preferences);
    } catch (e) {
      console.error('Failed to save preferences:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setTestResult(null);

    try {
      const notification = await notificationService.notify(
        'custom',
        'Test Notification',
        'This is a test notification from Terminal Zero Finance.',
        { priority: 'medium' }
      );

      setTestResult(`✅ Test notification sent (ID: ${notification.id})`);
    } catch (e) {
      setTestResult(`❌ Test failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const updateChannel = (
    channel: keyof NotificationPreferences['channels'],
    updates: Partial<NotificationPreferences['channels'][typeof channel]>
  ) => {
    setPreferences({
      ...preferences,
      channels: {
        ...preferences.channels,
        [channel]: {
          ...preferences.channels[channel],
          ...updates,
        },
      },
    });
  };

  const updateFilters = (updates: Partial<NotificationPreferences['filters']>) => {
    setPreferences({
      ...preferences,
      filters: {
        ...preferences.filters,
        ...updates,
      },
    });
  };

  return (
    <div className={className} style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            🔔 Notification Settings
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            Configure how you receive alerts
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px',
      }}>
        {(['channels', 'filters', 'test'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 20px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === tab ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'channels' ? '📡 Channels' : tab === 'filters' ? '🎯 Filters' : '🧪 Test'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {activeTab === 'channels' && (
          <ChannelsTab
            preferences={preferences}
            updateChannel={updateChannel}
          />
        )}

        {activeTab === 'filters' && (
          <FiltersTab
            preferences={preferences}
            updateFilters={updateFilters}
          />
        )}

        {activeTab === 'test' && (
          <TestTab
            onTest={handleTestNotification}
            testResult={testResult}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// TAB COMPONENTS
// ============================================================================

const ChannelsTab: React.FC<{
  preferences: NotificationPreferences;
  updateChannel: (channel: keyof NotificationPreferences['channels'], updates: any) => void;
}> = ({ preferences, updateChannel }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
    {/* Email */}
    <ChannelCard
      title="📧 Email"
      description="Receive alerts via email"
      enabled={preferences.channels.email?.enabled || false}
      onToggle={(enabled) => updateChannel('email', { enabled })}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <InputField
          label="Email Address"
          type="email"
          value={preferences.channels.email?.address || ''}
          onChange={(address) => updateChannel('email', { address })}
          placeholder="your@email.com"
        />
        <SelectField
          label="Digest Mode"
          value={preferences.channels.email?.digestMode || 'instant'}
          onChange={(digestMode) => updateChannel('email', { digestMode })}
          options={[
            { value: 'instant', label: 'Instant (each alert)' },
            { value: 'hourly', label: 'Hourly digest' },
            { value: 'daily', label: 'Daily digest' },
          ]}
        />
      </div>
    </ChannelCard>

    {/* Webhook */}
    <ChannelCard
      title="🔗 Webhook"
      description="Send alerts to your custom endpoint"
      enabled={preferences.channels.webhook?.enabled || false}
      onToggle={(enabled) => updateChannel('webhook', { enabled })}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <InputField
          label="Webhook URL"
          type="url"
          value={preferences.channels.webhook?.url || ''}
          onChange={(url) => updateChannel('webhook', { url })}
          placeholder="https://your-webhook.com/endpoint"
        />
        <InputField
          label="Secret (for HMAC signature)"
          type="password"
          value={preferences.channels.webhook?.secret || ''}
          onChange={(secret) => updateChannel('webhook', { secret })}
          placeholder="Optional secret for signing requests"
        />
      </div>
    </ChannelCard>

    {/* Slack */}
    <ChannelCard
      title="💬 Slack"
      description="Send alerts to a Slack channel"
      enabled={preferences.channels.slack?.enabled || false}
      onToggle={(enabled) => updateChannel('slack', { enabled })}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <InputField
          label="Webhook URL"
          type="url"
          value={preferences.channels.slack?.webhookUrl || ''}
          onChange={(webhookUrl) => updateChannel('slack', { webhookUrl })}
          placeholder="https://hooks.slack.com/services/..."
        />
        <InputField
          label="Channel (optional)"
          type="text"
          value={preferences.channels.slack?.channel || ''}
          onChange={(channel) => updateChannel('slack', { channel })}
          placeholder="#alerts"
        />
      </div>
    </ChannelCard>

    {/* In-App */}
    <ChannelCard
      title="🔔 In-App"
      description="Show alerts in the application"
      enabled={preferences.channels.inApp?.enabled || true}
      onToggle={(enabled) => updateChannel('inApp', { enabled })}
    >
      <p style={{ fontSize: '13px', color: '#6b7280' }}>
        In-app notifications appear in the alert panel and notification center.
      </p>
    </ChannelCard>
  </div>
);

const FiltersTab: React.FC<{
  preferences: NotificationPreferences;
  updateFilters: (updates: Partial<NotificationPreferences['filters']>) => void;
}> = ({ preferences, updateFilters }) => {
  const notificationTypes: { value: NotificationType; label: string }[] = [
    { value: 'sec_filing', label: 'SEC Filings' },
    { value: 'earnings_alert', label: 'Earnings Analysis' },
    { value: 'price_alert', label: 'Price Alerts' },
    { value: 'theme_detected', label: 'Theme Detection' },
    { value: 'insider_activity', label: 'Insider Activity' },
    { value: 'analyst_rating', label: 'Analyst Ratings' },
  ];

  const priorityLevels: { value: NotificationPriority; label: string }[] = [
    { value: 'critical', label: 'Critical only' },
    { value: 'high', label: 'High and above' },
    { value: 'medium', label: 'Medium and above' },
    { value: 'low', label: 'All notifications' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Priority Filter */}
      <div style={{
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
      }}>
        <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>
          Minimum Priority
        </label>
        <select
          value={preferences.filters.minPriority}
          onChange={(e) => updateFilters({ minPriority: e.target.value as NotificationPriority })}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
          }}
        >
          {priorityLevels.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Notification Types */}
      <div style={{
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
      }}>
        <label style={{ display: 'block', fontWeight: '500', marginBottom: '12px' }}>
          Notification Types
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notificationTypes.map((type) => (
            <label key={type.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={preferences.filters.types.includes(type.value)}
                onChange={(e) => {
                  const types = e.target.checked
                    ? [...preferences.filters.types, type.value]
                    : preferences.filters.types.filter(t => t !== type.value);
                  updateFilters({ types });
                }}
              />
              <span style={{ fontSize: '14px' }}>{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Ticker Filter */}
      <div style={{
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
      }}>
        <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>
          Filter by Tickers (optional)
        </label>
        <input
          type="text"
          value={preferences.filters.tickers?.join(', ') || ''}
          onChange={(e) => {
            const tickers = e.target.value
              .split(',')
              .map(t => t.trim().toUpperCase())
              .filter(t => t.length > 0);
            updateFilters({ tickers: tickers.length > 0 ? tickers : undefined });
          }}
          placeholder="AAPL, MSFT, GOOGL (leave empty for all)"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
          }}
        />
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
          Only receive notifications for these tickers. Leave empty for all.
        </p>
      </div>
    </div>
  );
};

const TestTab: React.FC<{
  onTest: () => void;
  testResult: string | null;
}> = ({ onTest, testResult }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '40px 20px',
  }}>
    <div style={{ textAlign: 'center' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
        Test Your Configuration
      </h3>
      <p style={{ fontSize: '14px', color: '#6b7280' }}>
        Send a test notification to verify your settings are working correctly.
      </p>
    </div>

    <button
      onClick={onTest}
      style={{
        padding: '12px 24px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
      }}
    >
      🧪 Send Test Notification
    </button>

    {testResult && (
      <div style={{
        padding: '12px 16px',
        backgroundColor: testResult.startsWith('✅') ? '#d1fae5' : '#fee2e2',
        color: testResult.startsWith('✅') ? '#065f46' : '#991b1b',
        borderRadius: '8px',
        fontSize: '14px',
      }}>
        {testResult}
      </div>
    )}
  </div>
);

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const ChannelCard: React.FC<{
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}> = ({ title, description, enabled, onToggle, children }) => (
  <div style={{
    border: `1px solid ${enabled ? '#3b82f6' : '#e5e7eb'}`,
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: enabled ? '#eff6ff' : 'white',
    transition: 'all 0.15s',
  }}>
    <div style={{
      padding: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: enabled ? '1px solid #bfdbfe' : 'none',
    }}>
      <div>
        <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>{title}</h4>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{description}</p>
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span style={{
          position: 'absolute',
          cursor: 'pointer',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: enabled ? '#3b82f6' : '#d1d5db',
          borderRadius: '24px',
          transition: 'background-color 0.15s',
        }}>
          <span style={{
            position: 'absolute',
            content: '',
            height: '18px',
            width: '18px',
            left: enabled ? '27px' : '3px',
            bottom: '3px',
            backgroundColor: 'white',
            borderRadius: '50%',
            transition: 'left 0.15s',
          }} />
        </span>
      </label>
    </div>
    {enabled && (
      <div style={{ padding: '16px' }}>
        {children}
      </div>
    )}
  </div>
);

const InputField: React.FC<{
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ label, type, value, onChange, placeholder }) => (
  <div>
    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
      }}
    />
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <div>
    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export default NotificationSettings;
