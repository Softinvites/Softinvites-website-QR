import * as React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  CircularProgress,
} from '@mui/material';
import { toast } from 'react-toastify';
import { SketchPicker } from 'react-color';

interface GuestModalProps {
  open: boolean;
  handleClose: () => void;
}

const EventModal: React.FC<GuestModalProps> = ({ open, handleClose }) => {
  const [guestData, setGuestData] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    eventId: '',
    qrCodeBgColor: '#ffffff',
    qrCodeCenterColor: '#020202',
    qrCodeEdgeColor: '#020202',
  });

  const [loading, setLoading] = React.useState(false);

  // Retrieve eventId from local storage when the component mounts
  React.useEffect(() => {
    const eventIdArray = localStorage.getItem('allRowIds');
    if (eventIdArray) {
      try {
        const parsedIds = JSON.parse(eventIdArray);
        if (Array.isArray(parsedIds) && parsedIds.length > 0) {
          setGuestData((prev) => ({ ...prev, eventId: parsedIds[0] }));
        } else {
          console.error("Parsed data is not a valid array:", parsedIds);
        }
      } catch (error) {
        console.error("Error parsing event IDs:", error);
      }
    }
  }, []);

  // Handle input change for text fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGuestData({ ...guestData, [e.target.name]: e.target.value });
  };

  // Handle color changes from the SketchPicker
  const handleColorChange = (color: any, field: string) => {
    setGuestData((prev) => ({ ...prev, [field]: color.hex }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to add a guest.');
        setLoading(false);
        return;
      }

      const response = await fetch('https://software-invite-api-self.vercel.app/guest/add-guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(guestData),
      });

      if (!response.ok) {
        throw new Error('Failed to add guest');
      }
      
      toast.success('Guest added successfully', {
        position: 'top-right',
        autoClose: 3000,
        onClose: () => window.location.reload(),
      });
      handleClose();
    } catch (error) {
      console.error('Error adding guest:', error);
      alert('Error adding guest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Guest</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="First Name"
          name="firstName"
          value={guestData.firstName}
          onChange={handleChange}
          margin="dense"
        />
        <TextField
          fullWidth
          label="Last Name"
          name="lastName"
          value={guestData.lastName}
          onChange={handleChange}
          margin="dense"
        />
        <TextField
          fullWidth
          label="Email"
          name="email"
          type="email"
          value={guestData.email}
          onChange={handleChange}
          margin="dense"
        />
        <TextField
          fullWidth
          label="Phone"
          name="phone"
          value={guestData.phone}
          onChange={handleChange}
          margin="dense"
        />
        <div style={{ margin: '20px 0' }}>
          <div>
            <strong>QR Code Background Color</strong>
          </div>
          <SketchPicker
            color={guestData.qrCodeBgColor}
            onChangeComplete={(color) => handleColorChange(color, 'qrCodeBgColor')}
          />
        </div>
        <div style={{ margin: '20px 0' }}>
          <div>
            <strong>QR Code Center Color</strong>
          </div>
          <SketchPicker
            color={guestData.qrCodeCenterColor}
            onChangeComplete={(color) => handleColorChange(color, 'qrCodeCenterColor')}
          />
        </div>
        <div style={{ margin: '20px 0' }}>
          <div>
            <strong>QR Code Edge Color</strong>
          </div>
          <SketchPicker
            color={guestData.qrCodeEdgeColor}
            onChangeComplete={(color) => handleColorChange(color, 'qrCodeEdgeColor')}
          />
        </div>
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
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Add Guest'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventModal;
