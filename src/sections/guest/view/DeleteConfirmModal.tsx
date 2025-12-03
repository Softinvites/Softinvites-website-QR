import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

interface DeleteConfirmModalProps {
  open: boolean;
  handleClose: () => void;
  handleConfirm: () => void;
}
const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    open,
    handleClose,
    handleConfirm,
  }) => (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Confirm Deletion</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete all Guests? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          No
        </Button>
        <Button onClick={handleConfirm} color="error" variant="contained">
          Yes, Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
  
export default DeleteConfirmModal;
