import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import InputAdornment from '@mui/material/InputAdornment';

import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify/iconify';
import { API_BASE } from 'src/utils/apiBase';

type AutoSource =
  | 'manual'
  | 'guest_name'
  | 'event_title'
  | 'event_date'
  | 'event_time'
  | 'event_venue'
  | 'event_signoff'
  | 'event_iv'
  | 'header_media_path'
  | 'qr_pass_url'
  | 'qr_pass_suffix'
  | 'rsvp_id_raw'
  | 'rsvp_yes_link'
  | 'rsvp_no_link'
  | 'rsvp_form_path';

type VariableDefinition = {
  index: number;
  label: string;
  autoSource: AutoSource | null;
  locked: boolean;
  defaultValue: string;
};

type TemplateType = 'text' | 'media' | 'card' | 'call-to-action' | 'quick-reply';
type HeaderType = 'none' | 'text' | 'media';
type ButtonType = 'URL' | 'QUICK_REPLY' | 'PHONE_NUMBER';

type TemplateButton = {
  type: ButtonType;
  title: string;
  url?: string;
  phone?: string;
};

type ContentTemplate = {
  _id: string;
  friendlyName: string;
  displayName?: string;
  description?: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  templateType?: TemplateType;
  headerType?: HeaderType;
  headerText?: string;
  headerMediaUrl?: string;
  bodyText: string;
  footerText?: string;
  buttons?: TemplateButton[];
  variables: Record<string, string>;
  variableDefinitions?: VariableDefinition[];
  supportsMediaHeader?: boolean;
  buttonUrlVariableIndex?: number;
  contentSid: string | null;
  approvalStatus:
    | 'unsubmitted'
    | 'pending'
    | 'received'
    | 'approved'
    | 'rejected'
    | 'failed';
  approvalRejectionReason: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
};

const AUTO_SOURCE_OPTIONS: { value: AutoSource; label: string }[] = [
  { value: 'manual', label: 'Manual (user input)' },
  { value: 'guest_name', label: 'Guest Name (auto)' },
  { value: 'event_title', label: 'Event Title (auto)' },
  { value: 'event_date', label: 'Event Date (auto)' },
  { value: 'event_time', label: 'Event Time (auto)' },
  { value: 'event_venue', label: 'Event Venue (auto)' },
  { value: 'event_signoff', label: 'Event Signoff (auto)' },
  { value: 'event_iv', label: 'Event IV / Image URL (auto)' },
  { value: 'header_media_path', label: 'Header Media S3 Path (auto)' },
  { value: 'qr_pass_url', label: 'QR Pass URL — full (auto)' },
  { value: 'qr_pass_suffix', label: 'QR Pass URL — suffix only (auto)' },
  { value: 'rsvp_id_raw', label: 'RSVP ID — raw (auto)' },
  { value: 'rsvp_yes_link', label: 'RSVP Yes Link (auto)' },
  { value: 'rsvp_no_link', label: 'RSVP No Link (auto)' },
  { value: 'rsvp_form_path', label: 'RSVP Form Path (auto)' },
];

const TEMPLATE_TYPE_OPTIONS: {
  value: TemplateType;
  label: string;
  hint: string;
}[] = [
  {
    value: 'card',
    label: 'WhatsApp Card',
    hint: 'Header (text or media) + body + footer + Go-to-website button. Recommended.',
  },
  { value: 'text', label: 'Text', hint: 'Body-only template.' },
  { value: 'media', label: 'Media', hint: 'Media header + body.' },
  {
    value: 'call-to-action',
    label: 'Call to Action',
    hint: 'Body + URL or phone buttons.',
  },
  {
    value: 'quick-reply',
    label: 'Quick Reply',
    hint: 'Body + tap-back reply buttons.',
  },
];

const CATEGORIES: ContentTemplate['category'][] = [
  'UTILITY',
  'MARKETING',
  'AUTHENTICATION',
];

const NAME_PATTERN = /^[a-z0-9_]{1,64}$/;

const collectVariableIndexes = (...sources: (string | undefined | null)[]) => {
  const found = new Set<number>();
  sources.forEach((src) => {
    if (!src) return;
    const re = /\{\{(\d+)\}\}/g;
    let m;
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(src)) !== null) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0) found.add(n);
    }
  });
  return [...found].sort((a, b) => a - b);
};

