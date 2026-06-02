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
import prepareBookingData, {
  type PassengerBookingData,
  type RouteLeg,
} from './prepareBookingData.tsx';
import getStreetRoute from './journeyPlannerStreetRoute.tsx';
import type { CarPoolingTripDataFormData } from '../../features/plan-trip/model/CarPoolingTripDataFormData.tsx';
import type { AppError } from '../error-message/AppError.tsx';
import type { Extrajourney } from '../model/Extrajourney.tsx';
import type { EstimatedCall } from '../model/EstimatedCall.tsx';

const createClient = (uri: string, auth?: AuthState) => {
  const headers = {
    'ET-Client-Name': 'entur - deviation-messages',
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

const getAuthorities = (uri: string) => async () => {
  const client = createClient(uri);

  const query = gql`
    query GetAuthorities {
      authorities {
        id
        name
      }
    }
  `;

  return client
    .query({ query })
    .catch(error => error)
    .then(response => response);
};

const getOperators = (uri: string) => async () => {
  const client = createClient(uri);

  const query = gql`
    query GetOperators {
      operators {
        id
        name
      }
    }
  `;

  return client
    .query({ query })
    .catch(error => error)
    .then(response => response);
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
      mutation CreateOrUpdateExtrajourney(
        $codespace: String!
        $authority: String!
        $input: ExtrajourneyInput!
      ) {
        createOrUpdateExtrajourney(codespace: $codespace, authority: $authority, input: $input)
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
          code: (result.errors[0].extensions?.code as string) || 'GRAPHQL_ERROR',
          details: result.errors[0].path,
        };
        return { error };
      }

      return { data: result.data?.createOrUpdateExtrajourney };
    } catch (err) {
      const error = err as ApolloError;
      const appError: AppError = {
        message: error.message,
        code: (error.graphQLErrors?.[0]?.extensions?.code as string) || 'NETWORK_ERROR',
        details: {
          networkError: error.networkError,
          graphQLErrors: error.graphQLErrors,
        },
      };
      return { error: appError };
    }
  };

const cancelExtrajourney =
  (uri: string, auth: AuthState, originalTrip: Extrajourney, authority: string) =>
  async (): Promise<{ data?: string; error?: AppError }> => {
    if (!auth.user?.access_token) {
      throw new Error('Access token is missing');
    }

    // Codespace is the prefix of the trip's lineRef (`<CODESPACE>:CarPooling:<uuid>`)
    // and must match the supplied authority — nunamnir enforces this server-side.
    const codespace = originalTrip.estimatedVehicleJourney.lineRef?.split(':')[0];
    if (!codespace) {
      return {
        error: {
          message: 'Trip is missing a lineRef; cannot determine codespace',
          code: 'MISSING_CODESPACE',
          details: 'no estimatedVehicleJourney.lineRef',
        },
      };
    }

    const client = createClient(uri, auth);

    const mutation = gql`
      mutation CreateOrUpdateExtrajourney(
        $codespace: String!
        $authority: String!
        $input: ExtrajourneyInput!
      ) {
        createOrUpdateExtrajourney(codespace: $codespace, authority: $authority, input: $input)
      }
    `;

    // Cancel the whole trip by re-submitting the existing journey through the
    // same upsert mutation the editor uses, with the journey-level cancellation
    // flag set. recordedAtTime is bumped so downstream consumers treat this as
    // the newest version of the journey.
    const input: Extrajourney = {
      id: originalTrip.id,
      estimatedVehicleJourney: {
        ...originalTrip.estimatedVehicleJourney,
        cancellation: true,
        recordedAtTime: new Date().toISOString(),
      },
    };

    try {
      const result = await client.mutate({
        mutation,
        variables: { codespace, authority, input },
        errorPolicy: 'all',
      });

      if (result.errors?.length) {
        const error: AppError = {
          message: result.errors[0].message,
          code: (result.errors[0].extensions?.code as string) || 'GRAPHQL_ERROR',
          details: result.errors[0].path,
        };
        return { error };
      }

      return { data: result.data?.createOrUpdateExtrajourney };
    } catch (err) {
      const error = err as ApolloError;
      const appError: AppError = {
        message: error.message,
        code: (error.graphQLErrors?.[0]?.extensions?.code as string) || 'NETWORK_ERROR',
        details: {
          networkError: error.networkError,
          graphQLErrors: error.graphQLErrors,
        },
      };
      return { error: appError };
    }
  };

