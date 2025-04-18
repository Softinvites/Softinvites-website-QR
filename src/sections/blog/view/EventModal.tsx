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
interface GuestData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  eventId: string;
  qrCodeBgColor: string;
  qrCodeCenterColor: string;
  qrCodeEdgeColor: string;
}

const EventModal: React.FC<GuestModalProps> = ({ open, handleClose }) => {
  const [guestData, setGuestData] = React.useState<GuestData>({
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

  // Handle color changes from the SketchPicker (state still stores hex)
  const handleColorChange = (color: any, field: string) => {
    setGuestData((prev) => ({ ...prev, [field]: color.hex }));
  };

  // Convert a hex color to an "r,g,b" string
  const hexToRgb = (hex: string): string => {
    // Remove the hash if present
    const cleanedHex = hex.replace('#', '');
    const r = parseInt(cleanedHex.substring(0, 2), 16);
    const g = parseInt(cleanedHex.substring(2, 4), 16);
    const b = parseInt(cleanedHex.substring(4, 6), 16);
    return `${r},${g},${b}`;
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

      // Create a payload with colors in the required rgb format
      const payload = {
        ...guestData,
        qrCodeBgColor: hexToRgb(guestData.qrCodeBgColor),
        qrCodeCenterColor: hexToRgb(guestData.qrCodeCenterColor),
        qrCodeEdgeColor: hexToRgb(guestData.qrCodeEdgeColor),
      };


// Clean empty optional fields
if (!guestData.email || guestData.email.trim() === '') {
  delete payload.email;
}
if (!guestData.phone || guestData.phone.trim() === '') {
  delete payload.phone;
}

console.log('Final Payload:', payload);


      const response = await fetch('https://software-invite-api-self.vercel.app/guest/add-guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json(); // 👈 this is important

      if (!response.ok) {
        console.error('Full error response:', result); // 👈 log backend error
        throw new Error(result.message || 'Failed to add guest');
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
      <div style={{ margin: '20px 0', display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center" }}>
        <div>
          <strong>QR Code Background Color</strong>
        </div>
        <SketchPicker
          color={guestData.qrCodeBgColor}
          onChangeComplete={(color) => handleColorChange(color, 'qrCodeBgColor')}
        />
      </div>
      <div style={{ margin: '20px 0', display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center" }}>
        <div>
          <strong>QR Code Center Color</strong>
        </div>
        <SketchPicker
          color={guestData.qrCodeCenterColor}
          onChangeComplete={(color) => handleColorChange(color, 'qrCodeCenterColor')}
        />
      </div>
      <div style={{ margin: '20px 0', display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center" }}>
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
