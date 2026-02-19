import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import { SketchPicker } from 'react-color';

import { toast } from 'react-toastify';
import { API_BASE } from 'src/utils/apiBase';
import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { Chart, useChart } from 'src/components/chart';
import { AnalyticsWidgetSummary } from 'src/sections/overview/analytics-widget-summary';
import { AnalyticsCurrentVisits } from 'src/sections/overview/analytics-current-visits';
import { AnalyticsConversionRates } from 'src/sections/overview/analytics-conversion-rates';
import {
  MessageSequenceBuilder,
  getDefaultMessageSequence,
  normalizeMessageSequence,
  serializeMessageSequence,
  type MessageSequenceItem,
} from 'src/sections/event/message-sequence-builder';

type RsvpRecord = {
  _id: string;
  guestName: string;
  email?: string;
  phone?: string;
  attendanceStatus?: 'pending' | 'yes' | 'no';
  submissionDate?: string;
  source?: 'imported' | 'form_submission' | 'manual';
  invitationSent?: boolean;
  sentCount?: number;
  lastSentAt?: string;
};

type RsvpFormSettings = {
  guestNameLabel: string;
  guestNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  attendanceLabel: string;
  commentsLabel: string;
  commentsPlaceholder: string;
  submitLabel: string;
};

const defaultRsvpFormSettings: RsvpFormSettings = {
  guestNameLabel: 'Guest Name',
  guestNamePlaceholder: '',
  emailLabel: 'Email',
  emailPlaceholder: '',
  phoneLabel: 'Phone Number',
  phonePlaceholder: '',
  attendanceLabel: 'Will you attend?',
  commentsLabel: 'Additional Comments',
  commentsPlaceholder: '',
  submitLabel: 'Submit RSVP',
};

