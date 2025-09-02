import { useEffect, useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext.tsx';
import api from '../../../shared/api/api.tsx';

export type Operator = {
  id: string;
  name: string;
};

export const useOperators = () => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const config = useConfig();

  useEffect(() => {
    const getOperators = async () => {
      const response = await api(config).getOperators();
      if (response.data) {
        setOperators(response.data.operators);
      } else {
        console.log('Could not find any operators');
      }
    };
    getOperators().then();
  }, [config]);

  return operators;
};
