import { useMemo, useState, type DragEvent } from 'react';
import {
  Autocomplete,
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

export type MessageAudience =
  | 'all'
  | 'responders'
  | 'yes'
  | 'no'
  | 'pending'
  | 'pending-and-no'
  | 'tag';

export type MessageChannelConfig = {
  enabled: boolean;
  templateId?: string;
  templateVariables?: Record<string, string>;
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
    targetTag: string;
  };
  raw?: any;
};

export type WhatsAppTemplateOption = {
  id: string;
  name: string;
  displayName?: string;
  category?: string;
};

export type WhatsAppTemplateSample = {
  templateName: string;
  title?: string;
  category?: string;
  description?: string;
  expectedVariableCount?: number;
  buttonUrlVariableIndex?: number;
  bodySkeleton?: string;
  supportsMediaHeader?: boolean;
  sampleParametersArray?: string[];
  sampleParameters?: Record<string, string>;
};

type BuilderProps = {
  value: MessageSequenceItem[];
  onChange: (next: MessageSequenceItem[]) => void;
  allowWhatsApp: boolean;
  allowSms: boolean;
  availableTags?: string[];
  whatsappTemplateOptions?: WhatsAppTemplateOption[];
  whatsappTemplateSamples?: WhatsAppTemplateSample[];
  disabled?: boolean;
};

export const AUDIENCE_OPTIONS: { label: string; value: MessageAudience }[] = [
  { label: 'All Guests', value: 'all' },
  { label: 'Responded (Yes/No)', value: 'responders' },
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
  { label: 'Pending', value: 'pending' },
  { label: 'Pending and No', value: 'pending-and-no' },
  { label: 'Specific Tag', value: 'tag' },
];

const normalizeTagValue = (value: any) => String(value || '').replace(/\s+/g, ' ').trim();

export const normalizeMessageAudience = (value: any): MessageAudience => {
  if (value === 'non-responders') return 'pending';
  if (value === 'pending-no' || value === 'pending_and_no') return 'pending-and-no';
  if (AUDIENCE_OPTIONS.some((option) => option.value === value)) {
    return value as MessageAudience;
  }
  return 'all';
};

export const getMessageAudienceLabel = (value: any, targetTag?: string | null) => {
  const normalizedAudience = normalizeMessageAudience(value);
  if (normalizedAudience === 'tag') {
    const trimmedTag = normalizeTagValue(targetTag);
    return trimmedTag ? `Tag: ${trimmedTag}` : 'Specific Tag';
  }
  return (
    AUDIENCE_OPTIONS.find((option) => option.value === normalizedAudience)?.label || 'All Guests'
  );
};

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
  templateVariables:
    channel?.templateVariables && typeof channel.templateVariables === 'object'
      ? channel.templateVariables
      : undefined,
});

