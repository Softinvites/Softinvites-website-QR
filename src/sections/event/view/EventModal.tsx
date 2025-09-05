// import * as React from 'react';
// import {
//   Dialog,
//   DialogActions,
//   DialogContent,
//   DialogTitle,
//   Button,
//   TextField,
//   CircularProgress,
//   Typography,
// } from '@mui/material';

// import { toast } from 'react-toastify';

// interface EventModalProps {
//   open: boolean;
//   handleClose: () => void;
// }

// const EventModal: React.FC<EventModalProps> = ({ open, handleClose }) => {
//   const [eventData, setEventData] = React.useState({
//     name: '',
//     date: '',
//     location: '',
//     description: '',
//     iv: '',
//   });

//   const [loading, setLoading] = React.useState(false);
//   const [previewImage, setPreviewImage] = React.useState<string | null>(null);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setEventData({ ...eventData, [e.target.name]: e.target.value });
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onloadend = () => {
//       const fullBase64 = reader.result as string;
//       const pureBase64 = fullBase64.split(',')[1]; // ✅ strip "data:image/png;base64,"
//       setEventData({ ...eventData, iv: pureBase64 });
//       setPreviewImage(fullBase64); // for preview, keep full string
//     };
//     reader.readAsDataURL(file);
//   };

//   // const handleSubmit = async () => {
//   //   setLoading(true);
//   //   try {
//   //     const token = localStorage.getItem('token');
//   //     if (!token) {
//   //       alert('You must be logged in to create an event.');
//   //       return;
//   //     }

//   //     const response = await fetch('https://292x833w13.execute-api.us-east-2.amazonaws.com/events/create', {
//   //       method: 'POST',
//   //       headers: {
//   //         'Content-Type': 'application/json',
//   //         Authorization: `Bearer ${token}`,
//   //       },
//   //       body: JSON.stringify(eventData),
//   //     });

//   //     if (!response.ok) {
//   //       const err = await response.json();
//   //       throw new Error(err?.message || 'Failed to create event');
//   //     }

//   //     toast.success('Event created successfully', {
//   //       position: 'top-right',
//   //       autoClose: 3000,
//   //       onClose: () => window.location.reload(),
//   //     });

//   //     handleClose();
//   //   } catch (error: any) {
//   //     console.error('Error creating event:', error);
//   //     alert(error.message || 'Error creating event');
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };
// const handleSubmit = async () => {
//   setLoading(true);
//   try {
//     const token = localStorage.getItem('token');
//     if (!token) {
//       alert('You must be logged in to create an event.');
//       return;
//     }

//     const formData = new FormData();
//     formData.append('name', eventData.name);
//     formData.append('date', eventData.date);
//     formData.append('location', eventData.location);
//     formData.append('description', eventData.description);

//     // Append the actual file (not Base64)
//     const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
//     if (fileInput?.files?.[0]) {
//       formData.append('iv', fileInput.files[0]); // key must match backend field
//     }

//     const response = await fetch(
//       'https://292x833w13.execute-api.us-east-2.amazonaws.com/events/create',
//       {
//         method: 'POST',
//         headers: {
//           Authorization: `Bearer ${token}`, // no Content-Type: fetch will set multipart/form-data
//         },
//         body: formData,
//       }
//     );

//     if (!response.ok) {
//       const err = await response.json();
//       throw new Error(err?.Error || 'Failed to create event'); // backend sends { Error: "..."}
//     }

//     toast.success('Event created successfully', {
//       position: 'top-right',
//       autoClose: 3000,
//       onClose: () => window.location.reload(),
//     });

//     handleClose();
//   } catch (error: any) {
//     console.error('Error creating event:', error);
//     alert(error.message || 'Error creating event');
//   } finally {
//     setLoading(false);
//   }
// };

//   return (
//     <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
//       <DialogTitle>Create New Event</DialogTitle>
//       <DialogContent>
//         <TextField
//           fullWidth
//           label="Event Name"
//           name="name"
//           value={eventData.name}
//           onChange={handleChange}
//           margin="dense"
//         />
//         <TextField
//           fullWidth
//           label="Date"
//           name="date"
//           type="date"
//           value={eventData.date}
//           onChange={handleChange}
//           margin="dense"
//           InputLabelProps={{ shrink: true }}
//         />
//         <TextField
//           fullWidth
//           label="Location"
//           name="location"
//           value={eventData.location}
//           onChange={handleChange}
//           margin="dense"
//         />
//         <TextField
//           fullWidth
//           label="Description"
//           name="description"
//           value={eventData.description}
//           onChange={handleChange}
//           margin="dense"
//           multiline
//           minRows={4}
//         />

//         <Typography variant="subtitle1" sx={{ mt: 2 }}>
//           Upload IV Image (PNG):
//         </Typography>
//         <input
//           accept="image/png"
//           type="file"
//           onChange={handleFileChange}
//           style={{ marginTop: 8, marginBottom: 12 }}
//         />
//         {previewImage && (
//           <img
//             src={previewImage}
//             alt="IV Preview"
//             style={{ width: '100%', borderRadius: 8, marginTop: 10 }}
//           />
//         )}
//       </DialogContent>

//       <DialogActions>
//         <Button onClick={handleClose} color="error">
//           Cancel
//         </Button>
//         <Button
//           variant="contained"
//           color="primary"
//           onClick={handleSubmit}
//           disabled={loading}
//         >
//           {loading ? <CircularProgress size={24} color="inherit" /> : 'Create'}
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default EventModal;

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
} from '@mui/material';
import { toast } from 'react-toastify';

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

      if (file) {
        formData.append('iv', file); // optional
      }

      const response = await fetch(
        'https://292x833w13.execute-api.us-east-2.amazonaws.com/events/create',
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
          type="date"
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