const queryExtraJourney =
  (
    uri: string,
    auth: AuthState,
    codespace: string,
    authority: string,
    showCompletedTrips: boolean
  ) =>
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

    const query = gql`
      query ExtraJourneysQuery(
        $codespace: String!
        $authority: String!
        $showCompletedTrips: Boolean!
      ) {
        extrajourneys(
          codespace: $codespace
          authority: $authority
          showCompletedTrips: $showCompletedTrips
        ) {
          id
          estimatedVehicleJourney {
            cancellation
            lineRef
            directionRef
            dataSource
            estimatedVehicleJourneyCode
            expiresAtEpochMs
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

    const variables = {
      codespace,
      authority,
      showCompletedTrips,
    };

    try {
      const result = await client.query({
        query,
        variables,
        errorPolicy: 'all',
      });

      if (result.errors?.length) {
        const error: AppError = {
          message: result.errors[0].message,
          code: (result.errors[0].extensions?.code as string) || 'GRAPHQL_ERROR',
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
        code: (error.graphQLErrors?.[0]?.extensions?.code as string) || 'NETWORK_ERROR',
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
    authority: string,
    routeLeg: RouteLeg
  ) =>
  async (): Promise<{ data?: string; error?: AppError }> => {
    if (!auth.user?.access_token) {
      throw new Error('Access token is missing');
    }
    const client = createClient(uri, auth);

    const mutation = gql`
      mutation CreateOrUpdateExtrajourney(
        $codespace: String!
        $authority: String!
        $input: ExtrajourneyInput!
      ) {
        createOrUpdateExtrajourney(codespace: $codespace, authority: $authority, input: $input)
      }
    `;

    try {
      const variables = await prepareBookingData(originalTrip, bookingData, authority, routeLeg);

      const result = await client.mutate({
        mutation,
        variables,
        errorPolicy: 'all',
      });

      if (result.errors?.length) {
        const error: AppError = {
          message: result.errors[0].message,
          code: (result.errors[0].extensions?.code as string) || 'GRAPHQL_ERROR',
          details: result.errors[0].path,
        };
        return { error };
      }

      return { data: result.data?.createOrUpdateExtrajourney };
    } catch (err) {
      const error = err as ApolloError;
      const appError: AppError = {
        message: error.message,
        code: (error.graphQLErrors?.[0]?.extensions?.code as string) || 'NETWORK_ERROR',
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
    getAuthorities: getAuthorities(config['journey-planner-api'] as string),
    getOperators: getOperators(config['journey-planner-api'] as string),
    getUserContext: getUserContext(config['carpool-messages-api'] as string, auth as AuthState),
    mutateExtrajourney: (formData: CarPoolingTripDataFormData) =>
      mutateExtrajourney(config['carpool-messages-api'] as string, auth as AuthState, formData),
    cancelExtrajourney: (originalTrip: Extrajourney, authority: string) =>
      cancelExtrajourney(
        config['carpool-messages-api'] as string,
        auth as AuthState,
        originalTrip,
        authority
      ),
    queryExtraJourney: (codespace: string, authority: string, showCompletedTrips: boolean) =>
      queryExtraJourney(
        config['carpool-messages-api'] as string,
        auth as AuthState,
        codespace,
        authority,
        showCompletedTrips
      ),
    bookPassengerRide: (
      originalTrip: Extrajourney,
      bookingData: PassengerBookingData,
      authority: string
    ) =>
      bookPassengerRide(
        config['carpool-messages-api'] as string,
        auth as AuthState,
        originalTrip,
        bookingData,
        authority,
        streetRoute
      ),
    getStreetRoute: streetRoute,
  };
};

export default api;
