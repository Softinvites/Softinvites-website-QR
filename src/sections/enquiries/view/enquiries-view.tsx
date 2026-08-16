import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Pagination from '@mui/material/Pagination';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';
import { API_BASE } from 'src/utils/apiBase';

// ----------------------------------------------------------------------

type Reply = {
  body: string;
  subject: string;
  sentAt: string;
  delivered: boolean;
  error?: string | null;
};

type Enquiry = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  eventType: string;
  eventDate?: string;
  location?: string;
  guestCount?: string;
  services: string[];
  message?: string;
  /** System-managed: new → read on open → responded once a reply is sent. */
  status: 'new' | 'read' | 'responded' | 'archived';
  adminNotes?: string;
  replies?: Reply[];
  lastRepliedAt?: string | null;
  notified: boolean;
  notificationError?: string | null;
  createdAt: string;
};

/** Surfaces the real server message instead of a minified axios error. */
const errorText = (err: any, fallback: string) =>
  err?.response?.data?.message ||
  err?.response?.data?.errors?.[0]?.message ||
  (typeof err?.response?.data === 'string' ? err.response.data : null) ||
  (err?.response?.status ? `${fallback} (HTTP ${err.response.status})` : null) ||
  err?.message ||
  fallback;

type Counts = Record<string, number>;

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'responded', label: 'Responded' },
  { value: 'archived', label: 'Archived' },
] as const;

