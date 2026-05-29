import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StopOccupancy from './StopOccupancy';

describe('StopOccupancy', () => {
  it('renders onboard count and capacity', () => {
    render(<StopOccupancy onboardCount={2} totalCapacity={4} />);
    expect(screen.getByText(/2 \/ 4 seats/)).toBeInTheDocument();
  });

  it('marks the stop as full when onboard equals capacity', () => {
    render(<StopOccupancy onboardCount={4} totalCapacity={4} />);
    expect(screen.getByText(/4 \/ 4 seats \(full\)/)).toBeInTheDocument();
  });

  it('marks the stop as over capacity when onboard exceeds capacity', () => {
    render(<StopOccupancy onboardCount={5} totalCapacity={4} />);
    expect(screen.getByText(/5 \/ 4 seats \(over capacity\)/)).toBeInTheDocument();
  });

  it('shows a dash for missing values', () => {
    render(<StopOccupancy onboardCount={undefined} totalCapacity={4} />);
    expect(screen.getByText(/– \/ 4 seats/)).toBeInTheDocument();
  });

  it('renders nothing when both values are missing', () => {
    const { container } = render(<StopOccupancy />);
    expect(container).toBeEmptyDOMElement();
  });
});
