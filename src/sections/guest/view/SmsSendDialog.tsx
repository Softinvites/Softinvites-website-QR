import { useMemo, useState, useEffect } from 'react';

import {
  Alert,
  Radio,
  Button,
  Dialog,
  RadioGroup,
  DialogTitle,
  FormControl,
  DialogActions,
  DialogContent,
  FormControlLabel,
} from '@mui/material';

import { Iconify } from 'src/components/iconify/iconify';

interface SmsSendDialogProps {
  open: boolean;
  onClose: () => void;
  // null sends to every guest with a phone number; an array sends to those guests.
  onConfirm: (guestIds: string[] | null) => void;
  loading?: boolean;
  guests: { id: string; phone?: string }[];
  selectedGuestIds: string[];
}

const hasPhone = (g: { phone?: string }) => !!g.phone && !!String(g.phone).trim();

// Matches MAX_GUEST_SMS_PER_REQUEST on the server.
const MAX_PER_SEND = 200;

export default function SmsSendDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  guests,
  selectedGuestIds,
}: SmsSendDialogProps) {
  const [recipientMode, setRecipientMode] = useState<'all' | 'selected'>('all');

  // Default to "selected" when guests are ticked, matching the WhatsApp dialog.
  useEffect(() => {
    if (!open) return;
    setRecipientMode(selectedGuestIds.length > 0 ? 'selected' : 'all');
  }, [open, selectedGuestIds.length]);

  const allWithPhone = useMemo(() => guests.filter(hasPhone).length, [guests]);
  const selectedWithPhone = useMemo(() => {
    const selected = new Set(selectedGuestIds);
    return guests.filter((g) => selected.has(g.id) && hasPhone(g)).length;
  }, [guests, selectedGuestIds]);

  const count = recipientMode === 'all' ? allWithPhone : selectedWithPhone;
  const skippedSelected = selectedGuestIds.length - selectedWithPhone;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send SMS</DialogTitle>
      <DialogContent>
        <Alert severity={count === 0 ? 'warning' : 'info'} sx={{ mb: 2 }}>
          {count === 0
            ? 'None of these guests has a phone number.'
            : `Each guest will get an SMS with a link to their QR code. Sending to ${count} guest${
                count === 1 ? '' : 's'
              }.`}
          {recipientMode === 'selected' &&
            skippedSelected > 0 &&
            ` ${skippedSelected} selected guest${skippedSelected === 1 ? ' has' : 's have'} no phone number and will be skipped.`}
        </Alert>
        {count > MAX_PER_SEND && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You can send to up to {MAX_PER_SEND} guests at a time. Tick up to {MAX_PER_SEND} guests in
            the table and send to &quot;Selected guests&quot;, then repeat for the rest.
          </Alert>
        )}
        <FormControl fullWidth>
          <RadioGroup
            value={recipientMode}
            onChange={(e) => setRecipientMode(e.target.value as 'all' | 'selected')}
          >
            <FormControlLabel
              value="all"
              control={<Radio size="small" />}
              label={`All guests with a phone number (${allWithPhone})`}
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
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Iconify icon="material-symbols:sms" />}
          disabled={loading || count === 0 || count > MAX_PER_SEND}
          onClick={() => onConfirm(recipientMode === 'selected' ? selectedGuestIds : null)}
        >
          Send {count > 0 ? count : ''} SMS
        </Button>
      </DialogActions>
    </Dialog>
  );
}
