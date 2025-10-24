import { ApolloClient, ApolloError, gql, InMemoryCache } from '@apollo/client';
import type { Config } from '../../contexts/ConfigContext.tsx';
import type { AuthState } from 'react-oidc-context';
import prepareCarpoolingFormData from './prepareCarpoolingFormData.tsx';
import prepareBookingData, { type PassengerBookingData } from './prepareBookingData.tsx';
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

  return new ApolloClient({
    uri,
    headers: headers,
    cache: new InMemoryCache({
      addTypename: false,
    }),
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
                expectedDepartureTime
                order
                requestStop
                stopPointName
                stopPointRef
                departureStopAssignment {
                  expectedFlexibleArea {
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
  (uri: string, auth: AuthState, originalTrip: Extrajourney, bookingData: PassengerBookingData) =>
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
      const variables = prepareBookingData(originalTrip, bookingData);

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
  return {
    getAuthorities: getAuthorities(config['journey-planner-api'] as string),
    getOperators: getOperators(config['journey-planner-api'] as string),
    getUserContext: getUserContext(config['deviation-messages-api'] as string, auth as AuthState),
    mutateExtrajourney: (formData: CarPoolingTripDataFormData) =>
      mutateExtrajourney(config['deviation-messages-api'] as string, auth as AuthState, formData),
    queryExtraJourney: (codespace: string, authority: string, showCompletedTrips: boolean) =>
      queryExtraJourney(
        config['deviation-messages-api'] as string,
        auth as AuthState,
        codespace,
        authority,
        showCompletedTrips
      ),
    bookPassengerRide: (originalTrip: Extrajourney, bookingData: PassengerBookingData) =>
      bookPassengerRide(
        config['deviation-messages-api'] as string,
        auth as AuthState,
        originalTrip,
        bookingData
      ),
  };
};

export default api;
