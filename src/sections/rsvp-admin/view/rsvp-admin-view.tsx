import { useEffect, useMemo, useRef, useState } from 'react';
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
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

import { toast } from 'react-toastify';
import { API_BASE } from 'src/utils/apiBase';
import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify/iconify';
import { Scrollbar } from 'src/components/scrollbar';

const DEFAULT_FIELDS = [
  {
    name: 'attendance',
    label: 'Will you attend?',
    type: 'radio',
    required: true,
    options: ['yes', 'no', 'maybe'],
  },
  {
    name: 'extraGuestCount',
    label: 'How many additional guests will you bring?',
    type: 'number',
    required: false,
  },
  {
    name: 'comments',
    label: 'Comments',
    type: 'textarea',
    required: false,
  },
];

type RsvpGuest = {
  _id: string;
  fullname: string;
  email?: string;
  phone?: string;
  rsvpStatus?: string;
  rsvpRespondedAt?: string;
};

export function RsvpAdminView() {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<any | null>(null);
  const [guests, setGuests] = useState<RsvpGuest[]>([]);
  const [summary, setSummary] = useState({ yes: 0, no: 0, maybe: 0, pending: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formFieldsJson, setFormFieldsJson] = useState(JSON.stringify(DEFAULT_FIELDS, null, 2));
  const [allowUpdates, setAllowUpdates] = useState(true);
  const [enableNameValidation, setEnableNameValidation] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({ fullname: '', email: '', phone: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  const loadData = async (currentEventId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [eventRes, guestsRes, reportRes] = await Promise.all([
        axios.get(`${API_BASE}/events/events/${currentEventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/admin/rsvp/events/${currentEventId}/guests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/admin/rsvp/events/${currentEventId}/report`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setEvent(eventRes.data?.event || eventRes.data);
      setGuests(guestsRes.data?.guests || []);
      const reportSummary = reportRes.data?.summary || {};
      setSummary({ yes: 0, no: 0, maybe: 0, pending: 0, total: reportRes.data?.total ?? 0, ...reportSummary });
    } catch (err: any) {
      console.error('RSVP admin load error:', err);
      setError(err?.response?.data?.message || 'Failed to load RSVP data');
    } finally {
      setLoading(false);
    }
  };

  const loadForm = async (currentEventId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/rsvp/events/${currentEventId}/form`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFormFieldsJson(JSON.stringify(res.data?.fields || DEFAULT_FIELDS, null, 2));
      setAllowUpdates(res.data?.allowUpdates ?? true);
      setEnableNameValidation(res.data?.enableNameValidation ?? true);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setFormFieldsJson(JSON.stringify(DEFAULT_FIELDS, null, 2));
      } else {
        console.warn('Could not load RSVP form:', err);
      }
    }
  };

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
      loadForm(currentEventId);
    } catch {
      setError('Invalid event selection.');
    }
  }, []);

  const handleAddGuest = async () => {
    if (!eventId) return;
    if (!newGuest.fullname.trim()) {
      toast.error('Guest name is required');
      return;
    }

    try {
      await axios.post(
        `${API_BASE}/admin/rsvp/events/${eventId}/guests`,
        newGuest,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('RSVP guest added');
      setAddOpen(false);
      setNewGuest({ fullname: '', email: '', phone: '' });
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
      await axios.post(`${API_BASE}/admin/rsvp/events/${eventId}/guests/import`, formData, {
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
        `${API_BASE}/admin/rsvp/events/${eventId}/send`,
        { publicBaseUrl: window.location.origin },
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
      const response = await axios.get(`${API_BASE}/admin/rsvp/events/${eventId}/export`, {
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

  const handleSaveForm = async () => {
    if (!eventId) return;
    try {
      const parsedFields = JSON.parse(formFieldsJson);
      await axios.post(
        `${API_BASE}/admin/rsvp/events/${eventId}/form`,
        { fields: parsedFields, allowUpdates, enableNameValidation },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('RSVP form saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save form');
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!eventId) return;
    try {
      await axios.delete(`${API_BASE}/admin/rsvp/events/${eventId}/guests/${guestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('RSVP guest removed');
      loadData(eventId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete guest');
    }
  };

  return (
    <DashboardContent>
      <Box display="flex" alignItems="center" mb={3}>
        <Typography variant="h4" flexGrow={1}>
          RSVP Admin
        </Typography>
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

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
        <Card sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2">Event</Typography>
          <Typography variant="h6">{event?.name || '—'}</Typography>
          <Typography variant="body2" color="text.secondary">{event?.date || ''}</Typography>
          <Typography variant="body2" color="text.secondary">{event?.location || ''}</Typography>
        </Card>
        <Card sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2">RSVP Summary</Typography>
          <Typography variant="body2">Yes: {summary.yes}</Typography>
          <Typography variant="body2">No: {summary.no}</Typography>
          <Typography variant="body2">Maybe: {summary.maybe}</Typography>
          <Typography variant="body2">Pending: {summary.pending}</Typography>
        </Card>
      </Stack>

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
                  <TableCell>Responded At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {guests.map((guest) => (
                  <TableRow key={guest._id}>
                    <TableCell>{guest.fullname}</TableCell>
                    <TableCell>{guest.email || '—'}</TableCell>
                    <TableCell>{guest.phone || '—'}</TableCell>
                    <TableCell>{guest.rsvpStatus || 'pending'}</TableCell>
                    <TableCell>{guest.rsvpRespondedAt ? new Date(guest.rsvpRespondedAt).toLocaleString() : '—'}</TableCell>
                    <TableCell align="right">
                      <Button color="error" onClick={() => handleDeleteGuest(guest._id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && guests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No RSVP guests yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>
      </Card>

      <Card sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>RSVP Form Settings</Typography>
        <Stack spacing={2}>
          <TextField
            label="Fields (JSON)"
            value={formFieldsJson}
            onChange={(e) => setFormFieldsJson(e.target.value)}
            multiline
            minRows={6}
            fullWidth
          />
          <Stack direction="row" spacing={2}>
            <FormControlLabel
              control={<Switch checked={allowUpdates} onChange={(e) => setAllowUpdates(e.target.checked)} />}
              label="Allow updates"
            />
            <FormControlLabel
              control={<Switch checked={enableNameValidation} onChange={(e) => setEnableNameValidation(e.target.checked)} />}
              label="Enable name validation"
            />
          </Stack>
          <Button variant="contained" onClick={handleSaveForm}>
            Save RSVP Form
          </Button>
        </Stack>
      </Card>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add RSVP Guest</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Full name"
              value={newGuest.fullname}
              onChange={(e) => setNewGuest((prev) => ({ ...prev, fullname: e.target.value }))}
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
    </DashboardContent>
  );
}
