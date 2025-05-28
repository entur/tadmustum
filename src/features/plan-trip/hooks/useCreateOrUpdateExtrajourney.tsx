import { useConfig } from "../../../shared/config/ConfigContext.tsx";
import api from "../../../shared/api/api.tsx";
import { useAuth } from "react-oidc-context";
import type { CarPoolingTripDataFormData } from "../model/CarPoolingTripDataFormData.tsx";

export const useCreateOrUpdateExtrajourney = () => {
  const config = useConfig();
  const auth = useAuth();

  return async (formData: CarPoolingTripDataFormData) => {
    if (!auth.user?.access_token) return;

    await api(config, auth).createOrUpdateExtrajourney(formData).apply(this);
  };
};
