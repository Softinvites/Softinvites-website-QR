import { useMemo, useState, type DragEvent } from 'react';
import {
  Box,
  Button,
  Card,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Iconify } from 'src/components/iconify';

export type MessageAudience = 'all' | 'responders' | 'yes' | 'no' | 'pending';

export type MessageChannelConfig = {
  enabled: boolean;
  templateId?: string;
};

export type MessageSequenceItem = {
  trackingId: string;
  messageName: string;
  dayOffset: number;
  channels: {
    email: MessageChannelConfig;
    whatsapp: MessageChannelConfig;
    bulkSms: MessageChannelConfig;
  };
  conditions: {
    audienceType: MessageAudience;
  };
  raw?: any;
};

type BuilderProps = {
  value: MessageSequenceItem[];
  onChange: (next: MessageSequenceItem[]) => void;
  allowWhatsApp: boolean;
  allowSms: boolean;
  disabled?: boolean;
};

const AUDIENCE_OPTIONS: { label: string; value: MessageAudience }[] = [
  { label: 'All Guests', value: 'all' },
  { label: 'Responded (Yes/No)', value: 'responders' },
  { label: 'Responded Yes', value: 'yes' },
  { label: 'Responded No', value: 'no' },
  { label: 'Pending', value: 'pending' },
];

const createTrackingId = () =>
  (globalThis.crypto && 'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

const normalizeChannel = (channel: any, fallbackEnabled = false): MessageChannelConfig => ({
  enabled: typeof channel?.enabled === 'boolean' ? channel.enabled : fallbackEnabled,
  templateId: channel?.templateId || undefined,
});

export const normalizeMessageSequence = (input: any): MessageSequenceItem[] => {
  let payload = input;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = [];
    }
  }
  if (!Array.isArray(payload)) return [];
  return payload.map((item) => {
    const raw = item || {};
    return {
      trackingId: raw.trackingId || raw.id || createTrackingId(),
      messageName: raw.messageName || raw.messageType || 'Message',
      dayOffset: Number(raw.dayOffset ?? 0),
      channels: {
        email: normalizeChannel(raw.channels?.email, true),
        whatsapp: normalizeChannel(raw.channels?.whatsapp, false),
        bulkSms: normalizeChannel(raw.channels?.bulkSms, false),
      },
      conditions: {
        audienceType: raw.conditions?.audienceType || 'all',
      },
      raw,
    };
  });
};

export const getDefaultMessageSequence = (
  servicePackage: string,
  allowWhatsApp: boolean,
  allowSms: boolean
): MessageSequenceItem[] => {
  if (servicePackage === 'invitation-only') return [];
  if (servicePackage === 'one-time-rsvp') {
    return [
      {
        trackingId: createTrackingId(),
        messageName: 'Initial RSVP Request',
        dayOffset: 1,
        channels: {
          email: { enabled: true },
          whatsapp: { enabled: false },
          bulkSms: { enabled: false },
        },
        conditions: { audienceType: 'all' },
      },
    ];
  }
  if (servicePackage === 'standard-rsvp') {
    return [
      {
        trackingId: createTrackingId(),
        messageName: 'Initial RSVP Request',
        dayOffset: 1,
        channels: {
          email: { enabled: true },
          whatsapp: { enabled: false },
          bulkSms: { enabled: false },
        },
        conditions: { audienceType: 'all' },
      },
      {
        trackingId: createTrackingId(),
        messageName: 'Reminder',
        dayOffset: 7,
        channels: {
          email: { enabled: true },
          whatsapp: { enabled: false },
          bulkSms: { enabled: false },
        },
        conditions: { audienceType: 'pending' },
      },
      {
        trackingId: createTrackingId(),
        messageName: 'Thank You',
        dayOffset: 30,
        channels: {
          email: { enabled: true },
          whatsapp: { enabled: false },
          bulkSms: { enabled: false },
        },
        conditions: { audienceType: 'responders' },
      },
    ];
  }
  return [
    {
      trackingId: createTrackingId(),
      messageName: 'Initial Invitation',
      dayOffset: 1,
      channels: {
        email: { enabled: true },
        whatsapp: { enabled: allowWhatsApp },
        bulkSms: { enabled: allowSms },
      },
      conditions: { audienceType: 'all' },
    },
    {
      trackingId: createTrackingId(),
      messageName: 'Event Details',
      dayOffset: 4,
      channels: {
        email: { enabled: true },
        whatsapp: { enabled: allowWhatsApp },
        bulkSms: { enabled: false },
      },
      conditions: { audienceType: 'all' },
    },
    {
      trackingId: createTrackingId(),
      messageName: 'RSVP Reminder',
      dayOffset: 7,
      channels: {
        email: { enabled: true },
        whatsapp: { enabled: allowWhatsApp },
        bulkSms: { enabled: false },
      },
      conditions: { audienceType: 'pending' },
    },
    {
      trackingId: createTrackingId(),
      messageName: 'Personal Follow-up',
      dayOffset: 14,
      channels: {
        email: { enabled: true },
        whatsapp: { enabled: allowWhatsApp },
        bulkSms: { enabled: false },
      },
      conditions: { audienceType: 'pending' },
    },
    {
      trackingId: createTrackingId(),
      messageName: 'Last Call',
      dayOffset: 21,
      channels: {
        email: { enabled: true },
        whatsapp: { enabled: false },
        bulkSms: { enabled: allowSms },
      },
      conditions: { audienceType: 'pending' },
    },
    {
      trackingId: createTrackingId(),
      messageName: 'Final Logistics',
      dayOffset: 28,
      channels: {
        email: { enabled: true },
        whatsapp: { enabled: allowWhatsApp },
        bulkSms: { enabled: false },
      },
      conditions: { audienceType: 'all' },
    },
  ];
};