const statusColor = (s: ContentTemplate['approvalStatus']) => {
  switch (s) {
    case 'approved':
      return 'success';
    case 'rejected':
    case 'failed':
      return 'error';
    case 'pending':
    case 'received':
      return 'warning';
    default:
      return 'default';
  }
};

const blankVarDef = (index: number): VariableDefinition => ({
  index,
  label: '',
  autoSource: null,
  locked: false,
  defaultValue: '',
});

const WIZARD_STEPS = ['Basics', 'Build template', 'Sample values & Category'];

export function WhatsAppTemplatesView() {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContentTemplate | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<ContentTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentTemplate | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  // Wizard state
  const [activeStep, setActiveStep] = useState(0);
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [templateType, setTemplateType] = useState<TemplateType>('card');
  const [headerType, setHeaderType] = useState<HeaderType>('text');
  const [headerText, setHeaderText] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [body, setBody] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<TemplateButton[]>([
    { type: 'URL', title: '', url: '' },
  ]);
  const [category, setCategory] = useState<ContentTemplate['category']>('UTILITY');
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({});
  const [variableDefs, setVariableDefs] = useState<VariableDefinition[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Body textarea ref so the Insert variable button can splice {{N}} at cursor
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const token = localStorage.getItem('token');
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/content-templates`, {
        headers: authHeaders,
      });
      setTemplates(Array.isArray(res.data?.templates) ? res.data.templates : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Detect variables across body + header (text or media URL) + button URLs
  const detectedVars = useMemo(
    () =>
      collectVariableIndexes(
        body,
        headerType === 'text' ? headerText : '',
        headerType === 'media' ? headerMediaUrl : '',
        ...buttons.map((b) => b.url || '')
      ),
    [body, headerType, headerText, headerMediaUrl, buttons]
  );

  // Keep variableDefs and sampleValues synced with detected variables
  useEffect(() => {
    setVariableDefs((prev) => {
      const byIndex = new Map(prev.map((d) => [d.index, d]));
      return detectedVars.map((n) => byIndex.get(n) || blankVarDef(n));
    });
    setSampleValues((prev) => {
      const next: Record<string, string> = {};
      detectedVars.forEach((n) => {
        const k = String(n);
        next[k] = prev[k] || '';
      });
      return next;
    });
  }, [detectedVars]);

  const resetWizard = () => {
    setActiveStep(0);
    setName('');
    setDisplayName('');
    setDescription('');
    setLanguage('en');
    setTemplateType('card');
    setHeaderType('text');
    setHeaderText('');
    setHeaderMediaUrl('');
    setBody('');
    setFooterText('');
    setButtons([{ type: 'URL', title: '', url: '' }]);
    setCategory('UTILITY');
    setSampleValues({});
    setVariableDefs([]);
  };

  const openCreate = () => {
    resetWizard();
    setCreateOpen(true);
  };

  const insertVariableAtCursor = () => {
    const nextIndex = detectedVars.length > 0 ? Math.max(...detectedVars) + 1 : 1;
    const marker = `{{${nextIndex}}}`;
    const textarea = bodyRef.current;
    if (!textarea) {
      setBody((prev) => `${prev}${marker}`);
      return;
    }
    const start = textarea.selectionStart ?? body.length;
    const end = textarea.selectionEnd ?? body.length;
    const next = body.slice(0, start) + marker + body.slice(end);
    setBody(next);
    // restore caret after marker
    requestAnimationFrame(() => {
      if (!bodyRef.current) return;
      bodyRef.current.focus();
      const pos = start + marker.length;
      bodyRef.current.setSelectionRange(pos, pos);
    });
  };

  // ---------- Step 1 validation ----------
  const nameValid = NAME_PATTERN.test(name.trim());
  const step1Valid = nameValid && language.trim().length > 0;

  // ---------- Step 2 validation ----------
  const staticBodyChars = body
    .replace(/\{\{(\d+)\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim().length;
  const bodyVars = collectVariableIndexes(body);
  const tooDynamic =
    bodyVars.length > 0 && staticBodyChars < bodyVars.length * 3;
  const hasVarGap = detectedVars.some((n, i) => n !== i + 1);

  const step2HeaderValid = (() => {
    if (templateType === 'card') {
      if (headerType === 'text') return headerText.trim().length > 0;
      if (headerType === 'media') return headerMediaUrl.trim().length > 0;
      return true;
    }
    if (templateType === 'media') return headerMediaUrl.trim().length > 0;
    return true;
  })();

  const step2ButtonsValid = (() => {
    if (templateType === 'call-to-action' || templateType === 'card') {
      // For card with a button, the button must be complete if any is present
      const nonEmpty = buttons.filter((b) => b.title.trim() || b.url?.trim() || b.phone?.trim());
      if (nonEmpty.length === 0 && templateType === 'call-to-action') return false;
      return nonEmpty.every((b) => {
        if (!b.title.trim() || b.title.trim().length > 25) return false;
        if (b.type === 'URL') return !!b.url?.trim();
        if (b.type === 'PHONE_NUMBER') return !!b.phone?.trim();
        return true;
      });
    }
    if (templateType === 'quick-reply') {
      const nonEmpty = buttons.filter((b) => b.title.trim());
      return nonEmpty.length > 0 && nonEmpty.every((b) => b.title.trim().length <= 25);
    }
    return true;
  })();

  const step2Valid =
    body.trim().length >= 3 &&
    !tooDynamic &&
    !hasVarGap &&
    step2HeaderValid &&
    step2ButtonsValid;

  // ---------- Step 3 validation ----------
  const step3Valid = detectedVars.every((n) =>
    (sampleValues[String(n)] || '').trim().length > 0
  );

  // ---------- Wizard transitions ----------
  const handleNext = () => {
    if (activeStep === 0 && !step1Valid) {
      toast.error('Fix the highlighted fields before continuing.');
      return;
    }
    if (activeStep === 1 && !step2Valid) {
      toast.error('Fix the template build issues before continuing.');
      return;
    }
    setActiveStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0));

  // ---------- Submit ----------
  const handleSubmit = async () => {
    if (!step3Valid) {
      toast.error('Provide a sample value for every variable.');
      return;
    }
    setSubmitting(true);
    try {
      const cleanButtons = buttons
        .filter((b) => b.title.trim() || b.url?.trim() || b.phone?.trim())
        .map((b) => ({
          type: b.type,
          title: b.title.trim(),
          url: b.type === 'URL' ? (b.url || '').trim() : undefined,
          phone:
            b.type === 'PHONE_NUMBER' ? (b.phone || '').trim() : undefined,
        }));

      const payload = {
        friendlyName: name.trim().toLowerCase(),
        displayName: displayName.trim(),
        description: description.trim(),
        language: language.trim(),
        category,
        templateType,
        headerType: templateType === 'card' ? headerType : templateType === 'media' ? 'media' : 'none',
        headerText: headerType === 'text' ? headerText : '',
        headerMediaUrl: ['card', 'media'].includes(templateType) && (templateType === 'media' || headerType === 'media') ? headerMediaUrl : '',
        bodyText: body,
        footerText,
        buttons: cleanButtons,
        sampleVariables: sampleValues,
        variableDefinitions: variableDefs.map((d) => ({
          ...d,
          autoSource:
            d.autoSource === 'manual' || !d.autoSource ? null : d.autoSource,
        })),
      };

      const res = await axios.post(`${API_BASE}/content-templates`, payload, {
        headers: authHeaders,
      });
      if (res.data?.approvalError) {
        toast.warning(
          `Template created on Twilio, but approval submission failed: ${res.data.approvalError}. Click the paper-plane icon in the list to retry.`
        );
      } else {
        toast.success(
          'Template created on Twilio and submitted for approval. Refresh status from the list when ready.'
        );
      }
      setCreateOpen(false);
      resetWizard();
      loadTemplates();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Failed to create template'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Edit metadata only ----------
  const [editVarDefs, setEditVarDefs] = useState<VariableDefinition[]>([]);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<ContentTemplate['category']>('UTILITY');

  const openEdit = (t: ContentTemplate) => {
    setEditTarget(t);
    setEditDisplayName(t.displayName || '');
    setEditDescription(t.description || '');
    setEditCategory(t.category);
    const detected = collectVariableIndexes(
      t.bodyText,
      t.headerType === 'text' ? t.headerText : '',
      ...(t.buttons || []).map((b) => b.url || '')
    );
    const existing = new Map(
      (t.variableDefinitions || []).map((d) => [d.index, d])
    );
    setEditVarDefs(detected.map((n) => existing.get(n) || blankVarDef(n)));
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await axios.put(
        `${API_BASE}/content-templates/${editTarget._id}`,
        {
          displayName: editDisplayName.trim(),
          description: editDescription.trim(),
          category: editCategory,
          variableDefinitions: editVarDefs.map((d) => ({
            ...d,
            autoSource:
              d.autoSource === 'manual' || !d.autoSource ? null : d.autoSource,
          })),
        },
        { headers: authHeaders }
      );
      toast.success('Template updated.');
      setEditOpen(false);
      setEditTarget(null);
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitApproval = async (t: ContentTemplate) => {
    setRowBusy(t._id);
    try {
      await axios.post(
        `${API_BASE}/content-templates/${t._id}/submit`,
        {},
        { headers: authHeaders }
      );
      toast.success(`Submitted "${t.friendlyName}" for approval.`);
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit for approval');
    } finally {
      setRowBusy(null);
    }
  };

  const handleRefresh = async (t: ContentTemplate) => {
    setRowBusy(t._id);
    try {
      await axios.post(
        `${API_BASE}/content-templates/${t._id}/refresh-status`,
        {},
        { headers: authHeaders }
      );
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to refresh status');
    } finally {
      setRowBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setRowBusy(deleteTarget._id);
    try {
      await axios.delete(`${API_BASE}/content-templates/${deleteTarget._id}`, {
        headers: authHeaders,
      });
      toast.success('Template deleted.');
      setDeleteTarget(null);
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete template');
    } finally {
      setRowBusy(null);
    }
  };

  const showButtonsSection =
    templateType === 'card' ||
    templateType === 'call-to-action' ||
    templateType === 'quick-reply';

  return (
    <DashboardContent>
      <Box display="flex" alignItems="center" mb={3}>
        <Typography variant="h4" flexGrow={1}>
          WhatsApp Templates
        </Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={openCreate}
          sx={{ backgroundColor: '#25D366', '&:hover': { backgroundColor: '#128C7E' } }}
        >
          New Template
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Templates created here are registered on Twilio and submitted for approval automatically.
        Once <strong>approved</strong>, a template appears in the message-sequence dropdown — variable
        labels, auto-fill rules, and locked vars sync without code changes.
      </Alert>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Body preview</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              )}
              {!loading && templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No templates yet. Click &quot;New Template&quot; to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                templates.map((t) => (
                  <TableRow key={t._id} hover>
                    <TableCell>
                      <Stack>
                        <Typography variant="body2" fontWeight={600}>
                          {t.displayName || t.friendlyName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t.friendlyName}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={t.templateType || 'text'} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={t.category} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.bodyText}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={statusColor(t.approvalStatus) as any}
                        label={t.approvalStatus}
                      />
                      {t.approvalRejectionReason && (
                        <Tooltip title={t.approvalRejectionReason}>
                          <Iconify
                            icon="solar:info-circle-bold"
                            style={{ marginLeft: 6, color: '#d32f2f' }}
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Preview">
                          <IconButton size="small" onClick={() => setPreviewTarget(t)}>
                            <Iconify icon="solar:eye-bold" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit metadata / variable settings">
                          <IconButton size="small" onClick={() => openEdit(t)}>
                            <Iconify icon="solar:pen-bold" />
                          </IconButton>
                        </Tooltip>
                        {t.approvalStatus === 'unsubmitted' && (
                          <Tooltip title="Submit for approval">
                            <IconButton
                              size="small"
                              color="primary"
                              disabled={rowBusy === t._id}
                              onClick={() => handleSubmitApproval(t)}
                            >
                              <Iconify icon="solar:paper-plane-bold" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(t.approvalStatus === 'pending' ||
                          t.approvalStatus === 'received') && (
                          <Tooltip title="Refresh status">
                            <IconButton
                              size="small"
                              disabled={rowBusy === t._id}
                              onClick={() => handleRefresh(t)}
                            >
                              <Iconify icon="solar:refresh-bold" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            disabled={rowBusy === t._id}
                            onClick={() => setDeleteTarget(t)}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* CREATE WIZARD */}
      <Dialog
        open={createOpen}
        onClose={() => !submitting && setCreateOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Create WhatsApp Template</DialogTitle>
        <DialogContent dividers>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {WIZARD_STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* STEP 1 — BASICS */}
          {activeStep === 0 && (
            <Stack spacing={2}>
              <TextField
                label="Template Name"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase())}
                error={!!name && !nameValid}
                helperText={
                  !name
                    ? 'Lowercase letters, numbers, underscores. e.g. booking_update_01'
                    : !nameValid
                      ? 'Invalid format — only [a-z0-9_], max 64 chars.'
                      : 'Looks good.'
                }
                fullWidth
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  fullWidth
                  helperText="Friendly title for the dashboard (optional)."
                />
                <TextField
                  select
                  label="Language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  sx={{ width: 220 }}
                >
                  {['en', 'en_US', 'en_GB', 'es', 'fr', 'pt_BR', 'de'].map((l) => (
                    <MenuItem key={l} value={l}>
                      {l}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <TextField
                label="Description (internal note)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />

              <FormControl>
                <FormLabel sx={{ mb: 1 }}>Template type</FormLabel>
                <RadioGroup
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                >
                  {TEMPLATE_TYPE_OPTIONS.map((opt) => (
                    <FormControlLabel
                      key={opt.value}
                      value={opt.value}
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {opt.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {opt.hint}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </Stack>
          )}

          {/* STEP 2 — BUILD */}
          {activeStep === 1 && (
            <Stack spacing={2.5}>
              {/* HEADER */}
              {(templateType === 'card' || templateType === 'media') && (
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Header
                  </Typography>
                  {templateType === 'card' && (
                    <FormControl sx={{ mb: 1.5 }}>
                      <RadioGroup
                        row
                        value={headerType}
                        onChange={(e) => setHeaderType(e.target.value as HeaderType)}
                      >
                        <FormControlLabel value="text" control={<Radio />} label="Text" />
                        <FormControlLabel value="media" control={<Radio />} label="Media" />
                        <FormControlLabel value="none" control={<Radio />} label="None" />
                      </RadioGroup>
                    </FormControl>
                  )}
                  {((templateType === 'card' && headerType === 'text')) && (
                    <TextField
                      label="Header text"
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      fullWidth
                      helperText="60 chars max. May contain a single {{N}}."
                      inputProps={{ maxLength: 60 }}
                    />
                  )}
                  {(templateType === 'media' ||
                    (templateType === 'card' && headerType === 'media')) && (
                    <TextField
                      label="Header media URL"
                      value={headerMediaUrl}
                      onChange={(e) => setHeaderMediaUrl(e.target.value)}
                      fullWidth
                      placeholder="https://your-bucket.s3.amazonaws.com/{{N}}"
                      helperText="Public HTTPS URL. Variables {{N}} are allowed in the path only — never in the domain (Twilio/Meta requirement). e.g. https://bucket.s3.../{{8}}"
                    />
                  )}
                </Box>
              )}

              {/* BODY */}
              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle1">Body</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Iconify icon="solar:add-circle-bold" />}
                    onClick={insertVariableAtCursor}
                  >
                    Add variable
                  </Button>
                </Stack>
                <TextField
                  inputRef={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  fullWidth
                  multiline
                  minRows={5}
                  placeholder="Hello {{1}}, your appointment is on {{2}}."
                  error={tooDynamic || hasVarGap}
                  helperText={
                    tooDynamic
                      ? 'Too dynamic — add more static text between variables.'
                      : hasVarGap
                        ? 'Variables must be sequential starting from {{1}}.'
                        : '1024 chars max. Use {{1}}, {{2}}, … or click Add variable.'
                  }
                  inputProps={{ maxLength: 1024 }}
                />
              </Box>

              {/* FOOTER (card only) */}
              {templateType === 'card' && (
                <TextField
                  label="Footer (optional)"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  fullWidth
                  inputProps={{ maxLength: 60 }}
                  helperText="60 chars max. Static — no variables."
                />
              )}

              {/* BUTTONS */}
              {showButtonsSection && (
                <Box>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle1">Buttons</Typography>
                    {(templateType === 'quick-reply' ||
                      templateType === 'call-to-action') && (
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<Iconify icon="mingcute:add-line" />}
                        onClick={() =>
                          setButtons((prev) => [
                            ...prev,
                            templateType === 'quick-reply'
                              ? { type: 'QUICK_REPLY', title: '' }
                              : { type: 'URL', title: '', url: '' },
                          ])
                        }
                        disabled={buttons.length >= 3}
                      >
                        Add button
                      </Button>
                    )}
                  </Stack>
                  <Stack spacing={2}>
                    {buttons.map((b, idx) => (
                      <Card
                        key={idx}
                        variant="outlined"
                        sx={{ p: 2, position: 'relative' }}
                      >
                        <Stack spacing={1.5}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <TextField
                              select
                              size="small"
                              label="Button type"
                              value={b.type}
                              onChange={(e) =>
                                setButtons((prev) =>
                                  prev.map((row, i) =>
                                    i === idx
                                      ? { ...row, type: e.target.value as ButtonType }
                                      : row
                                  )
                                )
                              }
                              sx={{ minWidth: 200 }}
                            >
                              <MenuItem value="URL">Go to website</MenuItem>
                              <MenuItem value="QUICK_REPLY">Quick reply</MenuItem>
                              <MenuItem value="PHONE_NUMBER">Call phone</MenuItem>
                            </TextField>
                            <TextField
                              size="small"
                              label="Button text"
                              value={b.title}
                              onChange={(e) =>
                                setButtons((prev) =>
                                  prev.map((row, i) =>
                                    i === idx ? { ...row, title: e.target.value } : row
                                  )
                                )
                              }
                              fullWidth
                              inputProps={{ maxLength: 25 }}
                              helperText="25 chars max"
                            />
                          </Stack>
                          {b.type === 'URL' && (
                            <TextField
                              size="small"
                              label="Button URL"
                              value={b.url || ''}
                              onChange={(e) =>
                                setButtons((prev) =>
                                  prev.map((row, i) =>
                                    i === idx ? { ...row, url: e.target.value } : row
                                  )
                                )
                              }
                              fullWidth
                              placeholder="https://example.com/path/{{N}}"
                              helperText="Variables only allowed in the trailing path."
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Iconify icon="solar:link-bold" />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          )}
                          {b.type === 'PHONE_NUMBER' && (
                            <TextField
                              size="small"
                              label="Phone number"
                              value={b.phone || ''}
                              onChange={(e) =>
                                setButtons((prev) =>
                                  prev.map((row, i) =>
                                    i === idx ? { ...row, phone: e.target.value } : row
                                  )
                                )
                              }
                              fullWidth
                              placeholder="+12345678900"
                              helperText="E.164 format"
                            />
                          )}
                          {buttons.length > 1 && (
                            <IconButton
                              size="small"
                              color="error"
                              sx={{ position: 'absolute', top: 4, right: 4 }}
                              onClick={() =>
                                setButtons((prev) => prev.filter((_, i) => i !== idx))
                              }
                            >
                              <Iconify icon="solar:trash-bin-trash-bold" />
                            </IconButton>
                          )}
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* VARIABLE METADATA */}
              {variableDefs.length > 0 && (
                <Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                    Variable settings
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 2, display: 'block' }}
                  >
                    For each variable, set its label, where the runtime value comes from,
                    and whether senders can override it. These rules apply everywhere the
                    approved template is used — no code changes needed.
                  </Typography>
                  <Stack spacing={1.5}>
                    {variableDefs.map((d) => (
                      <Card key={d.index} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack spacing={1}>
                          <Typography variant="subtitle2">{`{{${d.index}}}`}</Typography>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <TextField
                              size="small"
                              label="Label"
                              value={d.label}
                              onChange={(e) =>
                                setVariableDefs((prev) =>
                                  prev.map((row) =>
                                    row.index === d.index
                                      ? { ...row, label: e.target.value }
                                      : row
                                  )
                                )
                              }
                              fullWidth
                            />
                            <TextField
                              size="small"
                              select
                              label="Auto source"
                              value={d.autoSource || 'manual'}
                              onChange={(e) => {
                                const v = e.target.value as AutoSource;
                                setVariableDefs((prev) =>
                                  prev.map((row) =>
                                    row.index === d.index
                                      ? {
                                          ...row,
                                          autoSource: v === 'manual' ? null : v,
                                          locked: v !== 'manual' ? true : row.locked,
                                        }
                                      : row
                                  )
                                );
                              }}
                              sx={{ minWidth: 260 }}
                            >
                              {AUTO_SOURCE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Stack>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={d.locked}
                                onChange={(e) =>
                                  setVariableDefs((prev) =>
                                    prev.map((row) =>
                                      row.index === d.index
                                        ? { ...row, locked: e.target.checked }
                                        : row
                                    )
                                  )
                                }
                              />
                            }
                            label="Locked (user cannot override)"
                          />
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}

          {/* STEP 3 — SAMPLE VALUES + CATEGORY */}
          {activeStep === 2 && (
            <Stack spacing={2}>
              <Alert severity="info">
                Provide a sample value for each variable. Meta&apos;s reviewers see these
                when approving the template — pick realistic examples.
              </Alert>

              {detectedVars.length === 0 && (
                <Typography color="text.secondary">
                  No variables detected — your template has none.
                </Typography>
              )}

              <Stack spacing={1.5}>
                {detectedVars.map((n) => {
                  const k = String(n);
                  const def = variableDefs.find((d) => d.index === n);
                  return (
                    <TextField
                      key={k}
                      label={`{{${n}}}${def?.label ? ` — ${def.label}` : ''}`}
                      value={sampleValues[k] || ''}
                      onChange={(e) =>
                        setSampleValues((prev) => ({ ...prev, [k]: e.target.value }))
                      }
                      fullWidth
                      placeholder={`e.g. example for {{${n}}}`}
                      error={!(sampleValues[k] || '').trim()}
                    />
                  );
                })}
              </Stack>

              <Divider />

              <FormControl>
                <FormLabel sx={{ mb: 1 }}>Category</FormLabel>
                <RadioGroup
                  row
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                >
                  {CATEGORIES.map((c) => (
                    <FormControlLabel
                      key={c}
                      value={c}
                      control={<Radio />}
                      label={c}
                    />
                  ))}
                </RadioGroup>
                <Typography variant="caption" color="text.secondary">
                  Pick accurately — Meta will reclassify and re-bill if it doesn&apos;t match
                  the content.
                </Typography>
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateOpen(false);
              resetWizard();
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack} disabled={submitting}>
              Back
            </Button>
          )}
          {activeStep < WIZARD_STEPS.length - 1 ? (
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!step3Valid || submitting}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} />
                ) : (
                  <Iconify icon="solar:paper-plane-bold" />
                )
              }
              sx={{ backgroundColor: '#25D366', '&:hover': { backgroundColor: '#128C7E' } }}
            >
              Submit for approval
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* EDIT METADATA DIALOG */}
      <Dialog
        open={editOpen}
        onClose={() => !submitting && setEditOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Edit metadata — {editTarget?.friendlyName}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              The Twilio template body, header, and buttons are locked after creation. You can
              still update its display name, description, category, and variable settings.
            </Alert>
            <TextField
              label="Display Name"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              select
              label="Category"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as any)}
              sx={{ width: 240 }}
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>

            {editVarDefs.length > 0 && (
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Variable settings
                </Typography>
                <Stack spacing={1.5}>
                  {editVarDefs.map((d) => (
                    <Card key={d.index} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack spacing={1}>
                        <Typography variant="subtitle2">{`{{${d.index}}}`}</Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                          <TextField
                            size="small"
                            label="Label"
                            value={d.label}
                            onChange={(e) =>
                              setEditVarDefs((prev) =>
                                prev.map((row) =>
                                  row.index === d.index
                                    ? { ...row, label: e.target.value }
                                    : row
                                )
                              )
                            }
                            fullWidth
                          />
                          <TextField
                            size="small"
                            select
                            label="Auto source"
                            value={d.autoSource || 'manual'}
                            onChange={(e) => {
                              const v = e.target.value as AutoSource;
                              setEditVarDefs((prev) =>
                                prev.map((row) =>
                                  row.index === d.index
                                    ? {
                                        ...row,
                                        autoSource: v === 'manual' ? null : v,
                                        locked: v !== 'manual' ? true : row.locked,
                                      }
                                    : row
                                )
                              );
                            }}
                            sx={{ minWidth: 260 }}
                          >
                            {AUTO_SOURCE_OPTIONS.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Stack>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={d.locked}
                              onChange={(e) =>
                                setEditVarDefs((prev) =>
                                  prev.map((row) =>
                                    row.index === d.index
                                      ? { ...row, locked: e.target.checked }
                                      : row
                                  )
                                )
                              }
                            />
                          }
                          label="Locked (user cannot override)"
                        />
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={submitting}>
            {submitting ? <CircularProgress size={16} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PREVIEW DIALOG */}
      <Dialog
        open={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{previewTarget?.displayName || previewTarget?.friendlyName}</DialogTitle>
        <DialogContent>
          {previewTarget && (
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Name / Type / Category / Language
                </Typography>
                <Typography>
                  {previewTarget.friendlyName} • {previewTarget.templateType || 'text'} •{' '}
                  {previewTarget.category} • {previewTarget.language}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Box>
                  <Chip
                    size="small"
                    color={statusColor(previewTarget.approvalStatus) as any}
                    label={previewTarget.approvalStatus}
                  />
                </Box>
              </Box>
              {previewTarget.approvalRejectionReason && (
                <Alert severity="error">
                  {previewTarget.approvalRejectionReason}
                </Alert>
              )}
              {previewTarget.contentSid && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Content SID
                  </Typography>
                  <Typography variant="body2">{previewTarget.contentSid}</Typography>
                </Box>
              )}
              {previewTarget.headerType === 'text' && previewTarget.headerText && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Header
                  </Typography>
                  <Typography>{previewTarget.headerText}</Typography>
                </Box>
              )}
              {previewTarget.headerType === 'media' && previewTarget.headerMediaUrl && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Header media
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {previewTarget.headerMediaUrl}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Body
                </Typography>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'background.neutral',
                    borderRadius: 1,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    fontSize: 13,
                  }}
                >
                  {previewTarget.bodyText}
                </Box>
              </Box>
              {previewTarget.footerText && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Footer
                  </Typography>
                  <Typography>{previewTarget.footerText}</Typography>
                </Box>
              )}
              {(previewTarget.buttons || []).length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Buttons
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {(previewTarget.buttons || []).map((b, i) => (
                      <Typography key={i} variant="body2">
                        <Chip size="small" label={b.type} sx={{ mr: 1, height: 18 }} />
                        {b.title}
                        {b.url ? ` → ${b.url}` : ''}
                        {b.phone ? ` ☎ ${b.phone}` : ''}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}
              {Array.isArray(previewTarget.variableDefinitions) &&
                previewTarget.variableDefinitions.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Variables
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {previewTarget.variableDefinitions.map((d) => (
                        <Typography key={d.index} variant="body2">
                          <strong>&#123;&#123;{d.index}&#125;&#125;</strong>{' '}
                          {d.label || '(no label)'}{' '}
                          {d.autoSource && (
                            <Chip
                              size="small"
                              label={d.autoSource}
                              sx={{ ml: 0.5, height: 18, fontSize: 11 }}
                            />
                          )}
                          {d.locked && (
                            <Chip
                              size="small"
                              color="warning"
                              label="locked"
                              sx={{ ml: 0.5, height: 18, fontSize: 11 }}
                            />
                          )}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewTarget(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete template</DialogTitle>
        <DialogContent>
          Delete <strong>{deleteTarget?.friendlyName}</strong>? This removes it from Twilio
          and your database. Approved templates already in use may keep working briefly but
          cannot be reused.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
