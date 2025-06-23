import * as dayjs from "dayjs";
import { Dayjs } from "dayjs";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  IconButton,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { useOrganizations } from "../../../shared/hooks/useOrganizations.tsx";
import { useOperators } from "../hooks/useOperators.tsx";
import type { Feature } from "geojson";
import featureToPoslist from "../../../shared/util/featureToPoslist.tsx";
import type { CarPoolingTripDataFormData } from "../model/CarPoolingTripDataFormData.tsx";
import { ErrorMessage } from "../../../shared/error-message/ErrorMessage.tsx";
import type { AppError } from "../../../shared/error-message/AppError.tsx";

declare module "yup" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface MixedSchema<TType, TContext, TDefault, TFlags> {
    dayjs(message?: string): this;
  }
}

Yup.addMethod(Yup.mixed, "dayjs", function (message = "Invalid date") {
  return this.test("dayjs", message, (value) => {
    return !value || (value as Dayjs).isValid();
  });
});

const schema = Yup.object({
  codespace: Yup.string().required().length(3),
  authority: Yup.string().required(),
  operator: Yup.string().required(),
  lineName: Yup.string()
    .min(3, "Line name must be at least 3 characters")
    .required(),
  destinationDisplay: Yup.string()
    .min(3, "Destination display must be at least 3 charaters")
    .required(),
  departureStopName: Yup.string()
    .min(3, "Departure stop name must be at least 3 charaters")
    .required(),

  departureDatetime: Yup.mixed<Dayjs>()
    .nullable()
    .required()
    .dayjs("Not a valid departure date")
    .test(
      "min-date",
      "Date must be in the future",
      (value) => value === null || dayjs.isDayjs(value),
    ),
  departureFlexibleStop: Yup.string().required(),
  destinationStopName: Yup.string()
    .min(3, "Departure stop name must be at least 3 charaters")
    .required(),
  destinationDatetime: Yup.mixed<Dayjs>()
    .nullable()
    .required()
    .dayjs("Not a valid arrival date")
    .test(
      "min-date",
      "Date must be in the future",
      (value) => value === null || dayjs.isDayjs(value),
    ),
  destinationFlexibleStop: Yup.string().required(),
});

export interface CarPoolingTripDataFormProps {
  initialState?: CarPoolingTripDataFormData;
  onAddDeparturestopClick: () => void;
  onRemoveDepartureStopClick: () => void;
  onAddDestinationtopClick: () => void;
  onRemoveDestinationStopClick: () => void;
  onResetCallback: () => void;
  onSubmitCallback: (formData: CarPoolingTripDataFormData) => void;
  onZoomToFeature: (id: string) => void;
  mapDepartureFlexibleStop: Feature | null;
  mapDestinationFlexibleStop: Feature | null;
  drawingStopsAllowed: boolean;
}

