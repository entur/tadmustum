import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

interface Options {
  // Current URL the test should mount at.
  path?: string;
  // Route pattern when the component reads URL params via useParams.
  route?: string;
}

export const renderWithRouter = (element: ReactElement, { path, route }: Options = {}) => {
  const body = route ? (
    <Routes>
      <Route path={route} element={element} />
    </Routes>
  ) : (
    element
  );
  return render(<MemoryRouter initialEntries={path ? [path] : undefined}>{body}</MemoryRouter>);
};
