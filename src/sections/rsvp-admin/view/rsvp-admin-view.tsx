import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
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
import { AnalyticsWidgetSummary } from 'src/sections/overview/analytics-widget-summary';

type RsvpRecord = {
  _id: string;
  guestName: string;
  email?: string;
  phone?: string;
  attendanceStatus: 'pending' | 'yes' | 'no';
  submissionDate?: string;
  source: 'imported' | 'form_submission';
};

export function RsvpAdminView() {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<any | null>(null);
  const [guests, setGuests] = useState<RsvpRecord[]>([]);
  const [summary, setSummary] = useState({ yes: 0, no: 0, pending: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({ guestName: '', email: '', phone: '' });
  const [activeTab, setActiveTab] = useState(0);
  const [formLink, setFormLink] = useState('');
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [rsvpBgColor, setRsvpBgColor] = useState('#111827');
  const [rsvpAccentColor, setRsvpAccentColor] = useState('#1f2937');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<RsvpRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const token = useMemo(() => localStorage.getItem('token') || '', []);
  const conversionRate = useMemo(
    () => (summary.total ? Math.round((summary.yes / summary.total) * 100) : 0),
    [summary.total, summary.yes]
  );
  const formSubmissions = useMemo(
    () => guests.filter((g) => g.source === 'form_submission'),
    [guests]
  );

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

  const loadData = useCallback(async (currentEventId: string) => {
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
      if (nextEvent?.rsvpMessage !== undefined) {
        setRsvpMessage(nextEvent.rsvpMessage || '');
      }
      if (nextEvent?.rsvpBgColor) {
        setRsvpBgColor(rgbToHex(nextEvent.rsvpBgColor));
      }
      if (nextEvent?.rsvpAccentColor) {
        setRsvpAccentColor(rgbToHex(nextEvent.rsvpAccentColor));
      }
      setGuests(guestsRes.data?.rsvps || []);
      const reportSummary = guestsRes.data?.summary || {};
      setSummary({ yes: 0, no: 0, pending: 0, total: 0, ...reportSummary });
    } catch (err: any) {
      console.error('RSVP admin load error:', err);
      setError(err?.response?.data?.message || 'Failed to load RSVP data');
    } finally {
      setLoading(false);
    }
  }, [token]);

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
      toast.success('RSVP guest added');
      setAddOpen(false);
      setNewGuest({ guestName: '', email: '', phone: '' });
      loadData(eventId);
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
      toast.success('RSVP guests imported');
      loadData(eventId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed');
    }
  };

  const handleSendInvites = async () => {
    if (!eventId) return;
    try {
      await axios.post(
        `${API_BASE}/events/${eventId}/rsvp/send`,
        { publicBaseUrl: API_BASE },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('RSVP invites sent');
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
      link.download = `event-${eventId}-rsvp.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('RSVP CSV download started');
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

  const handleSaveRsvpSettings = async () => {
    if (!eventId) return;
    try {
      await axios.put(
        `${API_BASE}/events/events/${eventId}/rsvp-settings`,
        {
          rsvpMessage,
          rsvpBgColor: hexToRgb(rsvpBgColor),
          rsvpAccentColor: hexToRgb(rsvpAccentColor),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('RSVP settings saved');
      loadData(eventId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save RSVP settings');
    }
  };

  const handleDeleteGuest = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await axios.delete(`${API_BASE}/rsvp/${deleteTarget._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('RSVP guest removed');
      if (eventId) loadData(eventId);
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
            Add RSVP Guest
          </Button>
          <Button variant="outlined" onClick={() => fileInputRef.current?.click()} startIcon={<Iconify icon="mdi:file-upload" />}>
            Import CSV
          </Button>
          <Button variant="outlined" onClick={handleSendInvites} startIcon={<Iconify icon="mdi:email-fast" />}>
            Send RSVP Emails
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
      </Card>

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

      <Tabs
        value={activeTab}
        onChange={(_, next) => setActiveTab(next)}
        sx={{ mb: 2 }}
      >
        <Tab label="RSVP Guest List" />
        <Tab label="RSVP Form" />
        <Tab label="Settings" />
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
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Submitted At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {guests.map((guest) => (
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
                  ))}
                  {!loading && guests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No RSVP guests yet.
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
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>
              RSVP Form Generator
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <Button variant="contained" onClick={handleGenerateFormLink}>
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
            <Box>
              <Button variant="contained" onClick={handleSaveRsvpSettings}>
                Save RSVP Settings
              </Button>
            </Box>
          </Stack>
        </Card>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add RSVP Guest</DialogTitle>
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
        <DialogTitle>Delete RSVP guest?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteTarget
              ? `This will permanently delete ${deleteTarget.guestName} from the RSVP list.`
              : 'This will permanently delete this RSVP guest.'}
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
