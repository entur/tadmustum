import {
  ApolloClient,
  ApolloError,
  ApolloLink,
  gql,
  HttpLink,
  InMemoryCache,
} from '@apollo/client';
import { removeTypenameFromVariables } from '@apollo/client/link/remove-typename';
import type { Config } from '../../contexts/ConfigContext.tsx';
import type { AuthState } from 'react-oidc-context';
import prepareCarpoolingFormData from './prepareCarpoolingFormData.tsx';
import prepareFlexTourData from './prepareFlexTourData.tsx';
import prepareBookingData, {
  type PassengerBookingData,
  type RouteLeg,
} from './prepareBookingData.tsx';
import getStreetRoute from './journeyPlannerStreetRoute.tsx';
import type { CarPoolingTripDataFormData } from '../../features/plan-trip/model/CarPoolingTripDataFormData.tsx';
import type { FlexTourFormData } from '../../features/plan-flex-tour/model/FlexTourFormData.tsx';
import type { AppError } from '../error-message/AppError.tsx';
import type { Extrajourney } from '../model/Extrajourney.tsx';
import type { EstimatedCall } from '../model/EstimatedCall.tsx';

const createClient = (uri: string, auth?: AuthState) => {
  const headers = {
    'ET-Client-Name': 'entur - tadmustum',
  } as Record<string, string>;

  if (auth?.user?.access_token) {
    const access_token = auth?.user?.access_token;
    headers['Authorization'] = `Bearer ${access_token}`;
  }

  // Strip __typename from mutation variables: query responses get __typename
  // by default, and the booking flow reuses fetched objects as mutation input.
  return new ApolloClient({
    link: ApolloLink.from([removeTypenameFromVariables(), new HttpLink({ uri, headers })]),
    cache: new InMemoryCache(),
  });
};

const getUserContext = (uri: string, auth: AuthState) => async () => {
  if (!auth.user?.access_token) {
    throw new Error('Authentication token is missing');
  }

  const client = createClient(uri, auth);

  const query = gql`
    query GetUserContext {
      userContext {
        allowedCodespaces {
          id
          permissions
        }
      }
    }
  `;

  return client
    .query({ query })
    .catch(error => error)
    .then(response => response);
};

const mutateExtrajourney =
  (uri: string, auth: AuthState, formData: CarPoolingTripDataFormData) =>
  async (): Promise<{ data?: string; error?: AppError }> => {
    if (!auth.user?.access_token) {
      throw new Error('Access token is missing');
    }
    const client = createClient(uri, auth);

    const mutation = gql`
      mutation CreateOrUpdateExtrajourney($input: ExtrajourneyInput!) {
        createOrUpdateExtrajourney(input: $input)
      }
    `;

    const variables = prepareCarpoolingFormData(formData);

    try {
      const result = await client.mutate({
        mutation,
        variables,
        errorPolicy: 'all',
      });

      if (result.errors?.length) {
        const error: AppError = {
          message: result.errors[0].message,
          code:
            ((result.errors[0].extensions?.classification ??
              result.errors[0].extensions?.code) as string) || 'GRAPHQL_ERROR',
          details: result.errors[0].path,
        };
        return { error };
      }

      return { data: result.data?.createOrUpdateExtrajourney };
    } catch (err) {
      const error = err as ApolloError;
      const appError: AppError = {
        message: error.message,
        code:
          ((error.graphQLErrors?.[0]?.extensions?.classification ??
            error.graphQLErrors?.[0]?.extensions?.code) as string) || 'NETWORK_ERROR',
        details: {
          networkError: error.networkError,
          graphQLErrors: error.graphQLErrors,
        },
      };
      return { error: appError };
    }
  };

/**
 * Upserts a flex booked tour. Uses the same `createOrUpdateExtrajourney` mutation as carpool
 * trips — nunamnir distinguishes the two by the presence of `framedVehicleJourneyRef` — but
 * builds its input from the flex tour form instead.
 */
