import { useEffect, useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext.tsx';
import { useAuth } from 'react-oidc-context';
import api from '../api/api.tsx';
import { useNoAccess } from '../../contexts/NoAccessContext.tsx';

type Organization = {
  id: string;
  name: string;
};

const Permission = {
  MESSAGES: 'MESSAGES',
  CANCELLATIONS: 'CANCELLATIONS',
  EXTRAJOURNEYS: 'EXTRAJOURNEYS',
} as const;

type Permission = keyof typeof Permission;

type Codespace = {
  id: string;
  permissions: [Permission];
};

export const useOrganizations: () => {
  authorities: Organization[];
  allowedCodespaces: Codespace[];
} = () => {
  const auth = useAuth();
  const config = useConfig();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [allowedCodespaces, setAllowedCodespaces] = useState<Codespace[]>([]);
  const { triggerNoAccess } = useNoAccess();

  useEffect(() => {
    const fetchAuthorities = async () => {
      if (!auth.user?.access_token) {
        return;
      }
      const userContextResponse = await api(config, auth).getUserContext();
      const userContext = userContextResponse.data.userContext;
      const allowedCodespaceIds = userContext.allowedCodespaces.map(
        (codespace: Codespace) => codespace.id
      );

      const noOrganizations = allowedCodespaceIds.length <= 0;

      if (noOrganizations) {
        triggerNoAccess();
      } else {
        const response = await api(config).getAuthorities();
        const authorities = response.data.authorities.filter((authority: Organization) =>
          allowedCodespaceIds.includes(authority.id.split(':')[0])
        );

        if (!(authorities.length > 0)) {
          await auth.signoutRedirect();
        } else {
          setAllowedCodespaces(userContext.allowedCodespaces);

          setOrganizations(
            authorities.map(({ id, name }: Organization) => ({
              id,
              name,
            }))
          );
        }
      }
    };

    fetchAuthorities().then();
  }, [auth, config]);

  return { authorities: organizations, allowedCodespaces };
};
