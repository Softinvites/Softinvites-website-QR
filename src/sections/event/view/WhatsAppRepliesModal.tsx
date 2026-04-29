import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { Iconify } from 'src/components/iconify';
import { API_BASE } from 'src/utils/apiBase';

interface Reply {
  id: string;
  from: string;
  body: string;
  profileName: string | null;
  guestName: string | null;
  guestPhone: string | null;
  receivedAt: string;
  status: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
}

const POLL_INTERVAL_MS = 30_000;

export default function WhatsAppRepliesModal({ open, onClose, eventId, eventName }: Props) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Reply | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const token = localStorage.getItem('token');

  const fetchReplies = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/whatsapp/replies/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReplies(data.replies || []);
    } catch {
      // silent — don't toast on background poll
    }
  };

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!open) return undefined;
    setLoading(true);
    fetchReplies().finally(() => setLoading(false));
    pollRef.current = setInterval(fetchReplies, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId]);

  const handleClose = () => {
    setSelected(null);
    setReplyText('');
    onClose();
  };

  const handleSend = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      await axios.post(
        `${API_BASE}/whatsapp/reply`,
        {
          eventId,
          guestId: null,
          phoneNumber: selected.from,
          message: replyText.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Reply sent to ${selected.guestName || selected.from}`);
      setReplyText('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const displayName = (r: Reply) => r.guestName || r.profileName || r.from;

  const initials = (name: string) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // 24-hour window check
  const isWithin24h = (iso: string) =>
    Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Iconify icon="logos:whatsapp-icon" width={24} />
        WhatsApp Replies — {eventName}
        <Box flexGrow={1} />
        <IconButton onClick={handleClose} size="small">
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, display: 'flex', height: 520 }}>
        {/* Left: reply list */}
        <Box
          sx={{
            width: 280,
            borderRight: '1px solid',
            borderColor: 'divider',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress size={28} />
            </Box>
          ) : replies.length === 0 ? (
            <Box p={3} textAlign="center">
              <Iconify icon="solar:chat-line-bold-duotone" width={40} sx={{ color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No replies yet
              </Typography>
            </Box>
          ) : (
            replies.map((r) => (
              <Box key={r.id}>
                <Box
                  onClick={() => { setSelected(r); setReplyText(''); }}
                  sx={{
                    px: 2, py: 1.5, cursor: 'pointer',
                    bgcolor: selected?.id === r.id ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Avatar sx={{ width: 36, height: 36, fontSize: 13, bgcolor: 'primary.main' }}>
                      {initials(displayName(r))}
                    </Avatar>
                    <Box minWidth={0}>
                      <Typography variant="subtitle2" noWrap>
                        {displayName(r)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {r.guestPhone || r.from}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        noWrap
                        sx={{ mt: 0.25, fontSize: 12 }}
                      >
                        {r.body}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Divider />
              </Box>
            ))
          )}
        </Box>

        {/* Right: conversation + reply */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%" gap={1}>
              <Iconify icon="solar:chat-round-dots-bold-duotone" width={48} sx={{ color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary">
                Select a reply to respond
              </Typography>
            </Box>
          ) : (
            <>
              {/* Header */}
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ width: 36, height: 36, fontSize: 13, bgcolor: 'primary.main' }}>
                    {initials(displayName(selected))}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2">{displayName(selected)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selected.guestPhone || selected.from}
                    </Typography>
                  </Box>
                  <Box flexGrow={1} />
                  {!isWithin24h(selected.receivedAt) && (
                    <Chip
                      label="24h window expired"
                      size="small"
                      color="warning"
                      icon={<Iconify icon="solar:danger-triangle-bold" width={14} />}
                    />
                  )}
                </Stack>
              </Box>

              {/* Message bubble */}
              <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>
                <Box
                  sx={{
                    maxWidth: '80%',
                    bgcolor: '#dcf8c6',
                    borderRadius: '12px 12px 12px 2px',
                    px: 1.5, py: 1,
                    mb: 0.5,
                  }}
                >
                  <Typography variant="body2">{selected.body}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" textAlign="right" mt={0.25}>
                    {formatTime(selected.receivedAt)}
                  </Typography>
                </Box>
                {!isWithin24h(selected.receivedAt) && (
                  <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                    ⚠️ The 24-hour reply window has expired. You can only send a template message now.
                  </Typography>
                )}
              </Box>

              {/* Reply input */}
              <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" spacing={1} alignItems="flex-end">
                  <TextField
                    fullWidth
                    multiline
                    maxRows={3}
                    size="small"
                    placeholder={
                      isWithin24h(selected.receivedAt)
                        ? 'Type a reply...'
                        : '24h window expired — cannot send free-text reply'
                    }
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={!isWithin24h(selected.receivedAt)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <IconButton
                    color="success"
                    onClick={handleSend}
                    disabled={sending || !replyText.trim() || !isWithin24h(selected.receivedAt)}
                    sx={{ bgcolor: 'success.main', color: 'white', '&:hover': { bgcolor: 'success.dark' }, '&:disabled': { bgcolor: 'action.disabledBackground' } }}
                  >
                    {sending ? <CircularProgress size={20} color="inherit" /> : <Iconify icon="mingcute:send-fill" />}
                  </IconButton>
                </Stack>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          Auto-refreshes every 30 seconds
        </Typography>
        <Button onClick={fetchReplies} startIcon={<Iconify icon="mingcute:refresh-2-line" />} size="small">
          Refresh
        </Button>
      </DialogActions>
    </Dialog>
  );
}
