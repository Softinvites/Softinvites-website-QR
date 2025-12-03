import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { Iconify } from 'src/components/iconify/iconify';

interface BatchDeleteModalProps {
  open: boolean;
  handleClose: () => void;
  handleConfirm: () => void;
  selectedCount: number;
  loading?: boolean;
}

const BatchDeleteModal: React.FC<BatchDeleteModalProps> = ({
  open,
  handleClose,
  handleConfirm,
  selectedCount,
  loading = false,
}) => {
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Iconify icon="solar:trash-bin-trash-bold" sx={{ color: 'error.main' }} />
        Confirm Batch Delete
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h6" color="error" gutterBottom>
            Are you sure you want to delete {selectedCount} selected guest{selectedCount > 1 ? 's' : ''}?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. All selected guests and their QR codes will be permanently deleted.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={loading ? undefined : <Iconify icon="solar:trash-bin-trash-bold" />}
        >
          {loading ? 'Deleting...' : `Delete ${selectedCount} Guest${selectedCount > 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BatchDeleteModal;