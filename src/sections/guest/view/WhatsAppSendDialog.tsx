import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  TextField,
  RadioGroup,
  Radio,
  FormControlLabel,
  Divider,
} from '@mui/material';
import { Iconify } from 'src/components/iconify/iconify';

type WhatsAppTemplateSample = {
  templateName: string;
  title?: string;
  category?: string;
  description?: string;
  expectedVariableCount?: number;
  buttonUrlVariableIndex?: number;
  sampleParametersArray?: string[];
  sampleParameters?: Record<string, string>;
  supportsMediaHeader?: boolean;
  variableLabels?: Record<number, string>;
  lockedVariableIndexes?: number[];
};

type DialogGuest = {
  id: string;
  phone?: string;
  createdAtRaw?: string;
};

interface WhatsAppSendDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (
    templateName: string,
    templateVariables?: Record<string, string> | null,
    redirectUrl?: string | null,
    guestIds?: string[] | null
  ) => void;
  guestCount: number;
  loading: boolean;
  templateSamples?: WhatsAppTemplateSample[];
  // Full guest list (for date-range filtering) + checkbox-selected ids.
  guests?: DialogGuest[];
  selectedGuestIds?: string[];
}

const normalizeTemplateVariables = (value: any): Record<string, string> | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;

  const normalized = Object.entries(raw).reduce<Record<string, string>>((acc, [key, entry]) => {
    const index = Number.parseInt(key, 10);
    if (!Number.isInteger(index) || index <= 0) return acc;

    const trimmed = typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim();
    if (!trimmed) return acc;

    acc[String(index)] = trimmed;
    return acc;
  }, {});

  return Object.keys(normalized).length ? normalized : null;
};

// Variables that are automatically populated per template (locked from frontend)
const LOCKED_VARIABLES: Record<string, number[]> = {
  wedding_invite: [2, 10, 11],
  rsvp_followup: [1, 6],
  rsvp_party: [2, 7, 8, 9],
  rsvp_wedding: [2, 9, 10, 11],
  rsvp_form: [2, 7, 8],
  event_details_reminder: [1],
  logistics: [1],
};

const VARIABLE_LABELS: Record<string, Record<number, string>> = {
  event_details_reminder: {
    1: 'Guest Name (auto)',
    2: 'Event Title',
    3: 'Venue',
    4: 'Date',
    5: 'Time',
  },
  rsvp_followup: {
    1: 'Guest Name (auto)',
    2: 'Event Title',
    3: 'Venue',
    4: 'Date',
    5: 'Time',
    6: 'QR Pass URL (auto)',
  },
  logistics: {
    1: 'Guest Name (auto)',
    2: 'Event Title',
  },
  wedding_invite: {
    1: 'Event Title',
    2: 'Guest Name (auto)',
    3: "Couple's Family Name",
    4: 'Event Type (e.g. Church Wedding)',
    5: "Couple's Names",
    6: 'Ceremony Label (e.g. Church Ceremony)',
    7: 'Date',
    8: 'Time',
    9: 'Venue',
    10: 'Invitation Image (auto)',
    11: 'QR Pass ID (auto)',
  },
  rsvp_wedding: {
    1: 'Event Title',
    2: 'Guest Name (auto)',
    3: "Couple's Family Name",
    4: 'Event Type (e.g. Traditional Wedding)',
    5: "Couple's Names",
    6: 'Date',
    7: 'Time',
    8: 'Venue',
    9: 'Invitation Image (auto)',
    10: 'RSVP Yes Link (auto)',
    11: 'RSVP No Link (auto)',
  },
  rsvp_party: {
    1: 'Event Title',
    2: 'Guest Name (auto)',
    3: 'Event Title',
    4: 'Date',
    5: 'Time',
    6: 'Venue',
    7: 'Invitation Image (auto)',
    8: 'RSVP Yes Link (auto)',
    9: 'RSVP No Link (auto)',
  },
  rsvp_form: {
    1: 'Event Title',
    2: 'Guest Name (auto)',
    3: 'Event Title',
    4: 'Date',
    5: 'Time',
    6: 'Venue',
    7: 'Invitation Image (auto)',
    8: 'RSVP Form Link (auto)',
  },
};