export function RsvpAdminView() {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<any | null>(null);
  const [guests, setGuests] = useState<RsvpRecord[]>([]);
  const [summary, setSummary] = useState({ yes: 0, no: 0, pending: 0, total: 0, sent: 0 });
  const [mode, setMode] = useState<'rsvp' | 'invitation-only'>('rsvp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({ guestName: '', email: '', phone: '' });
  const [activeTab, setActiveTab] = useState(0);
  const [formLink, setFormLink] = useState('');
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [rsvpBgColor, setRsvpBgColor] = useState('#111827');
  const [rsvpAccentColor, setRsvpAccentColor] = useState('#1f2937');
  const [rsvpDeadline, setRsvpDeadline] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [rsvpFormSettings, setRsvpFormSettings] =
    useState<RsvpFormSettings>(defaultRsvpFormSettings);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<RsvpRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [messageSequence, setMessageSequence] = useState<MessageSequenceItem[]>([]);
  const [sequenceSaving, setSequenceSaving] = useState(false);
  const [analyticsStart, setAnalyticsStart] = useState('');
  const [analyticsEnd, setAnalyticsEnd] = useState('');

  const token = useMemo(() => localStorage.getItem('token') || '', []);
  const conversionRate = useMemo(
    () => (summary.total ? Math.round((summary.yes / summary.total) * 100) : 0),
    [summary.total, summary.yes]
  );
  const formSubmissions = useMemo(
    () => guests.filter((g) => g.source === 'form_submission'),
    [guests]
  );
  const allowWhatsApp = useMemo(
    () => !!event?.channelConfig?.whatsapp?.enabled,
    [event?.channelConfig?.whatsapp?.enabled]
  );
  const allowSms = useMemo(
    () => !!event?.channelConfig?.bulkSms?.enabled,
    [event?.channelConfig?.bulkSms?.enabled]
  );
  const canEditSequence = event?.servicePackage === 'full-rsvp';
  const sequencePayload = useMemo(
    () =>
      canEditSequence ? serializeMessageSequence(messageSequence, allowWhatsApp, allowSms) : [],
    [canEditSequence, messageSequence, allowWhatsApp, allowSms]
  );
  const sequenceJson = useMemo(
    () => (sequencePayload.length ? JSON.stringify(sequencePayload, null, 2) : ''),
    [sequencePayload]
  );

  const timelinePoints = analytics?.timeline || [];
  const timelineCategories = timelinePoints.map((point: any) => point.date);
  const timelineSeries = timelinePoints.map((point: any) => point.count);

  const emailSent = analytics?.email?.sent ?? analytics?.channels?.email?.sent ?? 0;
  const emailOpens = analytics?.email?.opens ?? analytics?.channels?.email?.opens ?? 0;
  const emailClicks = analytics?.email?.clicks ?? analytics?.channels?.email?.clicks ?? 0;
  const emailOpenRate = analytics?.email?.openRate ?? (emailSent ? (emailOpens / emailSent) * 100 : 0);
  const emailClickRate =
    analytics?.email?.clickRate ?? (emailSent ? (emailClicks / emailSent) * 100 : 0);

  const channelSentSeries = [
    analytics?.channels?.email?.sent ?? 0,
    analytics?.channels?.whatsapp?.sent ?? 0,
    analytics?.channels?.sms?.sent ?? 0,
  ];
  const channelDeliveredSeries = [
    analytics?.channels?.email?.opens ?? 0,
    analytics?.channels?.whatsapp?.delivered ?? 0,
    analytics?.channels?.sms?.delivered ?? 0,
  ];

  const timelineChartOptions = useChart({
    xaxis: { categories: timelineCategories },
    stroke: { width: 3 },
    tooltip: {
      y: {
        formatter: (value: number) => `${value} responses`,
      },
    },
  });

  const emailEngagementOptions = useChart({
    xaxis: { categories: ['Sent', 'Opens', 'Clicks'] },
    stroke: { width: 2, colors: ['transparent'] },
    tooltip: {
      y: {
        formatter: (value: number) => `${value}`,
      },
    },
  });

  const hexToRgb = (hex: string): string => {
    const cleanedHex = hex.replace('#', '');
    const r = parseInt(cleanedHex.substring(0, 2), 16);
    const g = parseInt(cleanedHex.substring(2, 4), 16);
    const b = parseInt(cleanedHex.substring(4, 6), 16);
    return `${r},${g},${b}`;
  };

  const rgbToHex = (rgb: string): string => {
    const parts = rgb.split(',').map((v) => parseInt(v.trim(), 10));
    if (parts.length !== 3 || parts.some((v) => Number.isNaN(v))) {
      return '#111827';
    }
    return `#${parts.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  };

  const loadData = useCallback(
    async (
      currentEventId: string,
      filter?: {
        start?: string;
        end?: string;
      }
    ) => {
      const query = new URLSearchParams();
      if (filter?.start) query.set('start', filter.start);
      if (filter?.end) query.set('end', filter.end);
      const queryString = query.toString();
      const analyticsSuffix = queryString ? `?${queryString}` : '';
    setLoading(true);
    setError(null);
    try {
      const [eventRes, guestsRes] = await Promise.all([
        axios.get(`${API_BASE}/events/events/${currentEventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/events/${currentEventId}/rsvp/guests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const nextEvent = eventRes.data?.event || eventRes.data;
      setEvent(nextEvent);
      if (nextEvent?.servicePackage === 'full-rsvp') {
        const allowWa = !!nextEvent?.channelConfig?.whatsapp?.enabled;
        const allowSmsLocal = !!nextEvent?.channelConfig?.bulkSms?.enabled;
        const normalizedSequence = normalizeMessageSequence(nextEvent?.customMessageSequence);
        setMessageSequence(
          normalizedSequence.length
            ? normalizedSequence
            : getDefaultMessageSequence('full-rsvp', allowWa, allowSmsLocal)
        );
      } else {
        setMessageSequence([]);
      }
      if (nextEvent?.rsvpMessage !== undefined) {
        setRsvpMessage(nextEvent.rsvpMessage || '');
      }
      if (nextEvent?.rsvpBgColor) {
        setRsvpBgColor(rgbToHex(nextEvent.rsvpBgColor));
      }
      if (nextEvent?.rsvpAccentColor) {
        setRsvpAccentColor(rgbToHex(nextEvent.rsvpAccentColor));
      }
      setRsvpDeadline(nextEvent?.rsvpDeadline || '');
      setEventEndDate(nextEvent?.eventEndDate || '');
      if (nextEvent?.rsvpFormSettings) {
        setRsvpFormSettings({ ...defaultRsvpFormSettings, ...nextEvent.rsvpFormSettings });
      } else {
        setRsvpFormSettings(defaultRsvpFormSettings);
      }
      const nextMode = guestsRes.data?.mode === 'invitation-only' ? 'invitation-only' : 'rsvp';
      setMode(nextMode);
      if (nextMode === 'invitation-only') {
        setGuests(guestsRes.data?.invitations || []);
      } else {
        setGuests(guestsRes.data?.rsvps || []);
      }
      const reportSummary = guestsRes.data?.summary || {};
      setSummary({ yes: 0, no: 0, pending: 0, total: 0, sent: 0, ...reportSummary });
      try {
        const schedulesRes = await axios.get(
          `${API_BASE}/events/${currentEventId}/rsvp/schedules`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSchedules(schedulesRes.data?.schedules || []);
      } catch {
        setSchedules([]);
      }
      try {
        const reportsRes = await axios.get(
          `${API_BASE}/events/${currentEventId}/rsvp/reports`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setReports(reportsRes.data?.reports || []);
      } catch {
        setReports([]);
      }
      try {
        const requests = [
          axios.get(`${API_BASE}/events/${currentEventId}/analytics/overview${analyticsSuffix}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/events/${currentEventId}/analytics/channels${analyticsSuffix}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/events/${currentEventId}/analytics/timeline${analyticsSuffix}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/events/${currentEventId}/analytics/email${analyticsSuffix}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/events/${currentEventId}/analytics/whatsapp${analyticsSuffix}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/events/${currentEventId}/analytics/sms${analyticsSuffix}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ];
        const [
          overviewRes,
          channelsRes,
          timelineRes,
          emailRes,
          whatsappRes,
          smsRes,
        ] = await Promise.allSettled(requests);

        const overview = overviewRes.status === 'fulfilled' ? overviewRes.value.data : null;
        const channels = channelsRes.status === 'fulfilled' ? channelsRes.value.data : null;
        const timeline =
          timelineRes.status === 'fulfilled' ? timelineRes.value.data?.timeline || [] : [];
        const email = emailRes.status === 'fulfilled' ? emailRes.value.data : null;
        const whatsapp = whatsappRes.status === 'fulfilled' ? whatsappRes.value.data : null;
        const sms = smsRes.status === 'fulfilled' ? smsRes.value.data : null;

        if (overview || channels || timeline.length || email || whatsapp || sms) {
          setAnalytics({
            overview,
            channels,
            timeline,
            email,
            whatsapp,
            sms,
          });
        } else {
          setAnalytics(null);
        }
      } catch {
        setAnalytics(null);
      }
    } catch (err: any) {
      console.error('RSVP admin load error:', err);
      setError(err?.response?.data?.message || 'Failed to load RSVP data');
    } finally {
      setLoading(false);
    }
    },
    [token]
  );

  useEffect(() => {
    const storedIds = localStorage.getItem('allRowIds');
    if (!storedIds) {
      setError('No event selected. Please open RSVP from the Events page.');
      return;
    }
    try {
      const parsed = JSON.parse(storedIds);
      const currentEventId = Array.isArray(parsed) && parsed.length ? parsed[0] : null;
      if (!currentEventId) {
        setError('No event selected. Please open RSVP from the Events page.');
        return;
      }
      setEventId(currentEventId);
      loadData(currentEventId);
    } catch {
      setError('Invalid event selection.');
    }
  }, [loadData]);

  const reloadData = useCallback(() => {
    if (!eventId) return;
    loadData(eventId, {
      start: analyticsStart || undefined,
      end: analyticsEnd || undefined,
    });
  }, [eventId, loadData, analyticsStart, analyticsEnd]);

  const handleAddGuest = async () => {
    if (!eventId) return;
    if (!newGuest.guestName.trim()) {
      toast.error('Guest name is required');
      return;
    }

    try {
      await axios.post(
        `${API_BASE}/events/${eventId}/rsvp/guests`,
        newGuest,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(mode === 'invitation-only' ? 'Invitation guest added' : 'RSVP guest added');
      setAddOpen(false);
      setNewGuest({ guestName: '', email: '', phone: '' });
      reloadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add RSVP guest');
    }
  };

  const handleImport = async (file: File) => {
    if (!eventId) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_BASE}/events/${eventId}/rsvp/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(mode === 'invitation-only' ? 'Invitation guests imported' : 'RSVP guests imported');
      reloadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed');
    }
  };

  const handleSendInvites = async (ids?: string[]) => {
    if (!eventId) return;
    try {
      await axios.post(
        `${API_BASE}/events/${eventId}/rsvp/send`,
        { publicBaseUrl: window.location.origin, rsvpIds: ids },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(mode === 'invitation-only' ? 'Invitations sent' : 'RSVP invites sent');
      reloadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send invites');
    }
  };

  const handleExportCsv = async () => {
    if (!eventId) return;
    try {
      const response = await axios.get(`${API_BASE}/events/${eventId}/rsvp/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download =
        mode === 'invitation-only' ? `event-${eventId}-invitation.csv` : `event-${eventId}-rsvp.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV download started');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to export RSVP CSV');
    }
  };

  const handleGenerateFormLink = async () => {
    if (!eventId) return;
    try {
      const res = await axios.post(
        `${API_BASE}/events/${eventId}/rsvp/generate-form`,
        { publicBaseUrl: window.location.origin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const nextLink = res.data?.url || '';
      setFormLink(nextLink);
      toast.success('RSVP form link generated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate RSVP form link');
    }
  };

  const handleGenerateReport = async () => {
    if (!eventId) return;
    try {
      const res = await axios.post(
        `${API_BASE}/events/${eventId}/rsvp/generate-report`,
        { type: 'excel' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Report generated');
      reloadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate report');
    }
  };

  const handleDownloadReport = (report: any) => {
    const url = report?.fileUrl || `${API_BASE}/reports/${report?._id}/download`;
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleCopyShareLink = (tokenValue?: string) => {
    if (!eventId || !tokenValue) return;
    const shareUrl = `${API_BASE}/events/${eventId}/rsvp/shareable-report/${tokenValue}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Shareable report link copied');
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    if (!scheduleId) return;
    try {
      await axios.patch(
        `${API_BASE}/events/rsvp/schedules/${scheduleId}`,
        { status: 'cancelled' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Schedule cancelled');
      reloadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel schedule');
    }
  };

  const handleSaveRsvpSettings = async () => {
    if (!eventId) return;
    try {
      await axios.put(
        `${API_BASE}/events/events/${eventId}/rsvp-settings`,
        {
          rsvpMessage,
          rsvpBgColor: hexToRgb(rsvpBgColor),
          rsvpAccentColor: hexToRgb(rsvpAccentColor),
          rsvpDeadline,
          eventEndDate,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('RSVP settings saved');
      reloadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save RSVP settings');
    }
  };

  const handleRsvpFormSettings = async () => {
    if (!eventId) return;
    try {
      await axios.put(
        `${API_BASE}/events/events/${eventId}/rsvp-form-settings`,
        { rsvpFormSettings },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('RSVP form settings saved');
      reloadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save RSVP form settings');
    }
  };

  const handleSaveMessageSequence = async () => {
    if (!eventId || !canEditSequence) return;
    try {
      setSequenceSaving(true);
      const formData = new FormData();
      formData.append('id', eventId);
      formData.append('customMessageSequence', sequenceJson || '[]');
      formData.append(
        'messageCycle',
        String(sequencePayload.length ? Math.min(7, sequencePayload.length) : event?.messageCycle || 3)
      );

      const response = await fetch(`${API_BASE}/events/update`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to save message sequence');
      }

      toast.success('Message sequence saved');
      reloadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save message sequence');
    } finally {
      setSequenceSaving(false);
    }
  };

  const handleApplyAnalyticsFilter = () => {
    reloadData();
  };

  const handleResetAnalyticsFilter = () => {
    setAnalyticsStart('');
    setAnalyticsEnd('');
    if (eventId) {
      loadData(eventId);
    }
  };

  const handleExportAnalytics = async (format: 'csv' | 'json') => {
    if (!eventId) return;
    try {
      const query = new URLSearchParams();
      if (analyticsStart) query.set('start', analyticsStart);
      if (analyticsEnd) query.set('end', analyticsEnd);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const res = await axios.get(`${API_BASE}/events/${eventId}/analytics/export${suffix}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = res.data?.export || [];
      if (!payload.length) {
        toast.info('No analytics data to export');
        return;
      }

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rsvp-analytics-${eventId}.json`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const headers = [
        'guestName',
        'email',
        'phone',
        'attendanceStatus',
        'submissionDate',
        'createdAt',
      ];
      const escapeValue = (value: any) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };
      const rows = payload.map((row: any) =>
        headers
          .map((key) =>
            escapeValue(
              key === 'submissionDate' || key === 'createdAt'
                ? row[key]
                  ? new Date(row[key]).toISOString()
                  : ''
                : row[key]
            )
          )
          .join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rsvp-analytics-${eventId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to export analytics');
    }
  };

  const handleDeleteGuest = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await axios.delete(`${API_BASE}/rsvp/${deleteTarget._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(mode === 'invitation-only' ? 'Invitation guest removed' : 'RSVP guest removed');
      reloadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete guest');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  return (
    <DashboardContent>
      <Box display="flex" alignItems="center" mb={3}>
        <Typography variant="h4" flexGrow={1}>
          RSVP Admin
        </Typography>
        {activeTab === 0 && (
          <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={() => setAddOpen(true)} startIcon={<Iconify icon="mingcute:add-line" />}>
            {mode === 'invitation-only' ? 'Add Invitation Guest' : 'Add RSVP Guest'}
          </Button>
          <Button variant="outlined" onClick={() => fileInputRef.current?.click()} startIcon={<Iconify icon="mdi:file-upload" />}>
            Import CSV
          </Button>
          <Button variant="outlined" onClick={() => handleSendInvites()} startIcon={<Iconify icon="mdi:email-fast" />}>
            {mode === 'invitation-only' ? 'Send Invitations' : 'Send RSVP Emails'}
          </Button>
          <Button variant="outlined" onClick={handleExportCsv} startIcon={<Iconify icon="mdi:file-download" />}>
            Export CSV
          </Button>
          </Stack>
        )}
      </Box>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".csv,.xlsx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
          if (e.target) e.target.value = '';
        }}
      />

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      <Card sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2">Event</Typography>
        <Typography variant="h6">{event?.name || '—'}</Typography>
        <Typography variant="body2" color="text.secondary">
          {event?.date || ''}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {event?.location || ''}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Package: {event?.servicePackage || 'standard-rsvp'}
        </Typography>
      </Card>

      {mode === 'invitation-only' ? (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid xs={12} sm={6} md={3}>
            <AnalyticsWidgetSummary
              title="Total Invited"
              total={summary.total}
              percent={summary.total}
              icon={<Iconify icon="mdi:account-group-outline" />}
              color="primary"
            />
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <AnalyticsWidgetSummary
              title="Invitations Sent"
              total={summary.sent || 0}
              percent={summary.sent || 0}
              icon={<Iconify icon="mdi:email-check-outline" />}
              color="success"
            />
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <AnalyticsWidgetSummary
              title="Invitations Pending"
              total={summary.pending}
              percent={summary.pending}
              icon={<Iconify icon="mdi:clock-outline" />}
              color="warning"
            />
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid xs={12} sm={6} md={3}>
            <AnalyticsWidgetSummary
              title="Total Invited"
              total={summary.total}
              percent={summary.total}
              icon={<Iconify icon="mdi:account-group-outline" />}
              color="primary"
            />
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <AnalyticsWidgetSummary
              title="RSVP Yes"
              total={summary.yes}
              percent={summary.yes}
              icon={<Iconify icon="mdi:checkbox-marked-circle-outline" />}
              color="success"
            />
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <AnalyticsWidgetSummary
              title="RSVP No"
              total={summary.no}
              percent={summary.no}
              icon={<Iconify icon="mdi:close-circle-outline" />}
              color="error"
            />
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <AnalyticsWidgetSummary
              title="RSVP Pending"
              total={summary.pending}
              percent={summary.pending}
              icon={<Iconify icon="mdi:clock-outline" />}
              color="warning"
            />
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <AnalyticsWidgetSummary
              title="Conversion Rate"
              total={conversionRate}
              percent={conversionRate}
              icon={<Iconify icon="mdi:chart-line" />}
              color="info"
            />
          </Grid>
        </Grid>
      )}

      <Tabs
        value={activeTab}
        onChange={(_, next) => setActiveTab(next)}
        sx={{ mb: 2 }}
      >
        <Tab label="RSVP Guest List" />
        <Tab label="RSVP Form" />
        <Tab label="Settings" />
        <Tab label="Form Settings" />
        <Tab label="Message Builder" />
        <Tab label="Email Schedule" />
        <Tab label="Reports" />
        <Tab label="Analytics" />
      </Tabs>
      <Divider sx={{ mb: 3 }} />

      {activeTab === 0 && (
        <Card sx={{ mb: 3 }}>
          <Box p={2} borderBottom="1px solid" borderColor="divider">
            <Typography variant="h6">RSVP Guest List</Typography>
          </Box>
          <Scrollbar>
            <TableContainer sx={{ minWidth: 720 }}>
              <Table>
                <TableHead>
                  {mode === 'invitation-only' ? (
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Invitation Sent</TableCell>
                      <TableCell>Sent Count</TableCell>
                      <TableCell>Last Sent At</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Submitted At</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  )}
                </TableHead>
                <TableBody>
                  {guests.map((guest) =>
                    mode === 'invitation-only' ? (
                      <TableRow key={guest._id}>
                        <TableCell>{guest.guestName}</TableCell>
                        <TableCell>{guest.email || '—'}</TableCell>
                        <TableCell>{guest.phone || '—'}</TableCell>
                        <TableCell>{guest.invitationSent ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{guest.sentCount || 0}</TableCell>
                        <TableCell>
                          {guest.lastSentAt ? new Date(guest.lastSentAt).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              variant="outlined"
                              onClick={() => handleSendInvites([guest._id])}
                            >
                              Resend Invitation
                            </Button>
                            <Button color="error" onClick={() => setDeleteTarget(guest)}>
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={guest._id}>
                        <TableCell>{guest.guestName}</TableCell>
                        <TableCell>{guest.email || '—'}</TableCell>
                        <TableCell>{guest.phone || '—'}</TableCell>
                        <TableCell>{guest.attendanceStatus || 'pending'}</TableCell>
                        <TableCell>{guest.source || 'imported'}</TableCell>
                        <TableCell>
                          {guest.submissionDate ? new Date(guest.submissionDate).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Button color="error" onClick={() => setDeleteTarget(guest)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                  {!loading && guests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        {mode === 'invitation-only' ? 'No invitation guests yet.' : 'No RSVP guests yet.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>
        </Card>
      )}

      {activeTab === 1 && (
        <Stack spacing={3}>
          {mode === 'invitation-only' && (
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" mb={1}>
                RSVP Form Disabled
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This event is configured as invitation-only, so RSVP tracking is disabled.
              </Typography>
            </Card>
          )}
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>
              RSVP Form Generator
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <Button
                variant="contained"
                onClick={handleGenerateFormLink}
                disabled={mode === 'invitation-only'}
              >
                Generate Form Link
              </Button>
              <TextField
                label="Form Link"
                value={formLink}
                fullWidth
                InputProps={{ readOnly: true }}
              />
              <Button
                variant="outlined"
                disabled={mode === 'invitation-only'}
                onClick={() => {
                  if (formLink) {
                    navigator.clipboard.writeText(formLink);
                    toast.success('Link copied');
                  }
                }}
              >
                Copy
              </Button>
            </Stack>
          </Card>

          {mode !== 'invitation-only' && (
            <Card>
              <Box p={2} borderBottom="1px solid" borderColor="divider">
                <Typography variant="h6">Form Submissions</Typography>
              </Box>
              <Scrollbar>
                <TableContainer sx={{ minWidth: 720 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Phone</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Submitted At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formSubmissions.map((guest) => (
                        <TableRow key={guest._id}>
                          <TableCell>{guest.guestName}</TableCell>
                          <TableCell>{guest.email || '—'}</TableCell>
                          <TableCell>{guest.phone || '—'}</TableCell>
                          <TableCell>{guest.attendanceStatus || 'pending'}</TableCell>
                          <TableCell>
                            {guest.submissionDate ? new Date(guest.submissionDate).toLocaleString() : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!loading && formSubmissions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            No form submissions yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Scrollbar>
            </Card>
          )}
        </Stack>
      )}

      {activeTab === 2 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" mb={2}>
            RSVP Settings
          </Typography>
          <Stack spacing={3}>
            <TextField
              label="RSVP Message (HTML supported)"
              value={rsvpMessage}
              onChange={(e) => setRsvpMessage(e.target.value)}
              multiline
              minRows={6}
              fullWidth
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <Box>
                <Typography variant="subtitle2" mb={1}>
                  RSVP Background Color
                </Typography>
                <SketchPicker
                  color={rsvpBgColor}
                  onChangeComplete={(color) => setRsvpBgColor(color.hex)}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" mb={1}>
                  RSVP Accent Color
                </Typography>
                <SketchPicker
                  color={rsvpAccentColor}
                  onChangeComplete={(color) => setRsvpAccentColor(color.hex)}
                />
              </Box>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="RSVP Deadline"
                  type="date"
                  value={rsvpDeadline}
                  onChange={(e) => setRsvpDeadline(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Event End Date"
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
            </Grid>
            <Box>
              <Button variant="contained" onClick={handleSaveRsvpSettings}>
                Save RSVP Settings
              </Button>
            </Box>
          </Stack>
        </Card>
      )}

      {activeTab === 3 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" mb={2}>
            RSVP Form Settings
          </Typography>
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Guest Name Label"
                  value={rsvpFormSettings.guestNameLabel}
                  onChange={(e) =>
                    setRsvpFormSettings((prev) => ({
                      ...prev,
                      guestNameLabel: e.target.value,
                    }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Guest Name Placeholder"
                  value={rsvpFormSettings.guestNamePlaceholder}
                  onChange={(e) =>
                    setRsvpFormSettings((prev) => ({
                      ...prev,
                      guestNamePlaceholder: e.target.value,
                    }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email Label"
                  value={rsvpFormSettings.emailLabel}
                  onChange={(e) =>
                    setRsvpFormSettings((prev) => ({
                      ...prev,
                      emailLabel: e.target.value,
                    }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email Placeholder"
                  value={rsvpFormSettings.emailPlaceholder}
                  onChange={(e) =>
                    setRsvpFormSettings((prev) => ({
                      ...prev,
                      emailPlaceholder: e.target.value,
                    }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Phone Label"
                  value={rsvpFormSettings.phoneLabel}
                  onChange={(e) =>
                    setRsvpFormSettings((prev) => ({
                      ...prev,
                      phoneLabel: e.target.value,
                    }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Phone Placeholder"
                  value={rsvpFormSettings.phonePlaceholder}
                  onChange={(e) =>
                    setRsvpFormSettings((prev) => ({
                      ...prev,
                      phonePlaceholder: e.target.value,
                    }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Attendance Label"
                  value={rsvpFormSettings.attendanceLabel}
                  onChange={(e) =>
                    setRsvpFormSettings((prev) => ({
                      ...prev,
                      attendanceLabel: e.target.value,
                    }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Comments Label"
                  value={rsvpFormSettings.commentsLabel}
                  onChange={(e) =>
                    setRsvpFormSettings((prev) => ({
                      ...prev,
                      commentsLabel: e.target.value,
                    }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Comments Placeholder"
                  value={rsvpFormSettings.commentsPlaceholder}
                  onChange={(e) =>
                    setRsvpFormSettings((prev) => ({
                      ...prev,
                      commentsPlaceholder: e.target.value,
                    }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Submit Button Label"
                  value={rsvpFormSettings.submitLabel}
                  onChange={(e) =>
                    setRsvpFormSettings((prev) => ({
                      ...prev,
                      submitLabel: e.target.value,
                    }))
                  }
                  fullWidth
                />
              </Grid>
            </Grid>
            <Box>
              <Button variant="contained" onClick={handleRsvpFormSettings}>
                Save RSVP Form Settings
              </Button>
            </Box>
          </Stack>
        </Card>
      )}

      {activeTab === 4 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" mb={2}>
            Message Builder
          </Typography>
          {!canEditSequence ? (
            <Typography variant="body2" color="text.secondary">
              Message sequencing is available for Full RSVP packages only.
            </Typography>
          ) : (
            <Stack spacing={2}>
              <MessageSequenceBuilder
                value={messageSequence}
                onChange={setMessageSequence}
                allowWhatsApp={allowWhatsApp}
                allowSms={allowSms}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() =>
                    setMessageSequence(getDefaultMessageSequence('full-rsvp', allowWhatsApp, allowSms))
                  }
                >
                  Reset to Defaults
                </Button>
                <Button onClick={() => setMessageSequence([])}>Clear</Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                  variant="contained"
                  onClick={handleSaveMessageSequence}
                  disabled={sequenceSaving}
                >
                  {sequenceSaving ? 'Saving...' : 'Save Sequence'}
                </Button>
              </Stack>
              <TextField
                label="Sequence JSON Preview"
                value={sequenceJson}
                multiline
                minRows={4}
                InputProps={{ readOnly: true }}
              />
            </Stack>
          )}
        </Card>
      )}

      {activeTab === 5 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" mb={2}>
            Email Schedule
          </Typography>
          <Scrollbar>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Message</TableCell>
                    <TableCell>Channel</TableCell>
                    <TableCell>Audience</TableCell>
                    <TableCell>Scheduled</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule._id}>
                      <TableCell>{schedule.messageName || schedule.messageType}</TableCell>
                      <TableCell>{schedule.channel}</TableCell>
                      <TableCell>{schedule.targetAudience}</TableCell>
                      <TableCell>
                        {schedule.scheduledDate
                          ? new Date(schedule.scheduledDate).toLocaleString()
                          : '—'}
                      </TableCell>
                      <TableCell>{schedule.status}</TableCell>
                      <TableCell align="right">
                        {schedule.status === 'pending' ? (
                          <Button
                            variant="outlined"
                            color="warning"
                            onClick={() => handleCancelSchedule(schedule._id)}
                          >
                            Cancel
                          </Button>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && schedules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No schedules yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>
        </Card>
      )}

      {activeTab === 6 && (
        <Stack spacing={3}>
          <Card sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Reports</Typography>
              <Button
                variant="contained"
                onClick={handleGenerateReport}
                disabled={mode === 'invitation-only'}
              >
                Generate Report
              </Button>
            </Stack>
            {mode === 'invitation-only' && (
              <Typography variant="body2" color="text.secondary" mt={1}>
                Reports are only available for RSVP packages.
              </Typography>
            )}
          </Card>

          <Card>
            <Box p={2} borderBottom="1px solid" borderColor="divider">
              <Typography variant="h6">Generated Reports</Typography>
            </Box>
            <Scrollbar>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Expires</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report._id}>
                        <TableCell>{report.type}</TableCell>
                        <TableCell>
                          {report.createdAt ? new Date(report.createdAt).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell>
                          {report.expiresAt ? new Date(report.expiresAt).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button variant="outlined" onClick={() => handleDownloadReport(report)}>
                              Download
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={() => handleCopyShareLink(report.shareToken)}
                            >
                              Share Link
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && reports.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No reports generated yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Scrollbar>
          </Card>
        </Stack>
      )}

      {activeTab === 7 && (
        <Stack spacing={3}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Analytics Filters</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={analyticsStart}
                  onChange={(e) => setAnalyticsStart(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={analyticsEnd}
                  onChange={(e) => setAnalyticsEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <Button variant="contained" onClick={handleApplyAnalyticsFilter}>
                  Apply Filter
                </Button>
                <Button variant="outlined" onClick={handleResetAnalyticsFilter}>
                  Reset
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button variant="outlined" onClick={() => handleExportAnalytics('csv')}>
                  Export CSV
                </Button>
                <Button variant="outlined" onClick={() => handleExportAnalytics('json')}>
                  Export JSON
                </Button>
              </Stack>
            </Stack>
          </Card>
          {!analytics ? (
            <Card sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No analytics available yet.
              </Typography>
            </Card>
          ) : (
            <>
              <Grid container spacing={2}>
                <Grid xs={12} sm={6} md={3}>
                  <AnalyticsWidgetSummary
                    title="Total Responses"
                    total={analytics.overview?.totalResponses || 0}
                    percent={analytics.overview?.totalResponses || 0}
                    icon={<Iconify icon="mdi:account-multiple-check-outline" />}
                    color="primary"
                  />
                </Grid>
                <Grid xs={12} sm={6} md={3}>
                  <AnalyticsWidgetSummary
                    title="Response Rate"
                    total={Math.round(analytics.overview?.responseRate || 0)}
                    percent={analytics.overview?.responseRate || 0}
                    icon={<Iconify icon="mdi:percent" />}
                    color="info"
                  />
                </Grid>
                <Grid xs={12} sm={6} md={3}>
                  <AnalyticsWidgetSummary
                    title="Email Open Rate"
                    total={Math.round(emailOpenRate)}
                    percent={emailOpenRate}
                    icon={<Iconify icon="mdi:email-open-outline" />}
                    color="success"
                  />
                </Grid>
                <Grid xs={12} sm={6} md={3}>
                  <AnalyticsWidgetSummary
                    title="Email Click Rate"
                    total={Math.round(emailClickRate)}
                    percent={emailClickRate}
                    icon={<Iconify icon="mdi:cursor-pointer" />}
                    color="warning"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid xs={12} md={6}>
                  <AnalyticsCurrentVisits
                    title="RSVP Status"
                    subheader="Yes vs No vs Pending"
                    chart={{
                      series: [
                        { label: 'Yes', value: analytics.overview?.yes || 0 },
                        { label: 'No', value: analytics.overview?.no || 0 },
                        { label: 'Pending', value: analytics.overview?.pending || 0 },
                      ],
                    }}
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <Card>
                    <CardHeader title="Response Timeline" subheader="Daily responses" />
                    <Chart
                      type="line"
                      series={[{ name: 'Responses', data: timelineSeries }]}
                      options={timelineChartOptions}
                      height={320}
                      sx={{ px: 2, pb: 3 }}
                    />
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid xs={12} md={6}>
                  <AnalyticsConversionRates
                    title="Channel Delivery"
                    subheader="Sent vs Delivered/Opened"
                    chart={{
                      categories: ['Email', 'WhatsApp', 'SMS'],
                      series: [
                        { name: 'Sent', data: channelSentSeries },
                        { name: 'Delivered/Opens', data: channelDeliveredSeries },
                      ],
                    }}
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <Card>
                    <CardHeader title="Email Engagement" subheader="Sent, opens & clicks" />
                    <Chart
                      type="bar"
                      series={[
                        {
                          name: 'Email',
                          data: [emailSent, emailOpens, emailClicks],
                        },
                      ]}
                      options={emailEngagementOptions}
                      height={320}
                      sx={{ px: 2, pb: 3 }}
                    />
                  </Card>
                </Grid>
              </Grid>
            </>
          )}
        </Stack>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{mode === 'invitation-only' ? 'Add Invitation Guest' : 'Add RSVP Guest'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Full name"
              value={newGuest.guestName}
              onChange={(e) => setNewGuest((prev) => ({ ...prev, guestName: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Email"
              value={newGuest.email}
              onChange={(e) => setNewGuest((prev) => ({ ...prev, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Phone"
              value={newGuest.phone}
              onChange={(e) => setNewGuest((prev) => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddGuest}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => (deleteLoading ? null : setDeleteTarget(null))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {mode === 'invitation-only' ? 'Delete invitation guest?' : 'Delete RSVP guest?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteTarget
              ? `This will permanently delete ${deleteTarget.guestName} from the ${mode === 'invitation-only' ? 'invitation' : 'RSVP'} list.`
              : 'This will permanently delete this guest.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteGuest}
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
