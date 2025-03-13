import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

const ProtectedLayout = () => {
  const [hasRefreshed, setHasRefreshed] = useState(false);

  useEffect(() => {
    const alreadyRefreshed = sessionStorage.getItem("refreshed");

    if (!alreadyRefreshed) {
      sessionStorage.setItem("refreshed", "true");
      window.location.reload();
    } else {
      setHasRefreshed(true);
    }

    // Remove "refreshed" after 30 seconds
    const timer = setTimeout(() => {
      sessionStorage.removeItem("refreshed");
    }, 300);

    return () => clearTimeout(timer); // Cleanup timeout if component unmounts
  }, []);

  if (!hasRefreshed) return null; // Prevents UI from showing before refresh

  return <Outlet />;
};

export default ProtectedLayout;