const FALLBACK_TEMPLATE_SAMPLES: WhatsAppTemplateSample[] = [
  {
    templateName: 'wedding_invite',
    title: 'Wedding Invite',
    category: 'marketing',
    description: 'Wedding invitation with event IV as header image. Variables 2 (guest name), 10 (header image), and 11 (pass URL) are set automatically.',
    expectedVariableCount: 11,
    buttonUrlVariableIndex: 11,
    sampleParametersArray: [
      "Judith's Wedding",
      '(auto: guest name)',
      'Family of Judith',
      "Judith's Wedding",
      'Judith & Stanley',
      'Church Ceremony',
      '20th July 2026',
      '4:00 PM',
      'Landmark Event Centre, Lagos',
      '(auto: event image S3 path)',
      '(auto: pass URL suffix)',
    ],
    supportsMediaHeader: false,
  },
  {
    templateName: 'event_details_reminder',
    title: 'Event Reminder',
    category: 'utility',
    description: 'Event reminder template. Variable 1 (guest name) is set automatically.',
    expectedVariableCount: 5,
    buttonUrlVariableIndex: 0,
    sampleParametersArray: [
      '(auto: guest name)',
      "Judith's Wedding",
      'Lagos State',
      '20th July 2026',
      '4:00 PM',
    ],
    supportsMediaHeader: false,
  },
  {
    templateName: 'logistics',
    title: 'Logistics',
    category: 'utility',
    description: 'Utility template for logistics/support information. Variable 1 (guest name) is set automatically.',
    expectedVariableCount: 2,
    buttonUrlVariableIndex: 0,
    sampleParametersArray: ['(auto: guest name)', "Judith's Wedding"],
    supportsMediaHeader: false,
  },
  {
    templateName: 'rsvp_form',
    title: 'RSVP Form (Media + Form Button)',
    category: 'utility',
    description: 'Party invitation with media header and RSVP form button. Guest name ({{2}}), header image ({{7}}), and form link ({{8}}) are auto-filled.',
    expectedVariableCount: 8,
    buttonUrlVariableIndex: 8,
    sampleParametersArray: [
      "Stanley's Party",
      '(auto: guest name)',
      "Stanley's Party",
      '20th July 2026',
      '4:00 PM',
      'Landmark Event Centre, Lagos',
      '(auto: event image S3 path)',
      '(auto: RSVP form link)',
    ],
    supportsMediaHeader: true,
  },
];

