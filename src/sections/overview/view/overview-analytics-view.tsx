import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { useNavigate } from "react-router-dom";
import Button from '@mui/material/Button';
import { DashboardContent } from 'src/layouts/dashboard';
import { AnalyticsCurrentVisits } from '../analytics-current-visits';
import { AnalyticsWebsiteVisits } from '../analytics-website-visits';
import { AnalyticsWidgetSummary } from '../analytics-widget-summary';

export function OverviewAnalyticsView() {
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalEvents: 0,
    totalGuests: 0,
    checkedInGuests: 0,
    unusedCodes: 0,
    guestStatusBreakdown: {
      checkedIn: 0,
      pending: 0,
    },
    checkInTrend: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("No token found in local storage.");
      navigate('/sign-in');
      setLoading(false);
      return;
    }

    Promise.all([
      fetch("https://292x833w13.execute-api.us-east-2.amazonaws.com/events/events", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }).then((res) => res.json()),
      fetch("https://292x833w13.execute-api.us-east-2.amazonaws.com/guest/get-analytics/", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }).then((res) => res.json()),
    ])
      .then(([eventsData, analyticsData]) => {
        if (eventsData && Array.isArray(eventsData.events)) {
          setEvents(eventsData.events);
        }
        if (analyticsData) {
          setAnalytics(analyticsData);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        navigate('/sign-in');
        setError(err.message);
        setLoading(false);
      });
  }, [navigate]);

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        Hi, Welcome Admin
      </Typography>

      {error && (
        <Button
          onClick={() => navigate("/sign-in")}
          sx={{ mt: 2, color: "red" }}
        >
          Click here to sign in again to view details
        </Button>
      )}

      {loading ? (
        <Typography>Loading events...</Typography>
      ) : (
        <Grid container spacing={3}>
          <Grid xs={12} sm={6} md={3}>
            <AnalyticsWidgetSummary
              title="Number of Events"
              percent={analytics.totalEvents}
              total={analytics.totalEvents}
              icon={<img alt="icon" src="/assets/icons/glass/ic-glass-bag.svg" />}
            />
          </Grid>

          <Grid xs={12} sm={6} md={3}>
            <AnalyticsWidgetSummary
              title="Total Guests"
              percent={analytics.totalGuests}
              total={analytics.totalGuests}
              color="secondary"
              icon={<img alt="icon" src="/assets/icons/glass/ic-glass-users.svg" />}
            />
          </Grid>

          <Grid xs={12} sm={6} md={3}>
            <AnalyticsWidgetSummary
              title="Checked-in Guests"
              percent={analytics.checkedInGuests}
              total={analytics.checkedInGuests}
              color="warning"
              icon={<img alt="icon" src="/assets/icons/glass/ic-glass-buy.svg" />}
            />
          </Grid>

          <Grid xs={12} sm={6} md={3}>
            <AnalyticsWidgetSummary
              title="Unused Codes"
              percent={analytics.unusedCodes}
              total={analytics.unusedCodes}
              color="error"
              icon={<img alt="icon" src="/assets/icons/glass/ic-glass-message.svg" />}
            />
          </Grid>

          <Grid xs={12} md={6} lg={4}>
            <AnalyticsCurrentVisits
              title="Guest Status Breakdown"
              chart={{
                // series: [
                //   { label: 'Checked In', value: analytics.guestStatusBreakdown.checkedIn },
                //   { label: 'Pending', value: analytics.guestStatusBreakdown.pending },
                // ],
                series: [
                  { label: 'Checked-in', value: 60 },
                  { label: 'Pending', value: 40 },
                ],
              }}
            />
          </Grid>

          <Grid xs={12} md={6} lg={8}>
            <AnalyticsWebsiteVisits
              title="Check-in Trend"
              subheader="Last 9 months"
              chart={{
                categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
                // series: [
                //   {
                //     name: 'Check-ins',
                //     data: analytics.checkInTrend,
                //   },
                // ],
                series: [
                  {
                    name: 'Check-ins',
                    data: [5, 12, 8, 15, 10, 20, 18],
                  },
                ],
              }}
            />
          </Grid>
        </Grid>
      )}
    </DashboardContent>
  );
}
