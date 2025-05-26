import { describe, it, expect } from 'vitest';
import App from '../App'; // Adjust path if necessary
import { render } from '@testing-library/react';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(true).toBe(true); // Simple assertion to ensure test runs
  });
});