const mutateFlexTour =
  (uri: string, auth: AuthState, formData: FlexTourFormData) =>
  async (): Promise<{ data?: string; error?: AppError }> => {
    if (!auth.user?.access_token) {
      throw new Error('Access token is missing');
    }
    const client = createClient(uri, auth);

    const mutation = gql`
      mutation CreateOrUpdateExtrajourney($input: ExtrajourneyInput!) {
        createOrUpdateExtrajourney(input: $input)
      }
    `;

    try {
      const variables = prepareFlexTourData(formData);

      const result = await client.mutate({
        mutation,
        variables,
        errorPolicy: 'all',
      });

      if (result.errors?.length) {
        const error: AppError = {
          message: result.errors[0].message,
          code:
            ((result.errors[0].extensions?.classification ??
              result.errors[0].extensions?.code) as string) || 'GRAPHQL_ERROR',
          details: result.errors[0].path,
        };
        return { error };
      }

      return { data: result.data?.createOrUpdateExtrajourney };
    } catch (err) {
      const error = err as ApolloError;
      const appError: AppError = {
        message: error.message,
        code:
          ((error.graphQLErrors?.[0]?.extensions?.classification ??
            error.graphQLErrors?.[0]?.extensions?.code) as string) || 'NETWORK_ERROR',
        details: {
          networkError: error.networkError,
          graphQLErrors: error.graphQLErrors,
        },
      };
      return { error: appError };
    }
  };

const cancelExtrajourney =
  (uri: string, auth: AuthState, originalTrip: Extrajourney) =>
  async (): Promise<{ data?: string; error?: AppError }> => {
    if (!auth.user?.access_token) {
      throw new Error('Access token is missing');
    }

    // The journey's dataSource IS the codespace — nunamnir authorizes the write on
    // it and validates the journey's own references against it server-side. The
    // re-submitted journey carries it via the spread below; guard here so a trip
    // without one fails with a clear message instead of a server-side denial.
    if (!originalTrip.estimatedVehicleJourney.dataSource) {
      return {
        error: {
          message: 'Trip is missing a dataSource; cannot determine codespace',
          code: 'MISSING_CODESPACE',
          details: 'no estimatedVehicleJourney.dataSource',
        },
      };
    }

    const client = createClient(uri, auth);

    const mutation = gql`
      mutation CreateOrUpdateExtrajourney($input: ExtrajourneyInput!) {
        createOrUpdateExtrajourney(input: $input)
      }
    `;

    // Cancel the whole trip by re-submitting the existing journey through the
    // same upsert mutation the editor uses, with the journey-level cancellation
    // flag set. recordedAtTime is bumped so downstream consumers treat this as
    // the newest version of the journey. The upsert keys on the journey's
    // estimatedVehicleJourneyCode (preserved by the spread), so we don't echo
    // back the server `id`, which nunamnir ignores.
    const input: Extrajourney = {
      estimatedVehicleJourney: {
        ...originalTrip.estimatedVehicleJourney,
        cancellation: true,
        recordedAtTime: new Date().toISOString(),
      },
    };

    try {
      const result = await client.mutate({
        mutation,
        variables: { input },
        errorPolicy: 'all',
      });

      if (result.errors?.length) {
        const error: AppError = {
          message: result.errors[0].message,
          code:
            ((result.errors[0].extensions?.classification ??
              result.errors[0].extensions?.code) as string) || 'GRAPHQL_ERROR',
          details: result.errors[0].path,
        };
        return { error };
      }

      return { data: result.data?.createOrUpdateExtrajourney };
    } catch (err) {
      const error = err as ApolloError;
      const appError: AppError = {
        message: error.message,
        code:
          ((error.graphQLErrors?.[0]?.extensions?.classification ??
            error.graphQLErrors?.[0]?.extensions?.code) as string) || 'NETWORK_ERROR',
        details: {
          networkError: error.networkError,
          graphQLErrors: error.graphQLErrors,
        },
      };
      return { error: appError };
    }
  };

