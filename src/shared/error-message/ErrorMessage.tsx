import type { AppError } from './AppError.tsx';
import { useConfig } from '../../contexts/ConfigContext.tsx';

export const ErrorMessage = ({ error }: { error: AppError | undefined }) => {
  const config = useConfig();

  return (
    <div className="error-message">
      {!!error?.code && (
        <p>
          Error {error?.code}: {error?.message}
        </p>
      )}
      {config.showErrorDetails && !!error?.details && (
        <pre>{JSON.stringify(error.details, null, 2)} </pre>
      )}
    </div>
  );
};
