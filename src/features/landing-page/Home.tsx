import { Container, Box, Typography } from "@mui/material";

export default function Home() {
  return (
    <Container maxWidth="md">
      <Box sx={{ my: 8, textAlign: "left" }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome to EnTur Car Pooling PoC
        </Typography>
        <Typography variant="subtitle1">
          Enturs Car Pooling PoC frontend app for testing creation of Car
          Pooling messages for making such trips available in a journey planner.
          This app uses a GraphQL api to create trips in a backend app, this
          backend app will then relay these to the journey planner in SIRI
          format.
        </Typography>
        <br />
        <Typography variant="body1">
          EnTur Car Pooling PoC cannot at the moment describe:
        </Typography>
        <Box
          component="ul"
          sx={{ textAlign: "left", display: "inline-block", pl: 2 }}
        >
          <Typography component="li" variant="body1">
            Contact details about the driver, amongst these the name
          </Typography>
          <Typography component="li" variant="body1">
            Make and model of the car or other identifying features such as
            license plate or colour
          </Typography>
          <Typography component="li" variant="body1">
            Number of free seats in the car
          </Typography>
        </Box>
        <Typography variant="body1">
          The current state of the PoC is to enable non technical users to
          create SIRI messages that can be consumed by a journey planner, and
          verify that the journey planner can create flexible temporary stop
          places for Car Pooling trips.
        </Typography>
        <Typography variant="body1">
          Next step is to see if SIRI is a good fit for Car Pooling messages and
          what needs to be put into a profile to facilitate it's adoption.
        </Typography>
      </Box>
    </Container>
  );
}