const queryExtraJourney =
  (uri: string, auth: AuthState) =>
  async (): Promise<{ data?: Extrajourney[]; error?: AppError }> => {
    if (!auth.user?.access_token) {
      return {
        error: {
          message: 'Access token missing',
          code: 'ACCESS_TOKEN_MISSING',
          details: 'no auth.user.access_token',
        },
      };
    }
    const client = createClient(uri, auth);

    // No arguments: nunamnir scopes the result server-side to the codespaces the
    // caller's role assignments allow.
    const query = gql`
      query ExtraJourneysQuery {
        extrajourneys {
          id
          estimatedVehicleJourney {
            cancellation
            lineRef
            directionRef
            dataSource
            estimatedVehicleJourneyCode
            extraJourney
            groupOfLinesRef
            isCompleteStopSequence
            monitored
            operatorRef
            publishedLineName
            recordedAtTime
            routeRef
            vehicleMode
            estimatedCalls {
              estimatedCall {
                aimedArrivalTime
                aimedDepartureTime
                arrivalBoardingActivity
                arrivalStatus
                cancellation
                departureBoardingActivity
                departureStatus
                destinationDisplay
                expectedArrivalTime
                latestExpectedArrivalTime
                expectedDepartureTime
                order
                requestStop
                stopPointName
                stopPointRef
                expectedDepartureOccupancy {
                  onboardCount
                }
                expectedDepartureCapacities {
                  totalCapacity
                }
                departureStopAssignment {
                  expectedFlexibleArea {
                    circularArea {
                      radius
                      longitude
                      latitude
                    }
                    polygon {
                      exterior {
                        posList
                      }
                    }
                  }
                }
              }
            }
            framedVehicleJourneyRef {
              dataFrameRef
              datedVehicleJourneyRef
            }
            publicContact {
              url
              phoneNumber
            }
          }
        }
      }
    `;

    try {
      const result = await client.query({
        query,
        errorPolicy: 'all',
      });

      if (result.errors?.length) {
        const error: AppError = {
          message: result.errors[0].message,
          code:
            ((result.errors[0].extensions?.classification ??
              result.errors[0].extensions?.code) as string) || 'GRAPHQL_ERROR',
          details: result.errors[0].path,
        };
        return { error };
      }

      const filtered = result.data?.extrajourneys.filter(
        (extJourney: {
          estimatedVehicleJourney: {
            estimatedCalls: { estimatedCall: EstimatedCall[] };
          };
        }) =>
          extJourney.estimatedVehicleJourney?.estimatedCalls?.estimatedCall?.some(
            call =>
              call.departureStopAssignment != null &&
              call.departureStopAssignment.expectedFlexibleArea != null
          )
      );

      return { data: filtered };
    } catch (err) {
      const error = err as ApolloError;
      const appError: AppError = {
        message: error.message,
        code:
          ((error.graphQLErrors?.[0]?.extensions?.classification ??
            error.graphQLErrors?.[0]?.extensions?.code) as string) || 'NETWORK_ERROR',
        details: {
          networkError: error.networkError,
          graphQLErrors: error.graphQLErrors,
        },
      };
      return { error: appError };
    }
  };

const bookPassengerRide =
  (
    uri: string,
    auth: AuthState,
    originalTrip: Extrajourney,
    bookingData: PassengerBookingData,
    routeLeg: RouteLeg
  ) =>
  async (): Promise<{ data?: string; error?: AppError }> => {
    if (!auth.user?.access_token) {
      throw new Error('Access token is missing');
    }
    const client = createClient(uri, auth);

    const mutation = gql`
      mutation CreateOrUpdateExtrajourney($input: ExtrajourneyInput!) {
        createOrUpdateExtrajourney(input: $input)
      }
    `;

    try {
      const variables = await prepareBookingData(originalTrip, bookingData, routeLeg);

      const result = await client.mutate({
        mutation,
        variables,
        errorPolicy: 'all',
      });

      if (result.errors?.length) {
        const error: AppError = {
          message: result.errors[0].message,
          code:
            ((result.errors[0].extensions?.classification ??
              result.errors[0].extensions?.code) as string) || 'GRAPHQL_ERROR',
          details: result.errors[0].path,
        };
        return { error };
      }

      return { data: result.data?.createOrUpdateExtrajourney };
    } catch (err) {
      const error = err as ApolloError;
      const appError: AppError = {
        message: error.message,
        code:
          ((error.graphQLErrors?.[0]?.extensions?.classification ??
            error.graphQLErrors?.[0]?.extensions?.code) as string) || 'NETWORK_ERROR',
        details: {
          networkError: error.networkError,
          graphQLErrors: error.graphQLErrors,
        },
      };
      return { error: appError };
    }
  };

const api = (config: Config, auth?: AuthState) => {
  const streetRoute = getStreetRoute(config['journey-planner-api'] as string);
  return {
    getUserContext: getUserContext(config['carpool-messages-api'] as string, auth as AuthState),
    mutateExtrajourney: (formData: CarPoolingTripDataFormData) =>
      mutateExtrajourney(config['carpool-messages-api'] as string, auth as AuthState, formData),
    mutateFlexTour: (formData: FlexTourFormData) =>
      mutateFlexTour(config['carpool-messages-api'] as string, auth as AuthState, formData),
    cancelExtrajourney: (originalTrip: Extrajourney) =>
      cancelExtrajourney(config['carpool-messages-api'] as string, auth as AuthState, originalTrip),
    queryExtraJourney: () =>
      queryExtraJourney(config['carpool-messages-api'] as string, auth as AuthState),
    bookPassengerRide: (originalTrip: Extrajourney, bookingData: PassengerBookingData) =>
      bookPassengerRide(
        config['carpool-messages-api'] as string,
        auth as AuthState,
        originalTrip,
        bookingData,
        streetRoute
      ),
    getStreetRoute: streetRoute,
  };
};

export default api;
