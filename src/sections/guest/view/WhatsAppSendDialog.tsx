import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { Iconify } from 'src/components/iconify/iconify';

interface WhatsAppSendDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (templateName: string) => void;
  guestCount: number;
  loading: boolean;
}

export default function WhatsAppSendDialog({ 
  open, 
  onClose, 
  onConfirm, 
  guestCount, 
  loading 
}: WhatsAppSendDialogProps) {
  const [templateName, setTemplateName] = useState('hello_world');

  const handleConfirm = () => {
    onConfirm(templateName);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Iconify icon="logos:whatsapp-icon" />
          Send WhatsApp Messages
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          You are about to send WhatsApp messages to {guestCount} guests with phone numbers.
        </Alert>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Message Template</InputLabel>
          <Select
            value={templateName}
            label="Message Template"
            onChange={(e) => setTemplateName(e.target.value)}
          >
            <MenuItem value="hello_world">Hello World (Test)</MenuItem>
            <MenuItem value="event_invitation">Event Invitation</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Note: Make sure you have approved WhatsApp Business templates before sending.
        </Typography>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          disabled={loading}
          sx={{ 
            bgcolor: '#25D366', 
            '&:hover': { bgcolor: '#128C7E' } 
          }}
        >
          {loading ? 'Sending...' : `Send to ${guestCount} Guests`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}