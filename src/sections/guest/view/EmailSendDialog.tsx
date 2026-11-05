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

interface EmailSendDialogProps {
  open: boolean;
  onClose: () => void;
  // null sends to every guest with an email; an array sends to those guests.
  onConfirm: (guestIds: string[] | null) => void;
  loading?: boolean;
  guests: { id: string; email?: string }[];
  selectedGuestIds: string[];
}

const hasEmail = (g: { email?: string }) => !!g.email && !!g.email.trim();

export default function EmailSendDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  guests,
  selectedGuestIds,
}: EmailSendDialogProps) {
  const [recipientMode, setRecipientMode] = useState<'all' | 'selected'>('all');

  // Default to "selected" when guests are ticked, matching the WhatsApp dialog.
  useEffect(() => {
    if (!open) return;
    setRecipientMode(selectedGuestIds.length > 0 ? 'selected' : 'all');
  }, [open, selectedGuestIds.length]);

  const allWithEmail = useMemo(() => guests.filter(hasEmail).length, [guests]);
  const selectedWithEmail = useMemo(() => {
    const selected = new Set(selectedGuestIds);
    return guests.filter((g) => selected.has(g.id) && hasEmail(g)).length;
  }, [guests, selectedGuestIds]);

  const count = recipientMode === 'all' ? allWithEmail : selectedWithEmail;
  const skippedSelected = selectedGuestIds.length - selectedWithEmail;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send Emails</DialogTitle>
      <DialogContent>
        <Alert severity={count === 0 ? 'warning' : 'info'} sx={{ mb: 2 }}>
          {count === 0
            ? 'None of these guests has an email address.'
            : `You are about to email the invitation and QR code to ${count} guest${
                count === 1 ? '' : 's'
              }.`}
          {recipientMode === 'selected' &&
            skippedSelected > 0 &&
            ` ${skippedSelected} selected guest${skippedSelected === 1 ? ' has' : 's have'} no email and will be skipped.`}
        </Alert>
        <FormControl fullWidth>
          <RadioGroup
            value={recipientMode}
            onChange={(e) => setRecipientMode(e.target.value as 'all' | 'selected')}
          >
            <FormControlLabel
              value="all"
              control={<Radio size="small" />}
              label={`All guests with email (${allWithEmail})`}
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
          startIcon={<Iconify icon="material-symbols:mail" />}
          disabled={loading || count === 0}
          onClick={() => onConfirm(recipientMode === 'selected' ? selectedGuestIds : null)}
        >
          Send {count > 0 ? count : ''} Email{count === 1 ? '' : 's'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
