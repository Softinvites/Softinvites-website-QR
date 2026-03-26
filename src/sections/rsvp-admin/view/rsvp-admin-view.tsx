import axios from 'axios';
import { toast } from 'react-toastify';
import { SketchPicker } from 'react-color';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import InputAdornment from '@mui/material/InputAdornment';
import TablePagination from '@mui/material/TablePagination';
import FormControlLabel from '@mui/material/FormControlLabel';

import { API_BASE } from 'src/utils/apiBase';

import { DashboardContent } from 'src/layouts/dashboard';

import { Scrollbar } from 'src/components/scrollbar';
import { Chart, useChart } from 'src/components/chart';
import { Iconify } from 'src/components/iconify/iconify';

import { AnalyticsWidgetSummary } from 'src/sections/overview/analytics-widget-summary';
import { AnalyticsCurrentVisits } from 'src/sections/overview/analytics-current-visits';
import { AnalyticsConversionRates } from 'src/sections/overview/analytics-conversion-rates';
import {
  MessageSequenceBuilder,
  getMessageAudienceLabel,
  normalizeMessageSequence,
  serializeMessageSequence,
  type MessageSequenceItem,
  getDefaultMessageSequence,
  collectSequenceAttachmentFiles,
} from 'src/sections/event/message-sequence-builder';

type RsvpRecord = {
  _id: string;
  guestName: string;
  email?: string;
  phone?: string;
  guestCount?: number;
  tag?: string;
  attendanceStatus?: RsvpAttendanceStatus;
  submissionDate?: string;
  source?: 'imported' | 'form_submission' | 'manual';
  invitationSent?: boolean;
  sentCount?: number;
  lastSentAt?: string;
};

type RsvpAttendanceStatus = 'pending' | 'yes' | 'no';

type EditGuestFormState = {
  guestName: string;
  email: string;
  phone: string;
  attendanceStatus: RsvpAttendanceStatus;
  guestCount: string;
  tag: string;
};

type AddGuestFormState = {
  guestName: string;
  email: string;
  phone: string;
  guestCount: string;
  tag: string;
};

type RsvpFormSettings = {
  guestNameLabel: string;
  guestNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  attendanceEnabled: boolean;
  attendanceLabel: string;
  attendanceYesLabel: string;
  attendanceNoLabel: string;
  commentsLabel: string;
  commentsPlaceholder: string;
  submitLabel: string;
  customFields: RsvpCustomField[];
};

type RsvpCustomFieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number';

type RsvpCustomField = {
  id: string;
  label: string;
  type: RsvpCustomFieldType;
  required: boolean;
  placeholder: string;
  options: string[];
};

const defaultRsvpFormSettings: RsvpFormSettings = {
  guestNameLabel: 'Guest Name',
  guestNamePlaceholder: '',
  emailLabel: 'Email',
  emailPlaceholder: '',
  phoneLabel: 'Phone Number',
  phonePlaceholder: '',
  attendanceEnabled: true,
  attendanceLabel: 'Will you attend?',
  attendanceYesLabel: 'YES, I WILL ATTEND',
  attendanceNoLabel: 'UNABLE TO ATTEND',
  commentsLabel: 'Additional Comments',
  commentsPlaceholder: '',
  submitLabel: 'Submit',
  customFields: [],
};

const CUSTOM_FIELD_TYPES: RsvpCustomFieldType[] = [
  'text',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'number',
];

const createCustomFieldId = () =>
  globalThis.crypto && 'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `form_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createEmptyCustomField = (): RsvpCustomField => ({
  id: createCustomFieldId(),
  label: '',
  type: 'text',
  required: false,
  placeholder: '',
  options: [],
});

const normalizeCustomField = (field: any, index: number): RsvpCustomField => ({
  id:
    typeof field?.id === 'string' && field.id.trim()
      ? field.id.trim()
      : `custom_field_${index + 1}`,
  label:
    typeof field?.label === 'string' && field.label.trim()
      ? field.label.trim()
      : `Question ${index + 1}`,
  type: CUSTOM_FIELD_TYPES.includes(field?.type) ? field.type : 'text',
  required: field?.required === true,
  placeholder: typeof field?.placeholder === 'string' ? field.placeholder : '',
  options: Array.isArray(field?.options)
    ? field.options.map((option: any) => String(option || '').trim()).filter(Boolean)
    : [],
});

const normalizeRsvpFormSettings = (settings: any): RsvpFormSettings => ({
  ...defaultRsvpFormSettings,
  ...(settings || {}),
  submitLabel: 'Submit',
  customFields: Array.isArray(settings?.customFields)
    ? settings.customFields.map((field: any, index: number) => normalizeCustomField(field, index))
    : [],
});

const customFieldNeedsOptions = (type: RsvpCustomFieldType) =>
  type === 'select' || type === 'radio' || type === 'checkbox';

const formatCustomFieldType = (type: RsvpCustomFieldType) =>
  type === 'textarea' ? 'Textarea' : type.charAt(0).toUpperCase() + type.slice(1);

type RsvpEventStatusFilter = 'all' | 'active' | 'expired';
type RsvpEventStatusLabel = 'Active' | 'Expired' | 'Inactive';

type EventCatalogRecord = {
  _id: string;
  name: string;
  date: string;
  location: string;
  description?: string;
  servicePackage?: string;
  channelConfig?: any;
  isActive?: boolean;
  eventStatus?: 'active' | 'expired';
};

const emptySummary = { yes: 0, no: 0, pending: 0, total: 0, sent: 0 };
const EVENT_EXPIRATION_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

const defaultAddGuestFormState: AddGuestFormState = {
  guestName: '',
  email: '',
  phone: '',
  guestCount: '1',
  tag: '',
};

const defaultEditGuestFormState: EditGuestFormState = {
  guestName: '',
  email: '',
  phone: '',
  attendanceStatus: 'pending',
  guestCount: '1',
  tag: '',
};

const parseGuestCountInput = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return NaN;
  return Math.max(1, Math.trunc(parsed));
};

const normalizeTagValue = (value?: string | null) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeEventDateValue = (value?: string) =>
  String(value || '').replace(/(\d+)(st|nd|rd|th)/gi, '$1');

