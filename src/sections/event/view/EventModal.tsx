import * as React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  CircularProgress,
  Typography,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { toast } from 'react-toastify';
import { API_BASE } from 'src/utils/apiBase';

interface EventModalProps {
  open: boolean;
  handleClose: () => void;
}

const EventModal: React.FC<EventModalProps> = ({ open, handleClose }) => {
  const [eventData, setEventData] = React.useState({
    name: '',
    date: '',
    location: '',
    description: '',
  });
  const [servicePackage, setServicePackage] = React.useState('standard-rsvp');
  const [enableWhatsApp, setEnableWhatsApp] = React.useState(false);
  const [enableSms, setEnableSms] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEventData({ ...eventData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to create an event.');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('name', eventData.name);
      formData.append('date', eventData.date);
      formData.append('location', eventData.location);
      formData.append('description', eventData.description);
      formData.append('servicePackage', servicePackage);

      const messageCycleMap: Record<string, number> = {
        'invitation-only': 0,
        'one-time-rsvp': 1,
        'standard-rsvp': 3,
        'full-rsvp': 6,
      };
      formData.append('messageCycle', String(messageCycleMap[servicePackage] ?? 3));

      const channelConfig = {
        email: { enabled: true, required: true, trackingEnabled: true },
        whatsapp: { enabled: servicePackage === 'full-rsvp' ? enableWhatsApp : false, optInRequired: true },
        bulkSms: { enabled: servicePackage === 'full-rsvp' ? enableSms : false, optInRequired: true },
      };
      formData.append('channelConfig', JSON.stringify(channelConfig));

      if (file) {
        formData.append('iv', file); // optional
      }

      const response = await fetch(
        `${API_BASE}/events/create`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`, // do NOT set Content-Type
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.Error || 'Failed to create event');
      }

      toast.success('Event created successfully!', {
        position: 'top-right',
        autoClose: 3000,
        onClose: () => window.location.reload(),
      });

      handleClose();
    } catch (error: any) {
      console.error('Error creating event:', error);
      alert(error.message || 'Error creating event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Event</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Event Name"
          name="name"
          value={eventData.name}
          onChange={handleChange}
          margin="dense"
        />
        <TextField
          fullWidth
          label="Date"
          name="date"
          // type="date"
          value={eventData.date}
          onChange={handleChange}
          margin="dense"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          label="Location"
          name="location"
          value={eventData.location}
          onChange={handleChange}
          margin="dense"
        />
        <TextField
          fullWidth
          label="Description"
          name="description"
          value={eventData.description}
          onChange={handleChange}
          margin="dense"
          multiline
          minRows={4}
        />

        <TextField
          fullWidth
          select
          label="Service Package"
          value={servicePackage}
          onChange={(e) => setServicePackage(e.target.value)}
          margin="dense"
        >
          <MenuItem value="invitation-only">Invitation Only</MenuItem>
          <MenuItem value="one-time-rsvp">One-Time RSVP</MenuItem>
          <MenuItem value="standard-rsvp">Standard RSVP</MenuItem>
          <MenuItem value="full-rsvp">Full RSVP</MenuItem>
        </TextField>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>
          Package Comparison (Email always included)
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Package</TableCell>
              <TableCell>RSVP Tracking</TableCell>
              <TableCell>Reminders</TableCell>
              <TableCell>Thank You</TableCell>
              <TableCell>WhatsApp/SMS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Invitation Only</TableCell>
              <TableCell>No</TableCell>
              <TableCell>No</TableCell>
              <TableCell>No</TableCell>
              <TableCell>No</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>One-Time RSVP</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>No</TableCell>
              <TableCell>No</TableCell>
              <TableCell>No</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Standard RSVP</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>No</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Full RSVP</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>Optional</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {servicePackage === 'full-rsvp' && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Optional Channels (email is always included)
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={enableWhatsApp}
                  onChange={(e) => setEnableWhatsApp(e.target.checked)}
                />
              }
              label="Enable WhatsApp"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={enableSms}
                  onChange={(e) => setEnableSms(e.target.checked)}
                />
              }
              label="Enable SMS"
            />
          </>
        )}

        <Typography variant="subtitle1" sx={{ mt: 2 }}>
          Upload IV Image (PNG, optional):
        </Typography>
        <input
          accept="image/png"
          type="file"
          onChange={handleFileChange}
          style={{ marginTop: 8, marginBottom: 12 }}
        />
        {previewImage && (
          <img
            src={previewImage}
            alt="IV Preview"
            style={{ width: '100%', borderRadius: 8, marginTop: 10 }}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="error">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventModal;