export default function CarPoolingTripDataForm(
  props: CarPoolingTripDataFormProps,
) {
  const {
    initialState,
    onAddDeparturestopClick,
    onRemoveDepartureStopClick,
    onAddDestinationtopClick,
    onRemoveDestinationStopClick,
    onResetCallback,
    onSubmitCallback,
    onZoomToFeature,
    mapDepartureFlexibleStop,
    mapDestinationFlexibleStop,
    drawingStopsAllowed,
  } = props;
  const { authorities } = useOrganizations();
  const operators = useOperators();

  const {
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
    reset,
    clearErrors,
  } = useForm<CarPoolingTripDataFormData>({
    resolver: yupResolver(schema),
    mode: "onBlur", // or "onChange", depending on UX preference
    defaultValues: {
      codespace: "ENT", // TODO fix hardcoding
      authority: "",
      operator: "",
      lineName: "",
      destinationDisplay: "",
      departureStopName: "",
      departureFlexibleStop: "",
      destinationStopName: "",
      destinationFlexibleStop: "",
    },
  });

  const authority = watch("authority");
  const departureFlexibleStop = watch("departureFlexibleStop");
  const destinationFlexibleStop = watch("destinationFlexibleStop");
  const [error, setError] = useState<AppError | undefined>(undefined);
  const [initialStateSet, setInitialStateSet] = useState<boolean>(false);

  useEffect(() => {
    if (authorities.length && !authority) {
      setValue("authority", authorities[0].id);
    }

    if (mapDepartureFlexibleStop) {
      setValue(
        "departureFlexibleStop",
        featureToPoslist(mapDepartureFlexibleStop),
      );
    } else {
      setValue("departureFlexibleStop", "");
    }

    if (mapDestinationFlexibleStop) {
      setValue(
        "destinationFlexibleStop",
        featureToPoslist(mapDestinationFlexibleStop),
      );
    } else {
      setValue("destinationFlexibleStop", "");
    }

    let msg = "";
    if (errors?.departureFlexibleStop?.message) {
      msg = msg + errors.departureFlexibleStop.message;
    }
    if (errors?.destinationFlexibleStop?.message) {
      msg = msg + errors.destinationFlexibleStop.message;
    }

    if (!error && msg.length > 0) {
      setError({ message: msg, code: "VALIDATION_ERROR" });
    } else if (error?.code === "VALIDATION_ERROR" && msg === "") {
      setError(undefined);
    }

    if (initialState && !initialStateSet) {
      setInitialStateSet(true);
      reset(initialState);
    }
  }, [
    initialStateSet,
    setInitialStateSet,
    initialState,
    reset,
    authorities,
    authority,
    mapDepartureFlexibleStop,
    mapDestinationFlexibleStop,
    setValue,
    drawingStopsAllowed,
    error,
    errors?.departureFlexibleStop?.message,
    errors?.destinationFlexibleStop?.message,
  ]);

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}
      component="form"
      onSubmit={handleSubmit(onSubmitCallback)}
      noValidate
      autoComplete="off"
    >
      <ErrorMessage error={error} />
      <Typography variant="h5" component="h1">
        Trip data
      </Typography>
      <FormControl fullWidth error={!!errors.authority} margin="normal">
        <Controller
          name="authority"
          control={control}
          render={({ field }) => {
            return (
              <Select {...field} label="Select an authority">
                <MenuItem value="" disabled>
                  <em>Authority</em>
                </MenuItem>
                {authorities.map((authority) => (
                  <MenuItem key={authority.id} value={authority.id}>
                    {authority.name}
                  </MenuItem>
                ))}
              </Select>
            );
          }}
        />
        <FormHelperText>{errors.authority?.message}</FormHelperText>
      </FormControl>
      <FormControl fullWidth error={!!errors.operator} margin="normal">
        <Controller
          name="operator"
          control={control}
          render={({ field }) => {
            return (
              <Select {...field} label="Select an operator">
                <MenuItem value="" disabled>
                  <em>Operator</em>
                </MenuItem>
                {operators.map((operator) => (
                  <MenuItem key={operator.id} value={operator.id}>
                    {operator.name}
                  </MenuItem>
                ))}
              </Select>
            );
          }}
        />
        <FormHelperText>{errors.operator?.message}</FormHelperText>
      </FormControl>
      <Controller
        name="lineName"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              label="Line name"
              error={!!errors.lineName}
              helperText={errors.lineName?.message}
              required
              fullWidth
            />
          );
        }}
      />
      <Controller
        name="destinationDisplay"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              label="Destination display"
              error={!!errors.destinationDisplay}
              helperText={errors.destinationDisplay?.message}
              required
              fullWidth
            />
          );
        }}
      />
      <Typography variant="h6" component="h2">
        Departure
      </Typography>
      <Controller
        name="departureStopName"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              label="Departure stop name"
              error={!!errors.departureStopName}
              helperText={errors.departureStopName?.message}
              required
              fullWidth
            />
          );
        }}
      />
      <Controller
        name="departureDatetime"
        control={control}
        render={({ field, fieldState: { error } }) => {
          return (
            <DateTimePicker
              {...field}
              ampm={false}
              label="Select departure date"
              value={field.value || null}
              onChange={(value) => field.onChange(value)}
              slotProps={{
                textField: {
                  error: !!error,
                  helperText: error?.message,
                  fullWidth: true,
                },
              }}
            />
          );
        }}
      />
      <Button
        variant="contained"
        disabled={!!departureFlexibleStop || !drawingStopsAllowed}
        onClick={() => onAddDeparturestopClick()}
      >
        Add stop
      </Button>
      <Box display="flex" gap={1}>
        <Button
          variant="contained"
          onClick={onRemoveDepartureStopClick}
          disabled={!departureFlexibleStop}
        >
          Remove stop
        </Button>
        {mapDepartureFlexibleStop?.id && (
          <IconButton
            disabled={!departureFlexibleStop}
            aria-label="Zoom to destination stop"
            onClick={() =>
              onZoomToFeature(mapDepartureFlexibleStop.id as string)
            }
          >
            <GpsFixedIcon />
          </IconButton>
        )}
      </Box>
      <Typography variant="h6" component="h2">
        Destination
      </Typography>
      <Controller
        name="destinationStopName"
        control={control}
        render={({ field }) => {
          return (
            <TextField
              {...field}
              label="Destination stop name"
              error={!!errors.destinationStopName}
              helperText={errors.destinationStopName?.message}
              required
              fullWidth
            />
          );
        }}
      />
      <Controller
        name="destinationDatetime"
        control={control}
        render={({ field, fieldState: { error } }) => {
          return (
            <DateTimePicker
              {...field}
              ampm={false}
              label="Select arrival date"
              value={field.value || null}
              onChange={(value) => field.onChange(value)}
              slotProps={{
                textField: {
                  error: !!error,
                  helperText: error?.message,
                  fullWidth: true,
                },
              }}
            />
          );
        }}
      />
      <Button
        variant="contained"
        disabled={!!destinationFlexibleStop || !drawingStopsAllowed}
        onClick={() => onAddDestinationtopClick()}
      >
        Add stop
      </Button>
      <Box display="flex" gap={1}>
        <Button
          variant="contained"
          onClick={onRemoveDestinationStopClick}
          disabled={!destinationFlexibleStop}
        >
          Remove stop
        </Button>
        {mapDestinationFlexibleStop?.id && (
          <IconButton
            disabled={!destinationFlexibleStop}
            aria-label="Zoom to destination stop"
            onClick={() =>
              onZoomToFeature(mapDestinationFlexibleStop.id as string)
            }
          >
            <GpsFixedIcon />
          </IconButton>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button type="submit" variant="contained" color="primary">
          Submit trip
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            reset();
            clearErrors();
            onResetCallback();
          }}
        >
          Reset
        </Button>
      </Box>
    </Box>
  );
}