export const serializeMessageSequence = (
  items: MessageSequenceItem[],
  allowWhatsApp: boolean,
  allowSms: boolean
) =>
  items.map((item) => {
    const raw = item.raw && typeof item.raw === 'object' ? { ...item.raw } : {};
    return {
      ...raw,
      trackingId: item.trackingId || raw.trackingId,
      messageName: item.messageName,
      dayOffset: item.dayOffset,
      channels: {
        email: {
          ...(raw.channels?.email || {}),
          enabled: true,
          templateId: item.channels.email?.templateId,
        },
        whatsapp: {
          ...(raw.channels?.whatsapp || {}),
          enabled: allowWhatsApp ? !!item.channels.whatsapp?.enabled : false,
          templateId: item.channels.whatsapp?.templateId,
        },
        bulkSms: {
          ...(raw.channels?.bulkSms || {}),
          enabled: allowSms ? !!item.channels.bulkSms?.enabled : false,
          templateId: item.channels.bulkSms?.templateId,
        },
      },
      conditions: {
        ...(raw.conditions || {}),
        audienceType: item.conditions.audienceType,
      },
    };
  });

export function MessageSequenceBuilder({
  value,
  onChange,
  allowWhatsApp,
  allowSms,
  disabled,
}: BuilderProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleAdd = () => {
    const nextItem: MessageSequenceItem = {
      trackingId: createTrackingId(),
      messageName: `Message ${value.length + 1}`,
      dayOffset: value.length ? value[value.length - 1].dayOffset + 3 : 1,
      channels: {
        email: { enabled: true },
        whatsapp: { enabled: allowWhatsApp },
        bulkSms: { enabled: allowSms },
      },
      conditions: { audienceType: 'all' },
    };
    const next: MessageSequenceItem[] = [...value, nextItem];
    onChange(next);
  };

  const handleRemove = (index: number) => {
    const next = value.filter((_, idx) => idx !== index);
    onChange(next);
  };

  const handleDragStart = (index: number) => (event: DragEvent<HTMLDivElement>) => {
    setDragIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (index: number) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const fromIndex = dragIndex ?? Number(event.dataTransfer.getData('text/plain'));
    if (Number.isNaN(fromIndex) || fromIndex === index) {
      setDragIndex(null);
      return;
    }
    const next = [...value];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(index, 0, moved);
    onChange(next);
    setDragIndex(null);
  };

  const handleDragEnd = () => setDragIndex(null);

  const helperText = useMemo(
    () =>
      allowWhatsApp || allowSms
        ? 'Email is always enabled. Toggle WhatsApp/SMS per message.'
        : 'Email is always enabled for every message.',
    [allowWhatsApp, allowSms]
  );

  return (
    <Card sx={{ p: 2, mt: 1 }}>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Drag cards to reorder the sequence. {helperText}
        </Typography>
        <Divider />

        {value.length === 0 && (
          <Box
            sx={{
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No messages yet. Add your first message to start building the sequence.
            </Typography>
          </Box>
        )}

        {value.map((item, index) => (
          <Box
            key={item.trackingId}
            draggable={!disabled}
            onDragStart={handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={handleDrop(index)}
            onDragEnd={handleDragEnd}
            sx={{
              border: '1px solid',
              borderColor: dragIndex === index ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 2,
              bgcolor: dragIndex === index ? 'action.hover' : 'background.paper',
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Tooltip title="Drag to reorder">
                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'grab' }}>
                      <Iconify icon="mdi:drag" width={20} />
                    </Box>
                  </Tooltip>
                  <Typography variant="subtitle2">Step {index + 1}</Typography>
                </Stack>
                <IconButton
                  size="small"
                  color="error"
                  disabled={disabled}
                  onClick={() => handleRemove(index)}
                >
                  <Iconify icon="mdi:trash-can-outline" />
                </IconButton>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Message Name"
                  value={item.messageName}
                  onChange={(event) => {
                    const next = value.map((entry, idx) =>
                      idx === index ? { ...entry, messageName: event.target.value } : entry
                    );
                    onChange(next);
                  }}
                  fullWidth
                  disabled={disabled}
                />
                <TextField
                  label="Day Offset"
                  type="number"
                  value={item.dayOffset}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    const next = value.map((entry, idx) =>
                      idx === index ? { ...entry, dayOffset: Number.isNaN(nextValue) ? 0 : nextValue } : entry
                    );
                    onChange(next);
                  }}
                  sx={{ width: { xs: '100%', md: 160 } }}
                  disabled={disabled}
                />
                <TextField
                  select
                  label="Audience"
                  value={item.conditions.audienceType}
                  onChange={(event) => {
                    const next = value.map((entry, idx) =>
                      idx === index
                        ? { ...entry, conditions: { ...entry.conditions, audienceType: event.target.value as MessageAudience } }
                        : entry
                    );
                    onChange(next);
                  }}
                  sx={{ width: { xs: '100%', md: 200 } }}
                  disabled={disabled}
                >
                  {AUDIENCE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Email"
                  value={item.channels.email.enabled ? 'Enabled' : 'Disabled'}
                  size="small"
                  InputProps={{ readOnly: true }}
                  sx={{ width: 140 }}
                />
                <TextField
                  label="WhatsApp"
                  value={
                    allowWhatsApp && item.channels.whatsapp.enabled ? 'Enabled' : 'Disabled'
                  }
                  size="small"
                  InputProps={{ readOnly: true }}
                  sx={{ width: 140 }}
                />
                <TextField
                  label="SMS"
                  value={allowSms && item.channels.bulkSms.enabled ? 'Enabled' : 'Disabled'}
                  size="small"
                  InputProps={{ readOnly: true }}
                  sx={{ width: 140 }}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Button
                  size="small"
                  variant={item.channels.whatsapp.enabled ? 'contained' : 'outlined'}
                  disabled={disabled || !allowWhatsApp}
                  onClick={() => {
                    const next = value.map((entry, idx) =>
                      idx === index
                        ? {
                            ...entry,
                            channels: {
                              ...entry.channels,
                              whatsapp: { ...entry.channels.whatsapp, enabled: !entry.channels.whatsapp.enabled },
                            },
                          }
                        : entry
                    );
                    onChange(next);
                  }}
                >
                  WhatsApp {item.channels.whatsapp.enabled ? 'On' : 'Off'}
                </Button>
                <Button
                  size="small"
                  variant={item.channels.bulkSms.enabled ? 'contained' : 'outlined'}
                  disabled={disabled || !allowSms}
                  onClick={() => {
                    const next = value.map((entry, idx) =>
                      idx === index
                        ? {
                            ...entry,
                            channels: {
                              ...entry.channels,
                              bulkSms: { ...entry.channels.bulkSms, enabled: !entry.channels.bulkSms.enabled },
                            },
                          }
                        : entry
                    );
                    onChange(next);
                  }}
                >
                  SMS {item.channels.bulkSms.enabled ? 'On' : 'Off'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        ))}

        <Stack direction="row" justifyContent="flex-end">
          <Button variant="outlined" onClick={handleAdd} disabled={disabled || value.length >= 7}>
            Add Message
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
