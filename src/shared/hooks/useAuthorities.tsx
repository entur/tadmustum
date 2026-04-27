import { useEffect, useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext.tsx';
import { useAuth } from 'react-oidc-context';
import api from '../api/api.tsx';
import { useNoAccess } from '../../contexts/NoAccessContext.tsx';

type CodespaceAuthority = {
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

export const useAuthorities: () => {
  authorities: CodespaceAuthority[];
  allowedCodespaces: Codespace[];
} = () => {
  const auth = useAuth();
  const config = useConfig();
  const [codespaceAuthorities, setCodespaceAuthorities] = useState<CodespaceAuthority[]>([]);
  const [allowedCodespaces, setAllowedCodespaces] = useState<Codespace[]>([]);
  const { triggerNoAccess } = useNoAccess();

  useEffect(() => {
    const fetchAuthorities = async () => {
      if (!auth.user?.access_token) {
        return;
      }
      const userContextResponse = await api(config, auth).getUserContext();
      const userContext = userContextResponse.data['userContext'];
      const allowedCodespaces: Codespace[] = userContext.allowedCodespaces;

      const noOrganizations = allowedCodespaces.length <= 0;
      if (noOrganizations) {
        triggerNoAccess();
      } else {
        const response = await api(config).getAuthorities();
        const authorities = response.data.authorities;

        if (!(authorities.length > 0)) {
          triggerNoAccess();
        } else {
          setAllowedCodespaces(allowedCodespaces);
          // Authority ids look like `<codespace>:Authority:<X>`; key by the
          // codespace prefix so we can look them up by codespace.id.
          const orgByCodespace: Map<string, CodespaceAuthority> = new Map(
            authorities.map((org: CodespaceAuthority) => [org.id.split(':')[0], org])
          );

          setCodespaceAuthorities(
            allowedCodespaces.map(codespace => {
              const existing = orgByCodespace.get(codespace.id);

              return existing
                ? // This awkwardness is because we resolve the name of the codespace in OTP in lieu of an authoritative data owner
                  { id: existing.id, name: existing.name }
                : // The following works for ENT who are ENT:Authority:ENT, but other like ATB have a numerical part as the last segment of their ID.
                  { id: `${codespace.id}:Authority:${codespace.id}`, name: codespace.id };
            })
          );
        }
      }
    };

    fetchAuthorities().then();
  }, [auth, config, triggerNoAccess]);

  return { authorities: codespaceAuthorities, allowedCodespaces };
};