const STATUS_COLOR: Record<Enquiry['status'], 'info' | 'default' | 'success' | 'warning'> = {
  new: 'info',
  read: 'default',
  responded: 'success',
  archived: 'warning',
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// ----------------------------------------------------------------------

export function EnquiriesView() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Enquiry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const token = localStorage.getItem('token');
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/contact`, {
        headers: authHeaders,
        params: { status, search: debouncedSearch || undefined, page, limit: 25 },
      });
      setEnquiries(Array.isArray(res.data?.messages) ? res.data.messages : []);
      setCounts(res.data?.counts || {});
      setPages(res.data?.pagination?.pages || 1);
      setTotal(res.data?.pagination?.total || 0);
    } catch (err: any) {
      toast.error(errorText(err, 'Failed to load enquiries'));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, status, debouncedSearch, page]);

  useEffect(() => {
    loadEnquiries();
  }, [loadEnquiries]);

  const openEnquiry = async (enquiry: Enquiry) => {
    setSelected(enquiry);
    setNotes(enquiry.adminNotes || '');
    setReplyBody('');
    setReplySubject(`Re: your ${enquiry.eventType} enquiry — SoftInvites`);

    // Opening marks it read server-side. Fetch the full record so replies load.
    try {
      const res = await axios.get(`${API_BASE}/contact/${enquiry._id}`, {
        headers: authHeaders,
      });
      const full: Enquiry = res.data?.message;
      if (full) setSelected(full);

      if (enquiry.status === 'new') {
        setEnquiries((prev) =>
          prev.map((row) => (row._id === enquiry._id ? { ...row, status: 'read' } : row))
        );
        setCounts((prev) => ({
          ...prev,
          new: Math.max(0, (prev.new || 1) - 1),
          read: (prev.read || 0) + 1,
        }));
      }
    } catch {
      // Non-fatal — the dialog is already populated from the list row.
    }
  };

  /** Internal notes only. Status is driven by what happens, not set by hand. */
  const saveNotes = async (id: string) => {
    setSaving(true);
    try {
      await axios.patch(
        `${API_BASE}/contact/${id}`,
        { adminNotes: notes },
        { headers: authHeaders }
      );
      toast.success('Notes saved');
      setSelected(null);
      loadEnquiries();
    } catch (err: any) {
      toast.error(errorText(err, 'Failed to save notes'));
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async (id: string) => {
    if (!replyBody.trim()) {
      toast.error('Write a message before sending');
      return;
    }
    setSendingReply(true);
    try {
      const res = await axios.post(
        `${API_BASE}/contact/${id}/reply`,
        { body: replyBody, subject: replySubject, includeOriginal: true },
        { headers: authHeaders }
      );
      toast.success('Reply sent');
      setReplyBody('');
      if (res.data?.data) setSelected(res.data.data);
      loadEnquiries();
    } catch (err: any) {
      toast.error(errorText(err, 'Failed to send reply'));
    } finally {
      setSendingReply(false);
    }
  };

  const deleteEnquiry = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE}/contact/${confirmDelete._id}`, {
        headers: authHeaders,
      });
      toast.success('Enquiry deleted');
      setConfirmDelete(null);
      setSelected(null);
      loadEnquiries();
    } catch (err: any) {
      toast.error(errorText(err, 'Failed to delete enquiry'));
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = async () => {
    try {
      const res = await axios.get(`${API_BASE}/contact/export`, {
        headers: authHeaders,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `softinvites-enquiries-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(errorText(err, 'Failed to export enquiries'));
    }
  };

  return (
    <DashboardContent>
      <Box display="flex" alignItems="center" flexWrap="wrap" gap={2} mb={4}>
        <Box flexGrow={1}>
          <Typography variant="h4">Enquiries</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Contact form submissions from softinvite.com
          </Typography>
        </Box>

        <Button
          variant="outlined"
          color="inherit"
          startIcon={<Iconify icon="solar:download-minimalistic-bold" />}
          onClick={exportCsv}
        >
          Export CSV
        </Button>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<Iconify icon="solar:refresh-bold" />}
          onClick={loadEnquiries}
        >
          Refresh
        </Button>
      </Box>

      <Card>
        <Tabs
          value={status}
          onChange={(_, value) => {
            setStatus(value);
            setPage(1);
          }}
          sx={{ px: 2, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.palette.divider}` }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>{tab.label}</span>
                  {tab.value !== 'all' && counts[tab.value] ? (
                    <Chip size="small" label={counts[tab.value]} />
                  ) : null}
                </Stack>
              }
            />
          ))}
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, event type, location…"
            InputProps={{
              startAdornment: (
                <Iconify icon="eva:search-fill" sx={{ mr: 1, color: 'text.disabled' }} />
              ),
            }}
          />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : enquiries.length === 0 ? (
          <Box textAlign="center" py={8} px={3}>
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              No enquiries yet
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled', mt: 1 }}>
              Submissions from the website contact form will appear here.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Date / Location</TableCell>
                    <TableCell>Guests</TableCell>
                    <TableCell>Received</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enquiries.map((enquiry) => (
                    <TableRow
                      key={enquiry._id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        ...(enquiry.status === 'new' && { '& td': { fontWeight: 600 } }),
                      }}
                      onClick={() => openEnquiry(enquiry)}
                    >
                      <TableCell>
                        <Typography variant="subtitle2" noWrap>
                          {enquiry.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {enquiry.email}
                        </Typography>
                      </TableCell>
                      <TableCell>{enquiry.eventType}</TableCell>
                      <TableCell>
                        {[enquiry.eventDate, enquiry.location].filter(Boolean).join(' · ') ||
                          '—'}
                      </TableCell>
                      <TableCell>{enquiry.guestCount || '—'}</TableCell>
                      <TableCell>{formatDate(enquiry.createdAt)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={enquiry.status}
                          color={STATUS_COLOR[enquiry.status]}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            setConfirmDelete(enquiry);
                          }}
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" alignItems="center" justifyContent="space-between" p={2}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {total} enquir{total === 1 ? 'y' : 'ies'}
              </Typography>
              {pages > 1 && (
                <Pagination
                  count={pages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              )}
            </Box>
          </>
        )}
      </Card>

      {/* ------------------------------------------------------------ Detail */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        {selected && (
          <>
            <DialogTitle>
              <Typography variant="h6">{selected.name}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {formatDate(selected.createdAt)}
              </Typography>
            </DialogTitle>

            <DialogContent dividers>
              <Stack spacing={2}>
                <Field label="Email">
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>
                </Field>
                {selected.phone && <Field label="Phone">{selected.phone}</Field>}
                <Field label="Event type">{selected.eventType}</Field>
                {selected.eventDate && <Field label="Event date">{selected.eventDate}</Field>}
                {selected.location && <Field label="Location">{selected.location}</Field>}
                {selected.guestCount && (
                  <Field label="Approx. guests">{selected.guestCount}</Field>
                )}
                {selected.services?.length > 0 && (
                  <Field label="Services">
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                      {selected.services.map((service) => (
                        <Chip key={service} size="small" label={service} variant="outlined" />
                      ))}
                    </Stack>
                  </Field>
                )}

                {selected.message && (
                  <>
                    <Divider />
                    <Field label="Message">
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selected.message}
                      </Typography>
                    </Field>
                  </>
                )}

                {!selected.notified && (
                  <Typography variant="caption" sx={{ color: 'warning.dark' }}>
                    Admin notification email failed to send
                    {selected.notificationError ? `: ${selected.notificationError}` : '.'} The
                    enquiry itself was saved.
                  </Typography>
                )}

                {/* ------------------------------------------- Reply thread */}
                {selected.replies && selected.replies.length > 0 && (
                  <>
                    <Divider />
                    <Field label={`Replies sent (${selected.replies.length})`}>
                      <Stack spacing={1.5} sx={{ mt: 1 }}>
                        {selected.replies.map((reply) => (
                          <Box
                            key={reply.sentAt}
                            sx={{
                              p: 1.5,
                              borderRadius: 1,
                              bgcolor: 'background.neutral',
                              borderLeft: 2,
                              borderColor: reply.delivered ? 'success.main' : 'error.main',
                            }}
                          >
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              {formatDate(reply.sentAt)}
                              {!reply.delivered && ` — failed: ${reply.error}`}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}
                            >
                              {reply.body}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Field>
                  </>
                )}

                {/* ---------------------------------------- Reply composer */}
                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    Reply to {selected.name}
                  </Typography>
                  <Stack spacing={1.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Subject"
                      value={replySubject}
                      onChange={(event) => setReplySubject(event.target.value)}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={5}
                      size="small"
                      placeholder={`Dear ${selected.name},\n\nThank you for reaching out…`}
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                    />
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Button
                        variant="contained"
                        disabled={sendingReply || !replyBody.trim()}
                        startIcon={
                          sendingReply ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <Iconify icon="solar:plain-bold" />
                          )
                        }
                        onClick={() => sendReply(selected._id)}
                      >
                        {sendingReply ? 'Sending…' : 'Send reply'}
                      </Button>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        Sent from info@softinvite.com to {selected.email}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Divider />

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                  label="Internal notes"
                  helperText="Only visible here — never sent to the enquirer."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button
                color="error"
                onClick={() => setConfirmDelete(selected)}
                sx={{ mr: 'auto' }}
              >
                Delete
              </Button>
              <Button color="inherit" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button
                variant="contained"
                disabled={saving}
                onClick={() => saveNotes(selected._id)}
              >
                {saving ? 'Saving…' : 'Save notes'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* --------------------------------------------- Delete confirmation */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => !deleting && setConfirmDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete this enquiry?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {confirmDelete?.name}&rsquo;s enquiry about{' '}
            <strong>{confirmDelete?.eventType}</strong> will be permanently removed,
            including any replies already sent. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={deleting} onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : null}
            onClick={deleteEnquiry}
          >
            {deleting ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.08em' }}
      >
        {label}
      </Typography>
      <Box sx={{ mt: 0.5 }}>{children}</Box>
    </Box>
  );
}
