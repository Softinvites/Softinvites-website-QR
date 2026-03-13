import { useMemo, useState, type DragEvent } from 'react';
import {
  Box,
  Button,
  Card,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  FormControlLabel,
  Stack,
  Switch,
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

export type MessageAttachmentConfig = {
  url?: string;
  filename?: string;
  contentType?: string;
  file?: File | null;
};

export type MessageSequenceItem = {
  trackingId: string;
  messageName: string;
  messageTitle: string;
  messageBody: string;
  scheduledDate: string; // datetime-local format
  includeResponseButtons: boolean;
  attachment: MessageAttachmentConfig;
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

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateTimeLocalValue = (value: string | Date | null | undefined): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

const toIsoDate = (value: string): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const addDaysToDateTimeLocal = (value: string, days: number) => {
  const base = value ? new Date(value) : new Date();
  if (Number.isNaN(base.getTime())) {
    return toDateTimeLocalValue(new Date(Date.now() + days * DAY_MS));
  }
  base.setTime(base.getTime() + days * DAY_MS);
  return toDateTimeLocalValue(base);
};

const defaultScheduledDate = (offsetDays: number) =>
  toDateTimeLocalValue(new Date(Date.now() + offsetDays * DAY_MS));

const getAttachmentDisplayName = (attachment: MessageAttachmentConfig) => {
  if (attachment.file?.name) return attachment.file.name;
  if (attachment.filename) return attachment.filename;
  if (attachment.url) {
    try {
      const parsed = new URL(attachment.url);
      const tail = parsed.pathname.split('/').pop() || '';
      return tail ? decodeURIComponent(tail) : attachment.url;
    } catch {
      return attachment.url;
    }
  }
  return '';
};

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
    const legacyOffset = Number(raw.dayOffset ?? Number.NaN);
    const fallbackDate =
      !Number.isNaN(legacyOffset) && Number.isFinite(legacyOffset)
        ? new Date(Date.now() + legacyOffset * DAY_MS)
        : null;
    const normalizedTitle = raw.messageTitle || raw.messageName || raw.messageType || 'Message';
    const attachment: MessageAttachmentConfig = {
      url: typeof raw.attachment?.url === 'string' ? raw.attachment.url : '',
      filename: typeof raw.attachment?.filename === 'string' ? raw.attachment.filename : '',
      contentType:
        typeof raw.attachment?.contentType === 'string'
          ? raw.attachment.contentType
          : '',
      file: null,
    };
    return {
      trackingId: raw.trackingId || raw.id || createTrackingId(),
      messageName: raw.messageName || raw.messageType || normalizedTitle,
      messageTitle: normalizedTitle,
      messageBody: typeof raw.messageBody === 'string' ? raw.messageBody : '',
      scheduledDate: toDateTimeLocalValue(raw.scheduledDate || fallbackDate),
      includeResponseButtons: raw.includeResponseButtons !== false,
      attachment,
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
  const buildItem = (
    messageName: string,
    offsetDays: number,
    audienceType: MessageAudience,
    channelOverrides?: Partial<MessageSequenceItem['channels']>,
    includeResponseButtons = true
  ): MessageSequenceItem => ({
    trackingId: createTrackingId(),
    messageName,
    messageTitle: messageName,
    messageBody: '',
    scheduledDate: defaultScheduledDate(offsetDays),
    includeResponseButtons,
    attachment: {
      url: '',
      filename: '',
      contentType: '',
      file: null,
    },
    channels: {
      email: { enabled: true, ...(channelOverrides?.email || {}) },
      whatsapp: {
        enabled:
          channelOverrides?.whatsapp?.enabled !== undefined
            ? !!channelOverrides.whatsapp.enabled
            : allowWhatsApp,
        ...(channelOverrides?.whatsapp || {}),
      },
      bulkSms: {
        enabled:
          channelOverrides?.bulkSms?.enabled !== undefined
            ? !!channelOverrides.bulkSms.enabled
            : allowSms,
        ...(channelOverrides?.bulkSms || {}),
      },
    },
    conditions: { audienceType },
  });

  if (servicePackage === 'invitation-only') return [];
  return [
    buildItem('Initial Invitation', 1, 'all'),
    buildItem('Event Details', 4, 'all', { bulkSms: { enabled: false } }),
    buildItem('Reminder', 7, 'pending', { bulkSms: { enabled: false } }),
    buildItem('Follow Up', 14, 'pending', { bulkSms: { enabled: false } }),
    buildItem('Last Call', 21, 'pending', { whatsapp: { enabled: false } }),
    buildItem('Final Logistics', 28, 'all', { bulkSms: { enabled: false } }),
    buildItem('Post Event Thanks', 31, 'responders', {
      whatsapp: { enabled: false },
      bulkSms: { enabled: false },
    }, false),
  ];
};

export const serializeMessageSequence = (
  items: MessageSequenceItem[],
  allowWhatsApp: boolean,
  allowSms: boolean
) =>
  items.map((item) => {
    const raw = item.raw && typeof item.raw === 'object' ? { ...item.raw } : {};
    const attachmentFile = item.attachment?.file || null;
    const uploadKey = attachmentFile ? `sequenceAttachment_${item.trackingId}` : '';
    const attachmentUrl =
      typeof item.attachment?.url === 'string' ? item.attachment.url.trim() : '';
    const attachment =
      attachmentFile
        ? {
            uploadKey,
            filename: attachmentFile.name,
            ...(attachmentFile.type ? { contentType: attachmentFile.type } : {}),
          }
        : attachmentUrl.length > 0
        ? {
            url: attachmentUrl,
            ...(item.attachment.filename?.trim()
              ? { filename: item.attachment.filename.trim() }
              : {}),
            ...(item.attachment.contentType?.trim()
              ? { contentType: item.attachment.contentType.trim() }
              : {}),
          }
        : null;

    return {
      ...raw,
      trackingId: item.trackingId || raw.trackingId,
      messageName: item.messageName,
      messageTitle: item.messageTitle,
      messageBody: item.messageBody,
      scheduledDate: toIsoDate(item.scheduledDate),
      includeResponseButtons: item.includeResponseButtons,
      attachment,
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

export const collectSequenceAttachmentFiles = (items: MessageSequenceItem[]) =>
  items
    .map((item) => {
      const file = item.attachment?.file || null;
      if (!file) return null;
      return {
        fieldName: `sequenceAttachment_${item.trackingId}`,
        file,
      };
    })
    .filter(Boolean) as Array<{ fieldName: string; file: File }>;

export function MessageSequenceBuilder({
  value,
  onChange,
  allowWhatsApp,
  allowSms,
  disabled,
}: BuilderProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete-step' | 'clear-attachment';
    trackingId: string;
  } | null>(null);

  const handleAdd = () => {
    const nextScheduledDate = value.length
      ? addDaysToDateTimeLocal(value[value.length - 1].scheduledDate, 3)
      : defaultScheduledDate(1);
    const nextItem: MessageSequenceItem = {
      trackingId: createTrackingId(),
      messageName: `Message ${value.length + 1}`,
      messageTitle: `Message ${value.length + 1}`,
      messageBody: '',
      scheduledDate: nextScheduledDate,
      includeResponseButtons: true,
      attachment: {
        url: '',
        filename: '',
        contentType: '',
        file: null,
      },
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

  const requestDeleteStep = (trackingId: string) => {
    setConfirmAction({ type: 'delete-step', trackingId });
  };

  const requestClearAttachment = (trackingId: string) => {
    setConfirmAction({ type: 'clear-attachment', trackingId });
  };

  const closeConfirmDialog = () => {
    setConfirmAction(null);
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    const targetIndex = value.findIndex((item) => item.trackingId === confirmAction.trackingId);
    if (targetIndex < 0) {
      setConfirmAction(null);
      return;
    }

    if (confirmAction.type === 'delete-step') {
      handleRemove(targetIndex);
      setConfirmAction(null);
      return;
    }

    const next = value.map((entry, idx) =>
      idx === targetIndex
        ? {
            ...entry,
            attachment: {
              url: '',
              filename: '',
              contentType: '',
              file: null,
            },
          }
        : entry
    );
    onChange(next);
    setConfirmAction(null);
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
        ? 'Set per-step date, title, and body. Attachment is optional (PNG/JPG/PDF). Email is always enabled; toggle WhatsApp/SMS per step.'
        : 'Set per-step date, title, and body. Attachment is optional (PNG/JPG/PDF). Email is always enabled.',
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
                  onClick={() => requestDeleteStep(item.trackingId)}
                >
                  <Iconify icon="mdi:trash-can-outline" />
                </IconButton>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
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
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Message Title"
                    value={item.messageTitle}
                    onChange={(event) => {
                      const next = value.map((entry, idx) =>
                        idx === index ? { ...entry, messageTitle: event.target.value } : entry
                      );
                      onChange(next);
                    }}
                    fullWidth
                    disabled={disabled}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Scheduled Date & Time"
                    type="datetime-local"
                    value={item.scheduledDate}
                    onChange={(event) => {
                      const next = value.map((entry, idx) =>
                        idx === index ? { ...entry, scheduledDate: event.target.value } : entry
                      );
                      onChange(next);
                    }}
                    InputLabelProps={{ shrink: true }}
                    error={!item.scheduledDate}
                    helperText={!item.scheduledDate ? 'Required' : ''}
                    fullWidth
                    disabled={disabled}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    select
                    label="Audience"
                    value={item.conditions.audienceType}
                    onChange={(event) => {
                      const next = value.map((entry, idx) =>
                        idx === index
                          ? {
                              ...entry,
                              conditions: {
                                ...entry.conditions,
                                audienceType: event.target.value as MessageAudience,
                              },
                            }
                          : entry
                      );
                      onChange(next);
                    }}
                    fullWidth
                    disabled={disabled}
                  >
                    {AUDIENCE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <TextField
                label="Message Body"
                value={item.messageBody}
                onChange={(event) => {
                  const next = value.map((entry, idx) =>
                    idx === index ? { ...entry, messageBody: event.target.value } : entry
                  );
                  onChange(next);
                }}
                multiline
                minRows={3}
                fullWidth
                disabled={disabled}
              />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <Button component="label" variant="outlined" disabled={disabled}>
                  Attach File
                  <input
                    hidden
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0] || null;
                      if (!selectedFile) return;
                      const next = value.map((entry, idx) =>
                        idx === index
                          ? {
                              ...entry,
                              attachment: {
                                ...entry.attachment,
                                file: selectedFile,
                                filename: selectedFile.name,
                                contentType: selectedFile.type || '',
                                url: '',
                              },
                            }
                          : entry
                      );
                      onChange(next);
                    }}
                  />
                </Button>
                <TextField
                  label="Attached File"
                  value={getAttachmentDisplayName(item.attachment)}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  placeholder="No file selected"
                />
                {item.attachment.url && !item.attachment.file && (
                  <Button
                    variant="text"
                    onClick={() => window.open(item.attachment.url, '_blank')}
                  >
                    View Current
                  </Button>
                )}
                <Button
                  color="warning"
                  variant="text"
                  disabled={disabled}
                  onClick={() => requestClearAttachment(item.trackingId)}
                >
                  Clear
                </Button>
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

              <FormControlLabel
                control={
                  <Switch
                    checked={item.includeResponseButtons}
                    disabled={disabled}
                    onChange={(event) => {
                      const next = value.map((entry, idx) =>
                        idx === index
                          ? { ...entry, includeResponseButtons: event.target.checked }
                          : entry
                      );
                      onChange(next);
                    }}
                  />
                }
                label="Include 'Will you attend?' buttons in this message"
              />
            </Stack>
          </Box>
        ))}

        <Stack direction="row" justifyContent="flex-end">
          <Button variant="outlined" onClick={handleAdd} disabled={disabled || value.length >= 7}>
            Add Message
          </Button>
        </Stack>
      </Stack>

      <Dialog open={Boolean(confirmAction)} onClose={closeConfirmDialog}>
        <DialogTitle>
          {confirmAction?.type === 'delete-step' ? 'Delete this step?' : 'Clear attachment?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmAction?.type === 'delete-step'
              ? 'This will permanently remove this step from the sequence.'
              : 'This will remove the attached file from this step.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog}>Cancel</Button>
          <Button
            color={confirmAction?.type === 'delete-step' ? 'error' : 'warning'}
            variant="contained"
            onClick={handleConfirmAction}
          >
            {confirmAction?.type === 'delete-step' ? 'Delete' : 'Clear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
