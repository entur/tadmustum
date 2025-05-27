import type { CarPoolingTripDataFormData } from "../pages/CarPoolingTripDataForm.tsx";
import { useConfig } from "../config/ConfigContext.tsx";
import api from "../api/api.tsx";
import { useAuth } from "react-oidc-context";

export const useCreateOrUpdateExtrajourney = () => {
  const config = useConfig();
  const auth = useAuth();

  return async (formData: CarPoolingTripDataFormData) => {
    console.log("hello");

    if (!auth.user?.access_token) return;

    await api(config, auth).createOrUpdateExtrajourney(formData).apply(this);

    console.log("bye");
  };
};