const normalizeTemplateVariables = (value: any): Record<string, string> | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;

  const normalized = Object.entries(raw).reduce<Record<string, string>>(
    (acc, [key, entry]) => {
      const index = Number.parseInt(key, 10);
      if (!Number.isInteger(index) || index <= 0) return acc;

      const trimmed =
        typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim();
      if (!trimmed) return acc;

      acc[String(index)] = trimmed;
      return acc;
    },
    {},
  );

  return Object.keys(normalized).length ? normalized : undefined;
};

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
        audienceType: normalizeMessageAudience(raw.conditions?.audienceType),
        targetTag:
          normalizeMessageAudience(raw.conditions?.audienceType) === 'tag'
            ? normalizeTagValue(raw.conditions?.targetTag)
            : '',
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
    conditions: { audienceType, targetTag: '' },
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
    const normalizedWhatsAppTemplateVariables = normalizeTemplateVariables(
      item.channels.whatsapp?.templateVariables
    );
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
          ...(normalizedWhatsAppTemplateVariables
            ? { templateVariables: normalizedWhatsAppTemplateVariables }
            : {}),
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
        targetTag:
          item.conditions.audienceType === 'tag'
            ? normalizeTagValue(item.conditions.targetTag) || null
            : null,
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
  availableTags = [],
  whatsappTemplateOptions = [],
  whatsappTemplateSamples = [],
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
      conditions: { audienceType: 'all', targetTag: '' },
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
        ? "Set per-step date, title, and body. For WhatsApp steps, SoftInvites sends approved template variables (not arbitrary body text), header media must be a public image URL (PNG/JPG/WEBP/GIF), and you can pick a WhatsApp template per step. Email is always enabled; toggle WhatsApp/SMS per step."
        : 'Set per-step date, title, and body. Attachment is optional (PNG/JPG/PDF). Email is always enabled.',
    [allowWhatsApp, allowSms]
  );
  const tagOptions = useMemo(() => {
    const deduped = new Map<string, string>();
    availableTags.forEach((tag) => {
      const normalizedTag = normalizeTagValue(tag);
      if (!normalizedTag) return;
      const key = normalizedTag.toLowerCase();
      if (!deduped.has(key)) {
        deduped.set(key, normalizedTag);
      }
    });
    return [...deduped.values()].sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' })
    );
  }, [availableTags]);
  const tagHelperText = useMemo(() => {
    if (!tagOptions.length) {
      return 'Only guests with the matching tag will receive the message.';
    }
    const preview = tagOptions.slice(0, 4).join(', ');
    return tagOptions.length > 4
      ? `Select an existing tag or type one. Current tags: ${preview} +${tagOptions.length - 4} more`
      : `Select an existing tag or type one. Current tags: ${preview}`;
  }, [tagOptions]);
  const normalizedWhatsAppTemplateOptions = useMemo(() => {
    const deduped = new Map<string, WhatsAppTemplateOption>();
    whatsappTemplateOptions.forEach((option) => {
      const id = String(option?.id || '').trim();
      const name = String(option?.name || '').trim();
      if (!id || !name || deduped.has(id)) return;
      deduped.set(id, {
        id,
        name,
        displayName: String(option?.displayName || '').trim() || name,
        category: String(option?.category || '').trim() || undefined,
      });
    });
    return [...deduped.values()].sort((left, right) =>
      (left.displayName || left.name).localeCompare(right.displayName || right.name, undefined, {
        sensitivity: 'base',
      })
    );
  }, [whatsappTemplateOptions]);
  const whatsappTemplateOptionMap = useMemo(
    () => new Map(normalizedWhatsAppTemplateOptions.map((option) => [option.id, option])),
    [normalizedWhatsAppTemplateOptions]
  );
  const whatsappTemplateSampleMap = useMemo(() => {
    const map = new Map<string, WhatsAppTemplateSample>();
    (whatsappTemplateSamples || []).forEach((sample) => {
      const templateName = String(sample?.templateName || '').trim();
      if (!templateName || map.has(templateName)) return;
      map.set(templateName, sample);
    });
    return map;
  }, [whatsappTemplateSamples]);

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
          (() => {
            const selectedTemplateId = String(item.channels.whatsapp.templateId || '').trim();
            const selectedTemplateOption = selectedTemplateId
              ? whatsappTemplateOptionMap.get(selectedTemplateId)
              : null;
            const selectedTemplateName = String(selectedTemplateOption?.name || '').trim();
            const selectedTemplateSample = selectedTemplateName
              ? whatsappTemplateSampleMap.get(selectedTemplateName)
              : undefined;
            const templateVariableCount = Math.max(
              Number(selectedTemplateSample?.expectedVariableCount || 0) || 0,
              selectedTemplateSample?.sampleParametersArray?.length || 0
            );
            const attachmentAccept =
              allowWhatsApp && item.channels.whatsapp.enabled
                ? '.png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif'
                : '.png,.jpg,.jpeg,.webp,.gif,.pdf,image/png,image/jpeg,image/webp,image/gif,application/pdf';

            const templateVariablesPreview = selectedTemplateSample?.sampleParameters
              ? Object.entries(selectedTemplateSample.sampleParameters)
                  .map(([key, templateValue]) => `${key}: ${templateValue}`)
                  .join('\n')
              : '';

            const currentTemplateVariables = normalizeTemplateVariables(
              item.channels.whatsapp.templateVariables
            );

            return (
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
                                targetTag:
                                  event.target.value === 'tag' ? entry.conditions.targetTag : '',
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
                {item.conditions.audienceType === 'tag' && (
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      freeSolo
                      fullWidth
                      options={tagOptions}
                      value={item.conditions.targetTag}
                      inputValue={item.conditions.targetTag}
                      onChange={(_, newValue) => {
                        const nextTag = normalizeTagValue(
                          typeof newValue === 'string' ? newValue : newValue || ''
                        );
                        const next = value.map((entry, idx) =>
                          idx === index
                            ? {
                                ...entry,
                                conditions: {
                                  ...entry.conditions,
                                  targetTag: nextTag,
                                },
                              }
                            : entry
                        );
                        onChange(next);
                      }}
                      onInputChange={(_, newInputValue) => {
                        const next = value.map((entry, idx) =>
                          idx === index
                            ? {
                                ...entry,
                                conditions: {
                                  ...entry.conditions,
                                  targetTag: newInputValue,
                                },
                              }
                            : entry
                        );
                        onChange(next);
                      }}
                      disabled={disabled}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Recipient Tag"
                          helperText={tagHelperText}
                          fullWidth
                        />
                      )}
                    />
                  </Grid>
                )}
              </Grid>

              <TextField
                label="Email / SMS Message Body"
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
                helperText={
                  allowWhatsApp && item.channels.whatsapp.enabled
                    ? 'WhatsApp ignores this field and uses the selected template variables.'
                    : undefined
                }
              />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <Button component="label" variant="outlined" disabled={disabled}>
                  Attach File
                  <input
                    hidden
                    type="file"
                    accept={attachmentAccept}
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

              {allowWhatsApp && (
                <TextField
                  select
                  label="WhatsApp Template"
                  value={item.channels.whatsapp.templateId || ''}
                  onChange={(event) => {
                    const nextTemplateId = String(event.target.value || '').trim();
                    const next = value.map((entry, idx) =>
                      idx === index
                        ? {
                            ...entry,
                            channels: {
                              ...entry.channels,
                              whatsapp: {
                                ...entry.channels.whatsapp,
                                templateId: nextTemplateId || undefined,
                              },
                            },
                          }
                        : entry
                    );
                    onChange(next);
                  }}
                  disabled={disabled || !item.channels.whatsapp.enabled}
                  helperText={
                    item.channels.whatsapp.enabled
                      ? 'Pick a template for this step, or leave Default to use backend default.'
                      : 'Enable WhatsApp for this step to choose a template.'
                  }
                  fullWidth
                >
                  <MenuItem value="">Default Template (Backend Config)</MenuItem>
                  {(() => {
                    const selectedTemplateMissing =
                      selectedTemplateId && !whatsappTemplateOptionMap.has(selectedTemplateId);
                    const options = selectedTemplateMissing
                      ? [
                          {
                            id: selectedTemplateId,
                            name: selectedTemplateId,
                            displayName: `Selected template (unavailable): ${selectedTemplateId}`,
                          },
                          ...normalizedWhatsAppTemplateOptions,
                        ]
                      : normalizedWhatsAppTemplateOptions;

                    return options.map((templateOption) => (
                      <MenuItem key={templateOption.id} value={templateOption.id}>
                        {templateOption.displayName || templateOption.name}
                        {templateOption.category ? ` (${templateOption.category})` : ''}
                      </MenuItem>
                    ));
                  })()}
                </TextField>
              )}

              {allowWhatsApp &&
                item.channels.whatsapp.enabled &&
                selectedTemplateSample &&
                selectedTemplateName && (
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 2,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">
                        WhatsApp Template Preview: {selectedTemplateSample.title || selectedTemplateName}
                      </Typography>
                      {selectedTemplateSample.bodySkeleton && (
                        <Typography variant="body2" color="text.secondary">
                          {selectedTemplateSample.bodySkeleton}
                        </Typography>
                      )}
                      {templateVariablesPreview && (
                        <TextField
                          label="Sample {{n}} map"
                          value={templateVariablesPreview}
                          InputProps={{ readOnly: true }}
                          multiline
                          minRows={4}
                          fullWidth
                        />
                      )}
                      {templateVariableCount > 0 && (
                        <Box
                          sx={{
                            mt: 1,
                            border: '1px dashed',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 2,
                          }}
                        >
                          <Stack spacing={1}>
                            <Typography variant="subtitle2">Template Variable Overrides</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Leave fields blank to use automatic values from guest + event data.
                              Only filled fields will override the backend mapping.
                            </Typography>
                            <Grid container spacing={2}>
                              {Array.from({ length: templateVariableCount }).map((_, idx) => {
                                const varIndex = idx + 1;
                                const key = String(varIndex);
                                const sampleValue =
                                  selectedTemplateSample.sampleParametersArray?.[idx] || '';
                                const currentValue = currentTemplateVariables?.[key] || '';

                                return (
                                  <Grid item xs={12} md={6} key={key}>
                                    <TextField
                                      label={`{{${varIndex}}}`}
                                      value={currentValue}
                                      placeholder={sampleValue}
                                      helperText={sampleValue ? `Sample: ${sampleValue}` : undefined}
                                      fullWidth
                                      disabled={disabled}
                                      onChange={(event) => {
                                        const nextRawValue = event.target.value;
                                        const trimmed = String(nextRawValue || '').trim();
                                        const next = value.map((entry, entryIndex) => {
                                          if (entryIndex !== index) return entry;
                                          const prevVars = normalizeTemplateVariables(
                                            entry.channels.whatsapp.templateVariables
                                          );
                                          const nextVars: Record<string, string> = prevVars
                                            ? { ...prevVars }
                                            : {};
                                          if (!trimmed) {
                                            delete nextVars[key];
                                          } else {
                                            nextVars[key] = trimmed;
                                          }
                                          return {
                                            ...entry,
                                            channels: {
                                              ...entry.channels,
                                              whatsapp: {
                                                ...entry.channels.whatsapp,
                                                templateVariables:
                                                  Object.keys(nextVars).length > 0 ? nextVars : undefined,
                                              },
                                            },
                                          };
                                        });
                                        onChange(next);
                                      }}
                                    />
                                  </Grid>
                                );
                              })}
                            </Grid>
                            <Box>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={disabled || !currentTemplateVariables}
                                onClick={() => {
                                  const next = value.map((entry, entryIndex) =>
                                    entryIndex === index
                                      ? {
                                          ...entry,
                                          channels: {
                                            ...entry.channels,
                                            whatsapp: {
                                              ...entry.channels.whatsapp,
                                              templateVariables: undefined,
                                            },
                                          },
                                        }
                                      : entry
                                  );
                                  onChange(next);
                                }}
                              >
                                Clear Overrides
                              </Button>
                            </Box>
                          </Stack>
                        </Box>
                      )}
                      {selectedTemplateSample.supportsMediaHeader && (
                        <Typography variant="caption" color="text.secondary">
                          This template supports a media header. SoftInvites uses the event IV image by default (or the step image attachment if provided).
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                )}

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
            );
          })()
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
