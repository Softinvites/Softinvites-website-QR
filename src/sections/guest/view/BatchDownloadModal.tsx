import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (startDate: string, endDate: string) => void;
}

export default function BatchDownloadModal({ open, onClose, onSubmit }: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = () => {
    if (startDate && endDate) {
      const isoStart = new Date(startDate).toISOString();
      const isoEnd = new Date(endDate).toISOString();
      onSubmit(isoStart, isoEnd);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Select Date & Time Range</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Start Date & Time"
          type="datetime-local"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <TextField
          margin="dense"
          label="End Date & Time"
          type="datetime-local"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!startDate || !endDate}>
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
}
