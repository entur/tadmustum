import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

interface Options {
  // Current URL the test should mount at.
  path?: string;
  // Route pattern when the component reads URL params via useParams.
  route?: string;
  // Location state to seed the initial entry with (e.g. navigate(..., { state })).
  state?: unknown;
}

export const renderWithRouter = (element: ReactElement, { path, route, state }: Options = {}) => {
  const body = route ? (
    <Routes>
      <Route path={route} element={element} />
    </Routes>
  ) : (
    element
  );
  const initialEntries =
    state !== undefined ? [{ pathname: path ?? '/', state }] : path ? [path] : undefined;
  return render(<MemoryRouter initialEntries={initialEntries}>{body}</MemoryRouter>);
};
