import {  toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardContent } from 'src/layouts/dashboard';
import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  IconButton,
  InputAdornment,
} from "@mui/material";
import axios from "axios";
import { API_BASE } from 'src/utils/apiBase';

import { Visibility, VisibilityOff } from "@mui/icons-material";


// ----------------------------------------------------------------------

export function UserView() {
    const navigate = useNavigate();
 const [old_password, setOldPassword] = useState("");
  const [new_password, setNewPassword] = useState("");
  const [confirm_password, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updated, setUpdated] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleChangePassword = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication token not found.");
      return;
    }

    try {
      const adminID = localStorage.getItem("adminId");
      if (!adminID) return;

      if (new_password !== confirm_password) {
        toast.error("New passwords do not match.");
        return;
      }

      const payload = {
        old_password,
        new_password,
        confirm_password,
      };

      const response = await axios.put(
        `${API_BASE}/admin/update_password/${adminID}`,
        payload,
         {
            headers: {
              "Content-Type": "application/json", 
              Authorization: `Bearer ${token}`,
            },
          }
      );

      if (response.data.status === "success") {
         toast.success('Password changed successfully!', {
      position: 'top-right',
      autoClose: 3500,
      onClose: () => navigate('/home'), 
    });
        setUpdated(true);
         navigate('/home');
      } else {
        toast.error(response.data.message || "Password change failed.");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(
        error.response?.data?.message || "An error occurred. Please try again."
      );
    }
  };



  return (
      <DashboardContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              padding: "2rem",
            }}
          >
            {!updated ? (
              <>
                <TextField
                  label="Old Password"
                  variant="outlined"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  value={old_password}
                  onChange={(e) => setOldPassword(e.target.value)}
                  sx={{ input: { color: "black" } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={togglePasswordVisibility}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="New Password"
                  variant="outlined"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  value={new_password}
                  onChange={(e) => setNewPassword(e.target.value)}
                  sx={{ input: { color: "black" } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={togglePasswordVisibility}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Confirm New Password"
                  variant="outlined"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  value={confirm_password}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  sx={{ input: { color: "black" } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={togglePasswordVisibility}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "1rem",
                    marginTop: "1rem",
                  }}
                >
                  <Button
                    variant="contained"
                    sx={{ marginTop: "1rem", background: "#010156" }}
                    onClick={handleChangePassword}
                  >
                    Change Password
                  </Button>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "2rem",
                }}
              >
                <h2>Password Changed Successfully!</h2>
                <Link to="/home">Go Home</Link>
              </Box>
            )}
          </Box>
        </DashboardContent>
  );
}

