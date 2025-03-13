import * as React from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, DialogContentText } from '@mui/material';

interface EventModalProps {
  open: boolean;
  handleClose: () => void;
  title?: string;
  children?: React.ReactNode;
}
const EventModal: React.FC<EventModalProps> = ({ open, handleClose, title = "Create New Event", children }) => (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {children || <DialogContentText>Fill in the details to create a new event.</DialogContentText>}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="error">Cancel</Button>
        <Button variant="contained" color="primary">Create</Button>
      </DialogActions>
    </Dialog>
  );
  

export default EventModal;