const getEventDateTimestamp = (value?: string) => {
  const parsed = new Date(normalizeEventDateValue(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
};

const getEventStatusLabel = (event?: Partial<EventCatalogRecord> | null): RsvpEventStatusLabel => {
  if (!event) return 'Active';
  if (event.eventStatus === 'expired') return 'Expired';

  const eventTimestamp = getEventDateTimestamp(event.date);
  if (eventTimestamp && Date.now() > eventTimestamp + EVENT_EXPIRATION_GRACE_MS) {
    return 'Expired';
  }

  if (event.isActive === false) {
    return 'Inactive';
  }

  return 'Active';
};

const matchesEventStatusFilter = (
  event: Partial<EventCatalogRecord>,
  filter: RsvpEventStatusFilter
) => {
  if (filter === 'all') return true;

  const status = getEventStatusLabel(event);
  if (filter === 'active') return status === 'Active';
  return status === 'Expired';
};

const formatEventDateDisplay = (value?: string) => {
  if (!value) return 'Date not set';

  const parsed = new Date(normalizeEventDateValue(value));
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const getEventRelativeTimeline = (value?: string) => {
  const eventTimestamp = getEventDateTimestamp(value);
  if (!eventTimestamp) {
    return 'Add a valid event date to unlock timeline context.';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((eventTimestamp - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Happening today';
  if (diffDays === 1) return 'Happening tomorrow';
  if (diffDays === -1) return 'Happened yesterday';
  if (diffDays > 1) return `Happening in ${diffDays} days`;
  return `Happened ${Math.abs(diffDays)} days ago`;
};

const getEventModeDisplay = (servicePackage?: string) =>
  servicePackage === 'invitation-only' ? 'Invitation Only' : 'Scheduler Driven';

const getEventChannelsLabel = (event?: Partial<EventCatalogRecord> | null) => {
  const enabledChannels = ['Email'];

  if (event?.channelConfig?.whatsapp?.enabled) {
    enabledChannels.push('WhatsApp');
  }

  if (event?.channelConfig?.bulkSms?.enabled) {
    enabledChannels.push('SMS');
  }

  return enabledChannels.join(' • ');
};

const getEventFilterEmptyMessage = (filter: RsvpEventStatusFilter) => {
  if (filter === 'active') return 'No active events available';
  if (filter === 'expired') return 'No expired events available';
  return 'No events available';
};

export function RsvpAdminView() {
  const theme = useTheme();
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<any | null>(null);
  const [events, setEvents] = useState<EventCatalogRecord[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventFilter, setEventFilter] = useState<RsvpEventStatusFilter>('all');
  const [guests, setGuests] = useState<RsvpRecord[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [mode, setMode] = useState<'rsvp' | 'invitation-only'>('rsvp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newGuest, setNewGuest] = useState<AddGuestFormState>(defaultAddGuestFormState);
  const [editTarget, setEditTarget] = useState<RsvpRecord | null>(null);
  const [editGuest, setEditGuest] = useState<EditGuestFormState>(defaultEditGuestFormState);
  const [editLoading, setEditLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [guestSearch, setGuestSearch] = useState('');
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [guestPage, setGuestPage] = useState(0);
  const [guestRowsPerPage, setGuestRowsPerPage] = useState(10);
  const [submissionPage, setSubmissionPage] = useState(0);
  const [submissionRowsPerPage, setSubmissionRowsPerPage] = useState(10);
  const [formLink, setFormLink] = useState('');
  const [formLinkTitle, setFormLinkTitle] = useState('');
  const [rsvpBgColor, setRsvpBgColor] = useState('#111827');
  const [rsvpAccentColor, setRsvpAccentColor] = useState('#1f2937');
  const [rsvpFormSettings, setRsvpFormSettings] =
    useState<RsvpFormSettings>(defaultRsvpFormSettings);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadRequestRef = useRef(0);
  const [deleteTarget, setDeleteTarget] = useState<RsvpRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [messageSequence, setMessageSequence] = useState<MessageSequenceItem[]>([]);
  const [sequenceSaving, setSequenceSaving] = useState(false);
  const [analyticsStart, setAnalyticsStart] = useState('');
  const [analyticsEnd, setAnalyticsEnd] = useState('');
  const [schedulePage, setSchedulePage] = useState(0);
  const [scheduleRowsPerPage, setScheduleRowsPerPage] = useState(10);

  const token = useMemo(() => localStorage.getItem('token') || '', []);
  const conversionRate = useMemo(
    () => (summary.total ? Math.round((summary.yes / summary.total) * 100) : 0),
    [summary.total, summary.yes]
  );
  const respondedCount = useMemo(
    () => Math.max(0, summary.total - summary.pending),
    [summary.total, summary.pending]
  );
  const formSubmissions = useMemo(
    () => guests.filter((g) => g.source === 'form_submission'),
    [guests]
  );
  const availableTags = useMemo(
    () => {
      const deduped = new Map<string, string>();
      guests.forEach((guest) => {
        const normalizedTag = normalizeTagValue(guest.tag);
        if (!normalizedTag) return;
        const key = normalizedTag.toLowerCase();
        if (!deduped.has(key)) {
          deduped.set(key, normalizedTag);
        }
      });
      return [...deduped.values()].sort((left, right) =>
        left.localeCompare(right, undefined, { sensitivity: 'base' })
      );
    },
    [guests]
  );
  const filteredGuests = useMemo(() => {
    const query = guestSearch.trim().toLowerCase();
    if (!query) return guests;

    return guests.filter(
      (guest) =>
        guest.guestName?.toLowerCase().includes(query) ||
        guest.email?.toLowerCase().includes(query) ||
        guest.tag?.toLowerCase().includes(query)
    );
  }, [guests, guestSearch]);
  const filteredFormSubmissions = useMemo(() => {
    const query = submissionSearch.trim().toLowerCase();
    if (!query) return formSubmissions;

    return formSubmissions.filter(
      (guest) =>
        guest.guestName?.toLowerCase().includes(query) ||
        guest.email?.toLowerCase().includes(query) ||
        guest.tag?.toLowerCase().includes(query)
    );
  }, [formSubmissions, submissionSearch]);
  const paginatedGuests = useMemo(
    () =>
      filteredGuests.slice(
        guestPage * guestRowsPerPage,
        guestPage * guestRowsPerPage + guestRowsPerPage
      ),
    [filteredGuests, guestPage, guestRowsPerPage]
  );
  const paginatedFormSubmissions = useMemo(
    () =>
      filteredFormSubmissions.slice(
        submissionPage * submissionRowsPerPage,
        submissionPage * submissionRowsPerPage + submissionRowsPerPage
      ),
    [filteredFormSubmissions, submissionPage, submissionRowsPerPage]
  );
  const filteredEvents = useMemo(() => {
    const statusSortWeight: Record<RsvpEventStatusLabel, number> = {
      Active: 0,
      Inactive: 1,
      Expired: 2,
    };

    return [...events]
      .filter((item) => matchesEventStatusFilter(item, eventFilter))
      .sort((left, right) => {
        const statusDiff =
          statusSortWeight[getEventStatusLabel(left)] -
          statusSortWeight[getEventStatusLabel(right)];

        if (statusDiff !== 0 && eventFilter === 'all') {
          return statusDiff;
        }

        const leftTimestamp = getEventDateTimestamp(left.date) ?? Number.MAX_SAFE_INTEGER;
        const rightTimestamp = getEventDateTimestamp(right.date) ?? Number.MAX_SAFE_INTEGER;

        if (leftTimestamp !== rightTimestamp) {
          return leftTimestamp - rightTimestamp;
        }

        return left.name.localeCompare(right.name);
      });
  }, [events, eventFilter]);
  const selectedEventOption = useMemo(
    () => events.find((item) => item._id === eventId) || null,
    [events, eventId]
  );
  const eventStatus = useMemo(
    () => getEventStatusLabel(event || selectedEventOption),
    [event, selectedEventOption]
  );
  const eventStatusColor = useMemo(() => {
    if (eventStatus === 'Expired') return 'error';
    if (eventStatus === 'Inactive') return 'warning';
    return 'success';
  }, [eventStatus]);
  const eventModeLabel = useMemo(
    () => getEventModeDisplay(event?.servicePackage || selectedEventOption?.servicePackage),
    [event?.servicePackage, selectedEventOption?.servicePackage]
  );
  const eventChannelSummary = useMemo(
    () => getEventChannelsLabel(event || selectedEventOption),
    [event, selectedEventOption]
  );
  const eventFilterCounts = useMemo(
    () =>
      events.reduce(
        (acc, item) => {
          acc.all += 1;
          if (getEventStatusLabel(item) === 'Active') acc.active += 1;
          if (getEventStatusLabel(item) === 'Expired') acc.expired += 1;
          return acc;
        },
        { all: 0, active: 0, expired: 0 }
      ),
    [events]
  );
  const allowWhatsApp = useMemo(
    () => !!event?.channelConfig?.whatsapp?.enabled,
    [event?.channelConfig?.whatsapp?.enabled]
  );
  const allowSms = useMemo(
    () => !!event?.channelConfig?.bulkSms?.enabled,
    [event?.channelConfig?.bulkSms?.enabled]
  );
  const canEditSequence = mode !== 'invitation-only';
  const sequencePayload = useMemo(
    () =>
      canEditSequence ? serializeMessageSequence(messageSequence, allowWhatsApp, allowSms) : [],
    [canEditSequence, messageSequence, allowWhatsApp, allowSms]
  );
  const sequenceJson = useMemo(
    () => (sequencePayload.length ? JSON.stringify(sequencePayload, null, 2) : ''),
    [sequencePayload]
  );
  const updateCustomField = useCallback((fieldId: string, updates: Partial<RsvpCustomField>) => {
    setRsvpFormSettings((prev) => ({
      ...prev,
      customFields: prev.customFields.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      ),
    }));
  }, []);
  const addCustomField = useCallback(() => {
    setRsvpFormSettings((prev) => ({
      ...prev,
      customFields: [...prev.customFields, createEmptyCustomField()],
    }));
  }, []);
  const removeCustomField = useCallback((fieldId: string) => {
    setRsvpFormSettings((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((field) => field.id !== fieldId),
    }));
  }, []);

  const timelinePoints = analytics?.timeline || [];
  const timelineCategories = timelinePoints.map((point: any) => point.date);
  const timelineSeries = timelinePoints.map((point: any) => point.count);

  const emailSent = analytics?.email?.sent ?? analytics?.channels?.email?.sent ?? 0;
  const emailOpens = analytics?.email?.opens ?? analytics?.channels?.email?.opens ?? 0;
  const emailClicks = analytics?.email?.clicks ?? analytics?.channels?.email?.clicks ?? 0;
  const emailOpenRate =
    analytics?.email?.openRate ?? (emailSent ? (emailOpens / emailSent) * 100 : 0);
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
  const paginatedSchedules = useMemo(
    () =>
      schedules.slice(
        schedulePage * scheduleRowsPerPage,
        schedulePage * scheduleRowsPerPage + scheduleRowsPerPage
      ),
    [schedules, schedulePage, scheduleRowsPerPage]
  );

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

  const resetEventView = useCallback(() => {
    loadRequestRef.current += 1;
    setLoading(false);
    setEvent(null);
    setGuests([]);
    setSummary(emptySummary);
    setMode('rsvp');
    setGuestSearch('');
    setSubmissionSearch('');
    setGuestPage(0);
    setSubmissionPage(0);
    setFormLink('');
    setFormLinkTitle('');
    setRsvpBgColor('#111827');
    setRsvpAccentColor('#1f2937');
    setRsvpFormSettings(defaultRsvpFormSettings);
    setSchedules([]);
    setReports([]);
    setAnalytics(null);
    setMessageSequence([]);
    setSchedulePage(0);
  }, []);

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
      const requestId = loadRequestRef.current + 1;
      loadRequestRef.current = requestId;

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

        if (loadRequestRef.current !== requestId) return;

        const nextEvent = eventRes.data?.event || eventRes.data;
        setEvent(nextEvent);
        setFormLinkTitle(nextEvent?.name || '');
        setEvents((prev) =>
          prev.map((item) => (item._id === nextEvent?._id ? { ...item, ...nextEvent } : item))
        );
        if (nextEvent?.servicePackage !== 'invitation-only') {
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
        if (nextEvent?.rsvpBgColor) {
          setRsvpBgColor(rgbToHex(nextEvent.rsvpBgColor));
        } else {
          setRsvpBgColor('#111827');
        }
        if (nextEvent?.rsvpAccentColor) {
          setRsvpAccentColor(rgbToHex(nextEvent.rsvpAccentColor));
        } else {
          setRsvpAccentColor('#1f2937');
        }
        if (nextEvent?.rsvpFormSettings) {
          setRsvpFormSettings(normalizeRsvpFormSettings(nextEvent.rsvpFormSettings));
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
        setSummary({ ...emptySummary, ...reportSummary });
        try {
          const schedulesRes = await axios.get(
            `${API_BASE}/events/${currentEventId}/rsvp/schedules`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (loadRequestRef.current === requestId) {
            setSchedules(schedulesRes.data?.schedules || []);
            setSchedulePage(0);
          }
        } catch {
          if (loadRequestRef.current === requestId) {
            setSchedules([]);
            setSchedulePage(0);
          }
        }
        try {
          const reportsRes = await axios.get(`${API_BASE}/events/${currentEventId}/rsvp/reports`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (loadRequestRef.current === requestId) {
            setReports(reportsRes.data?.reports || []);
          }
        } catch {
          if (loadRequestRef.current === requestId) {
            setReports([]);
          }
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
          const [overviewRes, channelsRes, timelineRes, emailRes, whatsappRes, smsRes] =
            await Promise.allSettled(requests);

          if (loadRequestRef.current !== requestId) return;

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
          if (loadRequestRef.current === requestId) {
            setAnalytics(null);
          }
        }
      } catch (err: any) {
        if (loadRequestRef.current !== requestId) return;
        console.error('RSVP admin load error:', err);
        setError(err?.response?.data?.message || 'Failed to load RSVP data');
      } finally {
        if (loadRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    const loadEventsCatalog = async () => {
      setEventsLoading(true);
      try {
        const storedIds = localStorage.getItem('allRowIds');
        let preferredEventId: string | null = null;

        if (storedIds) {
          try {
            const parsed = JSON.parse(storedIds);
            preferredEventId = Array.isArray(parsed) && parsed.length ? parsed[0] : null;
          } catch {
            preferredEventId = null;
          }
        }

        const eventsRes = await axios.get(`${API_BASE}/events/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const nextEvents: EventCatalogRecord[] = Array.isArray(eventsRes.data?.events)
          ? eventsRes.data.events
          : [];
        setEvents(nextEvents);

        if (!nextEvents.length) {
          setEventId(null);
          resetEventView();
          setError('No events available yet.');
          return;
        }

        const nextEventId =
          (preferredEventId && nextEvents.some((item) => item._id === preferredEventId)
            ? preferredEventId
            : null) ||
          nextEvents.find((item) => getEventStatusLabel(item) === 'Active')?._id ||
          nextEvents[0]?._id ||
          null;

        if (!nextEventId) {
          setEventId(null);
          resetEventView();
          setError('No events available yet.');
          return;
        }

        setGuestSearch('');
        setSubmissionSearch('');
        setGuestPage(0);
        setSubmissionPage(0);
        setFormLink('');
        setEventId(nextEventId);
        localStorage.setItem('allRowIds', JSON.stringify([nextEventId]));
        await loadData(nextEventId);
      } catch (err: any) {
        console.error('RSVP admin event catalog load error:', err);
        setEvents([]);
        setEventId(null);
        resetEventView();
        setError(err?.response?.data?.message || 'Failed to load events');
      } finally {
        setEventsLoading(false);
      }
    };

    loadEventsCatalog();
  }, [loadData, resetEventView, token]);

  useEffect(() => {
    if (eventsLoading || !events.length) {
      return;
    }

    if (!filteredEvents.length) {
      setEventId(null);
      resetEventView();
      return;
    }

    if (!eventId || !filteredEvents.some((item) => item._id === eventId)) {
      const nextEventId = filteredEvents[0]?._id;
      if (!nextEventId) return;

      setGuestSearch('');
      setSubmissionSearch('');
      setGuestPage(0);
      setSubmissionPage(0);
      setFormLink('');
      setEventId(nextEventId);
      localStorage.setItem('allRowIds', JSON.stringify([nextEventId]));
      loadData(nextEventId, {
        start: analyticsStart || undefined,
        end: analyticsEnd || undefined,
      });
    }
  }, [
    analyticsEnd,
    analyticsStart,
    eventId,
    events.length,
    eventsLoading,
    filteredEvents,
    loadData,
    resetEventView,
  ]);

  useEffect(() => {
    setGuestPage(0);
  }, [guestSearch]);

  useEffect(() => {
    setSubmissionPage(0);
  }, [submissionSearch]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredGuests.length / guestRowsPerPage) - 1);
    if (guestPage > maxPage) {
      setGuestPage(maxPage);
    }
  }, [filteredGuests.length, guestPage, guestRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil(filteredFormSubmissions.length / submissionRowsPerPage) - 1
    );
    if (submissionPage > maxPage) {
      setSubmissionPage(maxPage);
    }
  }, [filteredFormSubmissions.length, submissionPage, submissionRowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(schedules.length / scheduleRowsPerPage) - 1);
    if (schedulePage > maxPage) {
      setSchedulePage(maxPage);
    }
  }, [schedules.length, schedulePage, scheduleRowsPerPage]);

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
    if (mode !== 'invitation-only') {
      const parsedGuestCount = parseGuestCountInput(newGuest.guestCount);
      if (Number.isNaN(parsedGuestCount) || parsedGuestCount < 1) {
        toast.error('Guest count must be at least 1');
        return;
      }
    }

    try {
      await axios.post(
        `${API_BASE}/events/${eventId}/rsvp/guests`,
        {
          guestName: newGuest.guestName,
          email: newGuest.email,
          phone: newGuest.phone,
          ...(mode === 'invitation-only'
            ? {}
            : {
                guestCount: parseGuestCountInput(newGuest.guestCount),
                tag: normalizeTagValue(newGuest.tag),
              }),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success(mode === 'invitation-only' ? 'Invitation guest added' : 'RSVP guest added');
      setAddOpen(false);
      setNewGuest(defaultAddGuestFormState);
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
      toast.success(
        mode === 'invitation-only' ? 'Invitation guests imported' : 'RSVP guests imported'
      );
      reloadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed');
    }
  };

  const openEditGuestDialog = useCallback((guest: RsvpRecord) => {
    setEditTarget(guest);
    setEditGuest({
      guestName: guest.guestName || '',
      email: guest.email || '',
      phone: guest.phone || '',
      attendanceStatus: guest.attendanceStatus || 'pending',
      guestCount: String(guest.guestCount || 1),
      tag: guest.tag || '',
    });
  }, []);

  const closeEditGuestDialog = useCallback(() => {
    if (editLoading) return;
    setEditTarget(null);
    setEditGuest(defaultEditGuestFormState);
  }, [editLoading]);

  const handleEditGuest = async () => {
    if (!editTarget) return;
    if (!editGuest.guestName.trim()) {
      toast.error('Guest name is required');
      return;
    }
    if (mode !== 'invitation-only') {
      const parsedGuestCount = parseGuestCountInput(editGuest.guestCount);
      if (Number.isNaN(parsedGuestCount) || parsedGuestCount < 1) {
        toast.error('Guest count must be at least 1');
        return;
      }
    }

    try {
      setEditLoading(true);
      await axios.put(
        `${API_BASE}/rsvp/${editTarget._id}`,
        {
          guestName: editGuest.guestName,
          email: editGuest.email,
          phone: editGuest.phone,
          ...(mode === 'invitation-only'
            ? {}
            : {
                attendanceStatus: editGuest.attendanceStatus,
                guestCount: parseGuestCountInput(editGuest.guestCount),
                tag: normalizeTagValue(editGuest.tag),
              }),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(mode === 'invitation-only' ? 'Invitation guest updated' : 'RSVP guest updated');
      closeEditGuestDialog();
      reloadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update guest');
    } finally {
      setEditLoading(false);
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
        mode === 'invitation-only'
          ? `event-${eventId}-invitation.csv`
          : `event-${eventId}-rsvp.csv`;
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
        {
          publicBaseUrl: window.location.origin,
          customLinkTitle: formLinkTitle.trim(),
        },
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
      await axios.post(
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

  const handleCopyShareLink = async (tokenValue?: string) => {
    if (!eventId || !tokenValue) return;
    const shareUrl = `${API_BASE}/events/${eventId}/rsvp/shareable-report/${tokenValue}`;
    try {
      const res = await axios.get(shareUrl);
      const downloadUrl = res.data?.fileUrl || shareUrl;
      await navigator.clipboard.writeText(downloadUrl);
      toast.success('Report download link copied');
    } catch {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Shareable report endpoint copied');
    }
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
          rsvpBgColor: hexToRgb(rsvpBgColor),
          rsvpAccentColor: hexToRgb(rsvpAccentColor),
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
    const sanitizedCustomFields = rsvpFormSettings.customFields.map((field, index) => {
      const normalized = normalizeCustomField(field, index);
      return {
        ...normalized,
        options: customFieldNeedsOptions(normalized.type) ? normalized.options : [],
      };
    });
    const invalidOptionsField = sanitizedCustomFields.find(
      (field) => customFieldNeedsOptions(field.type) && field.options.length === 0
    );
    if (invalidOptionsField) {
      toast.error(`Add at least one option for "${invalidOptionsField.label}"`);
      return;
    }
    try {
      await axios.put(
        `${API_BASE}/events/events/${eventId}/rsvp-form-settings`,
        {
          rsvpFormSettings: {
            ...rsvpFormSettings,
            submitLabel: 'Submit',
            customFields: sanitizedCustomFields,
          },
        },
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
    const invalidStep = messageSequence.find(
      (item) => !item.scheduledDate || !item.messageTitle?.trim() || !item.messageBody?.trim()
    );
    if (invalidStep) {
      toast.error(
        'Each step must include Scheduled Date, Message Title, and Message Body. Attachment is optional.'
      );
      return;
    }
    const invalidTagStep = messageSequence.find(
      (item) => item.conditions.audienceType === 'tag' && !normalizeTagValue(item.conditions.targetTag)
    );
    if (invalidTagStep) {
      toast.error('Every tag-based message must include a recipient tag.');
      return;
    }
    try {
      setSequenceSaving(true);
      const formData = new FormData();
      formData.append('id', eventId);
      formData.append('customMessageSequence', sequenceJson || '[]');
      const attachmentFiles = collectSequenceAttachmentFiles(messageSequence);
      attachmentFiles.forEach(({ fieldName, file }) => {
        formData.append(fieldName, file, file.name);
      });
      formData.append('servicePackage', 'full-rsvp');

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
        'guestCount',
        'tag',
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

  const handleSelectEvent = useCallback(
    (nextEventId: string) => {
      if (!nextEventId) return;

      setGuestSearch('');
      setSubmissionSearch('');
      setFormLink('');
      setEventId(nextEventId);
      localStorage.setItem('allRowIds', JSON.stringify([nextEventId]));
      loadData(nextEventId, {
        start: analyticsStart || undefined,
        end: analyticsEnd || undefined,
      });
    },
    [analyticsEnd, analyticsStart, loadData]
  );

  return (
    <DashboardContent>
      <Box display="flex" alignItems="center" mb={3}>
        <Typography variant="h4" flexGrow={1}>
          RSVP Admin
        </Typography>
        {activeTab === 0 && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={() => setAddOpen(true)}
              startIcon={<Iconify icon="mingcute:add-line" />}
              disabled={!eventId || eventsLoading}
            >
              {mode === 'invitation-only' ? 'Add Invitation Guest' : 'Add RSVP Guest'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              startIcon={<Iconify icon="mdi:file-upload" />}
              disabled={!eventId || eventsLoading}
            >
              Import CSV
            </Button>
            {mode === 'invitation-only' && (
              <Button
                variant="outlined"
                onClick={() => handleSendInvites()}
                startIcon={<Iconify icon="mdi:email-fast" />}
                disabled={!eventId || eventsLoading}
              >
                Send Invitations
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={handleExportCsv}
              startIcon={<Iconify icon="mdi:file-download" />}
              disabled={!eventId || eventsLoading}
            >
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

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Card
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3 },
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.info.main, 0.12)}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.18)} 0%, ${theme.palette.background.paper} 46%, ${alpha(theme.palette.primary.light, 0.14)} 100%)`,
          boxShadow: `0 20px 48px ${alpha(theme.palette.common.black, 0.08)}`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -120,
            right: -70,
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.info.main, 0.2)} 0%, transparent 68%)`,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -150,
            left: -110,
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.14)} 0%, transparent 70%)`,
          },
        }}
      >
        <Stack spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} justifyContent="space-between">
            <Box sx={{ maxWidth: 760 }}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.75 }}>
                <Chip
                  size="small"
                  label="RSVP Control Center"
                  sx={{
                    bgcolor: alpha(theme.palette.info.main, 0.12),
                    color: 'info.dark',
                    fontWeight: 700,
                  }}
                />
                <Chip
                  size="small"
                  label={eventId ? eventStatus : 'No Event Selected'}
                  color={eventId ? eventStatusColor : 'default'}
                  variant={eventStatus === 'Inactive' ? 'outlined' : 'filled'}
                />
                <Chip size="small" label={eventModeLabel} variant="outlined" />
              </Stack>

              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.4 }}>
                Selected Event
              </Typography>
              <Typography variant="h3" sx={{ mt: 0.5, mb: 1 }}>
                {event?.name ||
                  selectedEventOption?.name ||
                  (eventsLoading ? 'Loading events...' : getEventFilterEmptyMessage(eventFilter))}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
                {event?.description?.trim() ||
                  selectedEventOption?.description?.trim() ||
                  'Move between events, review guest responses, manage invitations, and monitor activity from one polished workspace.'}
              </Typography>
            </Box>

            <Box
              sx={{
                width: { xs: '100%', lg: 380 },
                minWidth: { xs: '100%', lg: 340 },
                p: 2.5,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.background.paper, 0.84),
                border: `1px solid ${alpha(theme.palette.info.main, 0.12)}`,
                boxShadow: `0 18px 40px ${alpha(theme.palette.common.black, 0.08)}`,
                backdropFilter: 'blur(10px)',
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Browse Events
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                <Button
                  variant={eventFilter === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setEventFilter('all')}
                  fullWidth
                  sx={{ textTransform: 'none' }}
                >
                  All ({eventFilterCounts.all})
                </Button>
                <Button
                  variant={eventFilter === 'active' ? 'contained' : 'outlined'}
                  color={eventFilter === 'active' ? 'success' : 'inherit'}
                  onClick={() => setEventFilter('active')}
                  fullWidth
                  sx={{ textTransform: 'none' }}
                >
                  Active ({eventFilterCounts.active})
                </Button>
                <Button
                  variant={eventFilter === 'expired' ? 'contained' : 'outlined'}
                  color={eventFilter === 'expired' ? 'error' : 'inherit'}
                  onClick={() => setEventFilter('expired')}
                  fullWidth
                  sx={{ textTransform: 'none' }}
                >
                  Expired ({eventFilterCounts.expired})
                </Button>
              </Stack>

              <TextField
                select
                fullWidth
                label="Event"
                value={eventId || ''}
                onChange={(e) => handleSelectEvent(e.target.value)}
                disabled={eventsLoading || !filteredEvents.length}
                helperText={
                  filteredEvents.length
                    ? `${filteredEvents.length} of ${events.length} events in this view`
                    : getEventFilterEmptyMessage(eventFilter)
                }
              >
                {filteredEvents.map((item) => (
                  <MenuItem key={item._id} value={item._id}>
                    <Stack spacing={0.25}>
                      <Typography variant="body2" fontWeight={600}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {`${formatEventDateDisplay(item.date)} • ${item.location || 'Venue not set'} • ${getEventStatusLabel(item)}`}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  height: '100%',
                  p: 2,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.background.paper, 0.78),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                }}
              >
                <Stack direction="row" spacing={1.5}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                    }}
                  >
                    <Iconify icon="mdi:calendar-month-outline" width={22} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Event Date
                    </Typography>
                    <Typography variant="subtitle1">
                      {formatEventDateDisplay(event?.date || selectedEventOption?.date)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {getEventRelativeTimeline(event?.date || selectedEventOption?.date)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  height: '100%',
                  p: 2,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.background.paper, 0.78),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                }}
              >
                <Stack direction="row" spacing={1.5}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      color: 'success.main',
                    }}
                  >
                    <Iconify icon="mdi:map-marker-outline" width={22} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Venue
                    </Typography>
                    <Typography variant="subtitle1">
                      {event?.location || selectedEventOption?.location || 'Venue not set'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ready for invitee-facing details
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  height: '100%',
                  p: 2,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.background.paper, 0.78),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                }}
              >
                <Stack direction="row" spacing={1.5}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      color: 'info.main',
                    }}
                  >
                    <Iconify icon="mdi:message-badge-outline" width={22} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Channels & Mode
                    </Typography>
                    <Typography variant="subtitle1">{eventChannelSummary}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {eventModeLabel}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  height: '100%',
                  p: 2,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.background.paper, 0.78),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                }}
              >
                <Stack direction="row" spacing={1.5}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: alpha(theme.palette.warning.main, 0.12),
                      color: 'warning.dark',
                    }}
                  >
                    <Iconify icon="mdi:account-group-outline" width={22} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Guest Progress
                    </Typography>
                    <Typography variant="subtitle1">
                      {mode === 'invitation-only'
                        ? `${summary.sent || 0} invitation${summary.sent === 1 ? '' : 's'} sent`
                        : `${respondedCount} response${respondedCount === 1 ? '' : 's'} received`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {summary.pending} pending out of {summary.total} total guests
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Stack>
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

      <Tabs value={activeTab} onChange={(_, next) => setActiveTab(next)} sx={{ mb: 2 }}>
        <Tab label="RSVP Guest List" />
        <Tab label="RSVP Form" />
        <Tab label="Form Settings" />
        <Tab label="Settings" />
        <Tab label="Message Builder" />
        <Tab label="Email Schedule" />
        <Tab label="Reports" />
        <Tab label="Analytics" />
      </Tabs>
      <Divider sx={{ mb: 3 }} />

      {activeTab === 0 && (
        <Card sx={{ mb: 3 }}>
          <Box p={2} borderBottom="1px solid" borderColor="divider">
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', md: 'center' }}
            >
              <Box>
                <Typography variant="h6">RSVP Guest List</Typography>
                <Typography variant="body2" color="text.secondary">
                  Search guests by name, email, or tag to jump straight to the record you need.
                </Typography>
              </Box>
              <TextField
                size="small"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                placeholder="Search by name, email, or tag"
                sx={{ width: { xs: '100%', md: 280 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="solar:magnifer-linear" width={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          </Box>
          <Scrollbar>
            <TableContainer sx={{ minWidth: 900 }}>
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
                      <TableCell>Guests</TableCell>
                      <TableCell>Tag</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Submitted At</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  )}
                </TableHead>
                <TableBody>
                  {paginatedGuests.map((guest) =>
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
                            <Button variant="outlined" onClick={() => openEditGuestDialog(guest)}>
                              Edit
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
                        <TableCell>{guest.guestCount || 1}</TableCell>
                        <TableCell>{guest.tag || '—'}</TableCell>
                        <TableCell>{guest.attendanceStatus || 'pending'}</TableCell>
                        <TableCell>{guest.source || 'imported'}</TableCell>
                        <TableCell>
                          {guest.submissionDate
                            ? new Date(guest.submissionDate).toLocaleString()
                            : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button variant="outlined" onClick={() => openEditGuestDialog(guest)}>
                              Edit
                            </Button>
                            <Button color="error" onClick={() => setDeleteTarget(guest)}>
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                  {!loading && filteredGuests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={mode === 'invitation-only' ? 7 : 9} align="center">
                        {guestSearch.trim()
                          ? `No guest matches "${guestSearch.trim()}".`
                          : mode === 'invitation-only'
                            ? 'No invitation guests yet.'
                            : 'No RSVP guests yet.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>
          <TablePagination
            component="div"
            count={filteredGuests.length}
            page={guestPage}
            onPageChange={(_, nextPage) => setGuestPage(nextPage)}
            rowsPerPage={guestRowsPerPage}
            onRowsPerPageChange={(changeEvent) => {
              setGuestRowsPerPage(parseInt(changeEvent.target.value, 10));
              setGuestPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
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
            <Stack spacing={2}>
              <TextField
                label="Custom Link Title"
                value={formLinkTitle}
                onChange={(e) => setFormLinkTitle(e.target.value)}
                placeholder="Wedding Ceremony"
                disabled={!eventId || mode === 'invitation-only'}
                helperText="Optional. We will convert this into a URL-safe title before the token."
                fullWidth
              />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  onClick={handleGenerateFormLink}
                  disabled={!eventId || mode === 'invitation-only'}
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
                  disabled={!eventId || mode === 'invitation-only' || !formLink}
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
            </Stack>
          </Card>

          {mode !== 'invitation-only' && (
            <Card>
              <Box p={2} borderBottom="1px solid" borderColor="divider">
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', md: 'center' }}
                >
                  <Box>
                    <Typography variant="h6">Form Submissions</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Search submitted responses by name, email, or tag.
                    </Typography>
                  </Box>
                  <TextField
                    size="small"
                    value={submissionSearch}
                    onChange={(e) => setSubmissionSearch(e.target.value)}
                    placeholder="Search by name, email, or tag"
                    sx={{ width: { xs: '100%', md: 280 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Iconify icon="solar:magnifer-linear" width={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>
              </Box>
              <Scrollbar>
                <TableContainer sx={{ minWidth: 900 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Phone</TableCell>
                        <TableCell>Guests</TableCell>
                        <TableCell>Tag</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Submitted At</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedFormSubmissions.map((guest) => (
                        <TableRow key={guest._id}>
                          <TableCell>{guest.guestName}</TableCell>
                          <TableCell>{guest.email || '—'}</TableCell>
                          <TableCell>{guest.phone || '—'}</TableCell>
                          <TableCell>{guest.guestCount || 1}</TableCell>
                          <TableCell>{guest.tag || '—'}</TableCell>
                          <TableCell>{guest.attendanceStatus || 'pending'}</TableCell>
                          <TableCell>
                            {guest.submissionDate
                              ? new Date(guest.submissionDate).toLocaleString()
                              : '—'}
                          </TableCell>
                          <TableCell align="right">
                            <Button variant="outlined" onClick={() => openEditGuestDialog(guest)}>
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!loading && filteredFormSubmissions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            {submissionSearch.trim()
                              ? `No form submission matches "${submissionSearch.trim()}".`
                              : 'No form submissions yet.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Scrollbar>
              <TablePagination
                component="div"
                count={filteredFormSubmissions.length}
                page={submissionPage}
                onPageChange={(_, nextPage) => setSubmissionPage(nextPage)}
                rowsPerPage={submissionRowsPerPage}
                onRowsPerPageChange={(changeEvent) => {
                  setSubmissionRowsPerPage(parseInt(changeEvent.target.value, 10));
                  setSubmissionPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </Card>
          )}
        </Stack>
      )}

      {activeTab === 2 && (
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
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={rsvpFormSettings.attendanceEnabled}
                      onChange={(toggleEvent) =>
                        setRsvpFormSettings((prev) => ({
                          ...prev,
                          attendanceEnabled: toggleEvent.target.checked,
                        }))
                      }
                    />
                  }
                  label="Enable attendance question on the form"
                />
              </Grid>
              {rsvpFormSettings.attendanceEnabled && (
                <>
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
                      label="Attend Button Text"
                      value={rsvpFormSettings.attendanceYesLabel}
                      onChange={(e) =>
                        setRsvpFormSettings((prev) => ({
                          ...prev,
                          attendanceYesLabel: e.target.value,
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Unable To Attend Button Text"
                      value={rsvpFormSettings.attendanceNoLabel}
                      onChange={(e) =>
                        setRsvpFormSettings((prev) => ({
                          ...prev,
                          attendanceNoLabel: e.target.value,
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                </>
              )}
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
            </Grid>
            <Divider />
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="subtitle1">Additional Questions</Typography>
                  <Typography variant="body2" color="text.secondary">
                    These questions appear on the RSVP form only.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={addCustomField}
                >
                  Add Question
                </Button>
              </Stack>

              {rsvpFormSettings.customFields.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No additional questions yet.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {rsvpFormSettings.customFields.map((field, index) => (
                    <Card key={field.id} variant="outlined" sx={{ p: 2 }}>
                      <Stack spacing={2}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={2}
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          justifyContent="space-between"
                        >
                          <Typography variant="subtitle2">Question {index + 1}</Typography>
                          <Button color="error" onClick={() => removeCustomField(field.id)}>
                            Remove
                          </Button>
                        </Stack>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Question Label"
                              value={field.label}
                              onChange={(e) =>
                                updateCustomField(field.id, { label: e.target.value })
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              select
                              label="Field Type"
                              value={field.type}
                              onChange={(e) => {
                                const nextType = e.target.value as RsvpCustomFieldType;
                                updateCustomField(field.id, {
                                  type: nextType,
                                  options: customFieldNeedsOptions(nextType) ? field.options : [],
                                });
                              }}
                              fullWidth
                            >
                              {CUSTOM_FIELD_TYPES.map((type) => (
                                <MenuItem key={type} value={type}>
                                  {formatCustomFieldType(type)}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Placeholder"
                              value={field.placeholder}
                              onChange={(e) =>
                                updateCustomField(field.id, { placeholder: e.target.value })
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={field.required}
                                  onChange={(e) =>
                                    updateCustomField(field.id, { required: e.target.checked })
                                  }
                                />
                              }
                              label="Required question"
                            />
                          </Grid>
                          {customFieldNeedsOptions(field.type) && (
                            <Grid item xs={12}>
                              <TextField
                                label="Options"
                                value={field.options.join('\n')}
                                onChange={(e) =>
                                  updateCustomField(field.id, {
                                    options: e.target.value
                                      .split('\n')
                                      .map((option) => option.trim())
                                      .filter(Boolean),
                                  })
                                }
                                fullWidth
                                multiline
                                minRows={4}
                                helperText="Enter one option per line."
                              />
                            </Grid>
                          )}
                        </Grid>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
            <Box>
              <Button variant="contained" onClick={handleRsvpFormSettings}>
                Save RSVP Form Settings
              </Button>
            </Box>
          </Stack>
        </Card>
      )}

      {activeTab === 3 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" mb={2}>
            RSVP Settings
          </Typography>
          <Stack spacing={3}>
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
            <Box>
              <Button variant="contained" onClick={handleSaveRsvpSettings}>
                Save RSVP Settings
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
              Message sequencing is disabled for invitation-only events.
            </Typography>
          ) : (
            <Stack spacing={2}>
              <MessageSequenceBuilder
                value={messageSequence}
                onChange={setMessageSequence}
                allowWhatsApp={allowWhatsApp}
                allowSms={allowSms}
                availableTags={availableTags}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() =>
                    setMessageSequence(
                      getDefaultMessageSequence('full-rsvp', allowWhatsApp, allowSms)
                    )
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
                    <TableCell>Attachment</TableCell>
                    <TableCell>Channel</TableCell>
                    <TableCell>Audience</TableCell>
                    <TableCell>Scheduled</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSchedules.map((schedule) => (
                    <TableRow key={schedule._id}>
                      <TableCell>
                        {schedule.messageTitle || schedule.messageName || schedule.messageType}
                      </TableCell>
                      <TableCell>
                        {schedule.attachment?.url ? (
                          <a href={schedule.attachment.url} target="_blank" rel="noreferrer">
                            {schedule.attachment?.filename || 'View Attachment'}
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{schedule.channel}</TableCell>
                      <TableCell>
                        {getMessageAudienceLabel(schedule.targetAudience, schedule.targetTag)}
                      </TableCell>
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
                      <TableCell colSpan={7} align="center">
                        No schedules yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>
          <TablePagination
            component="div"
            count={schedules.length}
            page={schedulePage}
            onPageChange={(_, nextPage) => setSchedulePage(nextPage)}
            rowsPerPage={scheduleRowsPerPage}
            onRowsPerPageChange={(changeEvent) => {
              setScheduleRowsPerPage(parseInt(changeEvent.target.value, 10));
              setSchedulePage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
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

      <Dialog
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setNewGuest(defaultAddGuestFormState);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {mode === 'invitation-only' ? 'Add Invitation Guest' : 'Add RSVP Guest'}
        </DialogTitle>
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
            {mode !== 'invitation-only' && (
              <>
                <TextField
                  label="Guest Count"
                  type="number"
                  value={newGuest.guestCount}
                  onChange={(e) =>
                    setNewGuest((prev) => ({ ...prev, guestCount: e.target.value }))
                  }
                  inputProps={{ min: 1, step: 1 }}
                  fullWidth
                />
                <TextField
                  label="Tag"
                  value={newGuest.tag}
                  onChange={(e) => setNewGuest((prev) => ({ ...prev, tag: e.target.value }))}
                  fullWidth
                  helperText="Optional. Use tags like VIP, Family, Vendors, Table-A."
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddOpen(false);
              setNewGuest(defaultAddGuestFormState);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddGuest}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editTarget)} onClose={closeEditGuestDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {mode === 'invitation-only' ? 'Edit Invitation Guest' : 'Edit RSVP Guest'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Full name"
              value={editGuest.guestName}
              onChange={(e) => setEditGuest((prev) => ({ ...prev, guestName: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Email"
              value={editGuest.email}
              onChange={(e) => setEditGuest((prev) => ({ ...prev, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Phone"
              value={editGuest.phone}
              onChange={(e) => setEditGuest((prev) => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />
            {mode !== 'invitation-only' && (
              <>
                <TextField
                  label="Guest Count"
                  type="number"
                  value={editGuest.guestCount}
                  onChange={(e) =>
                    setEditGuest((prev) => ({ ...prev, guestCount: e.target.value }))
                  }
                  inputProps={{ min: 1, step: 1 }}
                  fullWidth
                />
                <TextField
                  label="Tag"
                  value={editGuest.tag}
                  onChange={(e) => setEditGuest((prev) => ({ ...prev, tag: e.target.value }))}
                  fullWidth
                  helperText="Optional. Tags are used for message-builder targeting."
                />
                <TextField
                  select
                  label="Attendance Status"
                  value={editGuest.attendanceStatus}
                  onChange={(e) =>
                    setEditGuest((prev) => ({
                      ...prev,
                      attendanceStatus: e.target.value as RsvpAttendanceStatus,
                    }))
                  }
                  fullWidth
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </TextField>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditGuestDialog} disabled={editLoading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleEditGuest} disabled={editLoading}>
            {editLoading ? 'Saving...' : 'Save'}
          </Button>
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
