import { ApolloClient, ApolloError, gql, InMemoryCache } from "@apollo/client";
import type { Config } from "../config/ConfigContext.tsx";
import type { AuthState } from "react-oidc-context";
import prepareCarpoolingFormData from "./prepareCarpoolingFormData.tsx";
import type { CarPoolingTripDataFormData } from "../../features/plan-trip/model/CarPoolingTripDataFormData.tsx";
import type { AppError } from "../error-message/AppError.tsx";

const createClient = (uri: string, auth?: AuthState) => {
  const headers = {
    "ET-Client-Name": "entur - deviation-messages",
  } as Record<string, string>;

  if (auth?.user?.access_token) {
    const access_token = auth?.user?.access_token;
    headers["Authorization"] = `Bearer ${access_token}`;
  }

  return new ApolloClient({
    uri,
    headers: headers,
    cache: new InMemoryCache({
      addTypename: false,
    }),
  });
};

const createOrUpdateExtrajourney =
  (uri: string, auth: AuthState, formData: CarPoolingTripDataFormData) =>
  async (): Promise<{ data?: string; error?: AppError }> => {
    if (!auth.user?.access_token) {
      throw new Error("Access token is missing");
    }
    const client = createClient(uri, auth);

    const mutation = gql`
      mutation CreateOrUpdateExtrajourney(
        $codespace: String!
        $authority: String!
        $input: ExtrajourneyInput!
      ) {
        createOrUpdateExtrajourney(
          codespace: $codespace
          authority: $authority
          input: $input
        )
      }
    `;

    const variables = prepareCarpoolingFormData(formData);

    try {
      const result = await client.mutate({
        mutation,
        variables,
        errorPolicy: "all",
      });

      if (result.errors?.length) {
        const error: AppError = {
          message: result.errors[0].message,
          code:
            (result.errors[0].extensions?.code as string) || "GRAPHQL_ERROR",
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
          (error.graphQLErrors?.[0]?.extensions?.code as string) ||
          "NETWORK_ERROR",
        details: {
          networkError: error.networkError,
          graphQLErrors: error.graphQLErrors,
        },
      };
      return { error: appError };
    }
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
    .catch((error) => error)
    .then((response) => response);
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
    .catch((error) => error)
    .then((response) => response);
};

const getUserContext = (uri: string, auth: AuthState) => async () => {
  if (!auth.user?.access_token) {
    throw new Error("Authentication token is missing");
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
    .catch((error) => error)
    .then((response) => response);
};

const api = (config: Config, auth?: AuthState) => ({
  createOrUpdateExtrajourney: (formData: CarPoolingTripDataFormData) =>
    createOrUpdateExtrajourney(
      config["deviation-messages-api"] as string,
      auth as AuthState,
      formData,
    ),
  getAuthorities: getAuthorities(config["journey-planner-api"] as string),
  getOperators: getOperators(config["journey-planner-api"] as string),
  getUserContext: getUserContext(
    config["deviation-messages-api"] as string,
    auth as AuthState,
  ),
});

export default api;
