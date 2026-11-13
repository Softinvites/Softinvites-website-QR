import type { RsvpFormSettings } from 'src/utils/rsvp-form';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

type SubmissionRecord = {
  guestName: string;
  email?: string;
  phone?: string;
  attendanceStatus?: string;
  comments?: string;
  submissionDate?: string;
  responses?: Record<string, any>;
  plusOnes?: Array<{ name: string; phone?: string | null; email?: string | null }>;
};

type Props = {
  record: SubmissionRecord | null;
  settings: RsvpFormSettings;
  onClose: () => void;
};

function Answer({ label, value }: { label: string; value?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {value && value.trim() ? value : '—'}
      </Typography>
    </Box>
  );
}

const asText = (value: any) =>
  Array.isArray(value) ? value.join(', ') : value === null || value === undefined ? '' : String(value);

export function SubmissionAnswersDialog({ record, settings, onClose }: Props) {
  const responses = record?.responses || {};
  const knownIds = new Set(settings.customFields.map((f) => f.id));
  // Answers to questions that were later deleted from the form are still shown.
  const orphanIds = Object.keys(responses).filter((id) => !knownIds.has(id));

  return (
    <Dialog open={Boolean(record)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{record?.guestName}</DialogTitle>
      <DialogContent dividers>
        {record && (
          <Stack spacing={2}>
            <Answer label={settings.emailLabel || 'Email'} value={record.email} />
            <Answer label={settings.phoneLabel || 'Phone'} value={record.phone} />
            {settings.attendanceEnabled && (
              <Answer
                label={settings.attendanceLabel || 'Attendance'}
                value={
                  record.attendanceStatus === 'yes'
                    ? settings.attendanceYesLabel
                    : record.attendanceStatus === 'no'
                      ? settings.attendanceNoLabel
                      : 'Pending'
                }
              />
            )}
            {settings.customFields
              .filter((f) => f.type !== 'section')
              .map((f) => (
                <Answer key={f.id} label={f.label} value={asText(responses[f.id])} />
              ))}
            {orphanIds.map((id) => (
              <Answer key={id} label="(Removed question)" value={asText(responses[id])} />
            ))}
            <Answer label={settings.commentsLabel || 'Comments'} value={record.comments} />

            {!!record.plusOnes?.length && (
              <>
                <Divider />
                <Typography variant="subtitle2">
                  Plus-ones ({record.plusOnes.length})
                </Typography>
                {record.plusOnes.map((p, i) => (
                  <Box key={i}>
                    <Typography variant="body2" fontWeight={600}>
                      {i + 1}. {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[p.phone, p.email].filter(Boolean).join(' · ') || 'No contact details'}
                    </Typography>
                  </Box>
                ))}
              </>
            )}
            {record.submissionDate && (
              <Typography variant="caption" color="text.secondary">
                Submitted {new Date(record.submissionDate).toLocaleString()}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
