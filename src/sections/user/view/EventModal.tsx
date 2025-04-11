import * as React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  
  CircularProgress, // Import CircularProgress for the spinner
} from '@mui/material';

import {  toast } from 'react-toastify';

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

  
  const [loading, setLoading] = React.useState(false); // Loading state
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEventData({ ...eventData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to create an event.');
        return;
      }

      const response = await fetch('https://software-invite-api-self.vercel.app/events/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }
      toast.success('Events created succesfully', {
        position: 'top-right',
        autoClose: 3000, // Close after 2 seconds
        
        onClose: () => window.location.reload(), // Reload only after the toast disappears
      });
      handleClose(); // Close the modal
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error creating event');
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
          value={eventData.date}
          onChange={handleChange}
          margin="dense"
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

        
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="error">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={loading} // Disable button when loading
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventModal;