export default function WhatsAppSendDialog({
  open,
  onClose,
  onConfirm,
  guestCount,
  loading,
  templateSamples = [],
  guests = [],
  selectedGuestIds = [],
}: WhatsAppSendDialogProps) {
  const availableTemplates = useMemo(
    () => (templateSamples.length ? templateSamples : FALLBACK_TEMPLATE_SAMPLES),
    [templateSamples]
  );
  const [templateName, setTemplateName] = useState('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [redirectUrl, setRedirectUrl] = useState('');

  // Recipient targeting: all / checkbox-selected / created-date range.
  const [recipientMode, setRecipientMode] = useState<'all' | 'selected' | 'date'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Reset targeting each time the dialog opens. Default to "selected" when
  // the admin already ticked guests in the table, otherwise "all".
  useEffect(() => {
    if (!open) return;
    setRecipientMode(selectedGuestIds.length > 0 ? 'selected' : 'all');
    setDateFrom('');
    setDateTo('');
  }, [open, selectedGuestIds.length]);

  const guestsWithPhone = useMemo(
    () => guests.filter((g) => !!(g.phone && g.phone.trim())),
    [guests]
  );

  // Guests whose createdAt falls within the chosen range (inclusive).
  const dateFilteredIds = useMemo(() => {
    if (!dateFrom && !dateTo) return [];
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : -Infinity;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : Infinity;
    return guestsWithPhone
      .filter((g) => {
        if (!g.createdAtRaw) return false;
        const ts = new Date(g.createdAtRaw).getTime();
        return Number.isFinite(ts) && ts >= fromTs && ts <= toTs;
      })
      .map((g) => g.id);
  }, [guestsWithPhone, dateFrom, dateTo]);

  // Effective recipient ids — null means "all guests" (backend default).
  const effectiveGuestIds = useMemo<string[] | null>(() => {
    if (recipientMode === 'selected') return selectedGuestIds;
    if (recipientMode === 'date') return dateFilteredIds;
    return null;
  }, [recipientMode, selectedGuestIds, dateFilteredIds]);

  const effectiveCount =
    recipientMode === 'all' ? guestCount : effectiveGuestIds?.length || 0;

  useEffect(() => {
    if (!availableTemplates.length) return;
    setTemplateName((current) => {
      if (current && availableTemplates.some((item) => item.templateName === current)) {
        return current;
      }
      return availableTemplates[0].templateName;
    });
  }, [availableTemplates, open]);

  useEffect(() => {
    // Avoid leaking overrides across different templates.
    setTemplateVariables({});
    setRedirectUrl('');
  }, [templateName, open]);

  const selectedTemplate = useMemo(
    () => availableTemplates.find((item) => item.templateName === templateName) || null,
    [availableTemplates, templateName]
  );

  const handleConfirm = () => {
    if (!templateName) return;
    if (recipientMode !== 'all' && effectiveCount === 0) return;
    const trimmedRedirectUrl = redirectUrl.trim() || null;
    onConfirm(
      templateName,
      normalizeTemplateVariables(templateVariables),
      trimmedRedirectUrl,
      effectiveGuestIds
    );
  };

  // DB-stored templates carry their own lockedVariableIndexes + variableLabels
  // from the backend, so new templates work without code changes here.
  const lockedVariables = useMemo(
    () =>
      selectedTemplate?.lockedVariableIndexes &&
      selectedTemplate.lockedVariableIndexes.length > 0
        ? selectedTemplate.lockedVariableIndexes
        : LOCKED_VARIABLES[templateName] || [],
    [selectedTemplate, templateName]
  );
  const variableLabels = useMemo(
    () =>
      selectedTemplate?.variableLabels &&
      Object.keys(selectedTemplate.variableLabels).length > 0
        ? selectedTemplate.variableLabels
        : VARIABLE_LABELS[templateName] || {},
    [selectedTemplate, templateName]
  );

  const templateVariableCount = useMemo(() => {
    if (!selectedTemplate) return 0;
    return Math.max(
      Number(selectedTemplate.expectedVariableCount || 0) || 0,
      selectedTemplate.sampleParametersArray?.length || 0
    );
  }, [selectedTemplate]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Iconify icon="logos:whatsapp-icon" />
          Send WhatsApp Messages
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert
          severity={recipientMode !== 'all' && effectiveCount === 0 ? 'warning' : 'info'}
          sx={{ mb: 2 }}
        >
          {recipientMode === 'all' &&
            `You are about to send WhatsApp messages to all ${guestCount} guests with phone numbers.`}
          {recipientMode === 'selected' &&
            `You are about to send WhatsApp messages to ${effectiveCount} selected guest${
              effectiveCount === 1 ? '' : 's'
            }.`}
          {recipientMode === 'date' &&
            (effectiveCount > 0
              ? `You are about to send WhatsApp messages to ${effectiveCount} guest${
                  effectiveCount === 1 ? '' : 's'
                } added in the selected date range.`
              : 'No guests with phone numbers fall within the selected date range.')}
        </Alert>

        {/* RECIPIENTS */}
        <Divider textAlign="left" sx={{ mb: 1 }}>
          <Typography variant="overline" color="text.secondary">
            Recipients
          </Typography>
        </Divider>
        <FormControl fullWidth>
          <RadioGroup
            value={recipientMode}
            onChange={(e) => setRecipientMode(e.target.value as 'all' | 'selected' | 'date')}
          >
            <FormControlLabel
              value="all"
              control={<Radio size="small" />}
              label={`All guests with phone (${guestCount})`}
            />
            <FormControlLabel
              value="selected"
              control={<Radio size="small" />}
              disabled={selectedGuestIds.length === 0}
              label={
                selectedGuestIds.length > 0
                  ? `Selected guests (${selectedGuestIds.length})`
                  : 'Selected guests (tick guests in the table first)'
              }
            />
            <FormControlLabel
              value="date"
              control={<Radio size="small" />}
              label="Guests added within a date range"
            />
          </RadioGroup>
        </FormControl>

        {recipientMode === 'date' && (
          <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 1 }}>
            <TextField
              type="date"
              label="From"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <TextField
              type="date"
              label="To"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </Box>
        )}

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Message Template</InputLabel>
          <Select
            value={templateName}
            label="Message Template"
            onChange={(e) => setTemplateName(e.target.value)}
          >
            {availableTemplates.map((template) => (
              <MenuItem key={template.templateName} value={template.templateName}>
                {template.title || template.templateName}
                {template.category ? ` (${template.category})` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedTemplate && (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              {selectedTemplate.title || selectedTemplate.templateName}
            </Typography>
            {selectedTemplate.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {selectedTemplate.description}
              </Typography>
            )}
            <Typography variant="caption" display="block" color="text.secondary">
              Expected variables: {selectedTemplate.expectedVariableCount || 'N/A'}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              CTA URL variable index: {selectedTemplate.buttonUrlVariableIndex || 'N/A'}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              Header media support: {selectedTemplate.supportsMediaHeader ? 'Yes' : 'No'}
            </Typography>
            {selectedTemplate.sampleParametersArray?.length ? (
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                Variable preview:{' '}
                {selectedTemplate.sampleParametersArray
                  .map((value, index) => `{{${index + 1}}}=${value}`)
                  .join(' | ')}
              </Typography>
            ) : null}
          </Box>
        )}

        {selectedTemplate && templateVariableCount > 0 && (
          <Box
            sx={{
              mt: 2,
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Template Variable Overrides
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Leave fields blank to use automatic values from guest + event data. Only filled fields
              will override the backend mapping.
            </Typography>
            <Grid container spacing={2}>
              {Array.from({ length: templateVariableCount }).map((_, idx) => {
                const varIndex = idx + 1;
                const key = String(varIndex);
                const isLocked = lockedVariables.includes(varIndex);
                const sampleValue = selectedTemplate.sampleParametersArray?.[idx] || '';
                const currentValue = templateVariables[key] || '';
                const descriptiveLabel = variableLabels[varIndex];
                return (
                  <Grid item xs={12} md={6} key={key}>
                    <TextField
                      label={`{{${varIndex}}} — ${descriptiveLabel || (isLocked ? 'auto' : 'editable')}`}
                      value={isLocked ? sampleValue : currentValue}
                      placeholder={sampleValue || (descriptiveLabel ? `Enter ${descriptiveLabel}` : '')}
                      helperText={
                        isLocked
                          ? 'Auto-filled — cannot be overridden'
                          : descriptiveLabel
                            ? `Fill in: ${descriptiveLabel}`
                            : sampleValue
                              ? `e.g. ${sampleValue}`
                              : undefined
                      }
                      fullWidth
                      disabled={isLocked}
                      onChange={(event) => {
                        if (isLocked) return;
                        const raw = event.target.value;
                        setTemplateVariables((prev) => ({ ...prev, [key]: raw }));
                      }}
                      sx={isLocked ? { opacity: 0.6 } : {}}
                    />
                  </Grid>
                );
              })}
            </Grid>
            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                variant="outlined"
                disabled={Object.keys(templateVariables).length === 0}
                onClick={() => setTemplateVariables({})}
              >
                Clear Overrides
              </Button>
            </Box>
          </Box>
        )}

        {templateName === 'rsvp_form' && (
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Optional Redirect URL"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              fullWidth
              placeholder="https://example.com/my-form"
              helperText="If filled, clicking RSVP HERE will redirect to this URL after loading the auto-generated form link."
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={loading || (recipientMode !== 'all' && effectiveCount === 0)}
          sx={{
            bgcolor: '#25D366',
            '&:hover': { bgcolor: '#128C7E' },
          }}
        >
          {loading
            ? 'Sending...'
            : `Send to ${effectiveCount} Guest${effectiveCount === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
