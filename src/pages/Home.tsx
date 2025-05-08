import { Container, Box, Typography } from "@mui/material";

export default function Home() {
  return (
    <Container maxWidth="md">
      <Box sx={{ my: 8, textAlign: "center" }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome to Inanna
        </Typography>
        <Typography variant="subtitle1">
          Inanna is your opinionated React starter kit for Entur applications—
          providing a consistent, Material-UI based design system and
          out-of-the-box support for authentication, routing, and common data
          workflows.
        </Typography>
        <Typography variant="body1">With Inanna you get:</Typography>
        <Box
          component="ul"
          sx={{ textAlign: "left", display: "inline-block", pl: 2 }}
        >
          <Typography component="li" variant="body1">
            A responsive AppBar + Drawer layout, with built-in search and user
            menus.
          </Typography>
          <Typography component="li" variant="body1">
            A MapView scaffold powered by React-Map-GL/MapLibre for geospatial
            features.
          </Typography>
          <Typography component="li" variant="body1">
            A DataOverview page template for listing, filtering, and visualizing
            your Entur data.
          </Typography>
          <Typography component="li" variant="body1">
            End-to-end authentication wiring via the <code>useAuth</code> hook.
          </Typography>
          <Typography component="li" variant="body1">
            A themeable, accessible UI foundation so you can focus on your
            unique business logic—not boilerplate.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
