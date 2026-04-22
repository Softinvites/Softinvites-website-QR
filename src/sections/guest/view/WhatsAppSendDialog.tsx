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
};

interface WhatsAppSendDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (templateName: string, templateVariables?: Record<string, string> | null) => void;
  guestCount: number;
  loading: boolean;
  templateSamples?: WhatsAppTemplateSample[];
}

const normalizeTemplateVariables = (value: any): Record<string, string> | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;

  const normalized = Object.entries(raw).reduce<Record<string, string>>(
    (acc, [key, entry]) => {
      const index = Number.parseInt(key, 10);
      if (!Number.isInteger(index) || index <= 0) return acc;

      const trimmed = typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim();
      if (!trimmed) return acc;

      acc[String(index)] = trimmed;
      return acc;
    },
    {},
  );

  return Object.keys(normalized).length ? normalized : null;
};

// Variables that are automatically populated per template (locked from frontend)
// For wedding_invite: variables 2 (guest name), 8 (media URL), and 9 (pass URL) are locked.
const LOCKED_VARIABLES: Record<string, number[]> = {
  wedding_invite: [2, 8, 9],
  rsvp_followup: [1, 6],
  event_details_reminder: [1],
  logistics: [1],
};

const FALLBACK_TEMPLATE_SAMPLES: WhatsAppTemplateSample[] = [
  {
    templateName: 'wedding_invite',
    title: 'Wedding Invite',
    category: 'marketing',
    description: 'Wedding invitation with media in body (variable 8). Variables 2 (guest name), 8 (media URL), and 9 (pass URL) are set automatically.',
    expectedVariableCount: 9,
    buttonUrlVariableIndex: 9,
    sampleParametersArray: [
      'Judith\'s Wedding',        // {{1}} frontend editable
      '(auto: guest name)',       // {{2}} locked
      'Family of Judith',         // {{3}} frontend editable
      'Judith\'s Wedding',        // {{4}} frontend editable
      '20th July 2026',           // {{5}} frontend editable
      '4:00 PM',                  // {{6}} frontend editable
      'Landmark Event Centre, Lagos', // {{7}} frontend editable
      '(auto: media URL)',        // {{8}} locked
      '(auto: pass URL)',         // {{9}} locked
    ],
    supportsMediaHeader: false, // Image is inside body, not in header
  },
  {
    templateName: 'event_details_reminder',
    title: 'Event Reminder',
    category: 'utility',
    description: 'Event reminder template. Variable 1 (guest name) is set automatically.',
    expectedVariableCount: 4,
    buttonUrlVariableIndex: 0,
    sampleParametersArray: ['(auto: guest name)', 'Judith\'s Wedding', 'Lagos State', '20th July 2026', '4:00 PM'],
    supportsMediaHeader: false,
  },
  {
    templateName: 'rsvp_followup',
    title: 'RSVP Follow-Up',
    category: 'utility',
    description: 'Follow-up template with a dynamic pass button. Variables 1 (guest name) and 6 (pass URL) are set automatically.',
    expectedVariableCount: 4,
    buttonUrlVariableIndex: 6,
    sampleParametersArray: ['(auto: guest name)', 'Judith\'s Wedding', 'Lagos', '20th July 2026', '4:00 PM', '(auto: pass URL)'],
    supportsMediaHeader: false,
  },
  {
    templateName: 'logistics',
    title: 'Logistics',
    category: 'utility',
    description: 'Utility template for logistics/support information. Variable 1 (guest name) is set automatically.',
    expectedVariableCount: 2,
    buttonUrlVariableIndex: 0,
    sampleParametersArray: ['(auto: guest name)', 'Judith\'s Wedding'],
    supportsMediaHeader: false,
  },
];

export default function WhatsAppSendDialog({
  open,
  onClose,
  onConfirm,
  guestCount,
  loading,
  templateSamples = [],
}: WhatsAppSendDialogProps) {
  const availableTemplates = useMemo(
    () => (templateSamples.length ? templateSamples : FALLBACK_TEMPLATE_SAMPLES),
    [templateSamples]
  );
  const [templateName, setTemplateName] = useState('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

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
  }, [templateName, open]);

  const selectedTemplate = useMemo(
    () => availableTemplates.find((item) => item.templateName === templateName) || null,
    [availableTemplates, templateName]
  );

  const handleConfirm = () => {
    if (!templateName) return;
    onConfirm(templateName, normalizeTemplateVariables(templateVariables));
  };

  const lockedVariables = useMemo(
    () => LOCKED_VARIABLES[templateName] || [],
    [templateName]
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
        <Alert severity="info" sx={{ mb: 2 }}>
          You are about to send WhatsApp messages to {guestCount} guests with phone numbers.
        </Alert>

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
                Variable preview:{" "}
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
                return (
                  <Grid item xs={12} md={6} key={key}>
                    <TextField
                      label={`{{${varIndex}}}${isLocked ? ' (auto)' : ''}`}
                      value={isLocked ? sampleValue : currentValue}
                      placeholder={isLocked ? sampleValue : sampleValue}
                      helperText={
                        isLocked
                          ? `Auto-filled from guest/event data`
                          : sampleValue
                            ? `Sample: ${sampleValue}`
                            : undefined
                      }
                      fullWidth
                      disabled={isLocked}
                      onChange={(event) => {
                        if (isLocked) return;
                        const trimmed = String(event.target.value || '').trim();
                        setTemplateVariables((prev) => {
                          const next = { ...prev };
                          if (!trimmed) {
                            delete next[key];
                          } else {
                            next[key] = trimmed;
                          }
                          return next;
                        });
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
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          disabled={loading}
          sx={{ 
            bgcolor: '#25D366', 
            '&:hover': { bgcolor: '#128C7E' } 
          }}
        >
          {loading ? 'Sending...' : `Send to ${guestCount} Guests`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}