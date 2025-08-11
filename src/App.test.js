import { render, screen } from '@testing-library/react';
import App from './App';

test('renders fitness application', () => {
  render(<App />);
  const headerElements = screen.getAllByText(/Fitness Command Center/i);
  expect(headerElements.length).toBeGreaterThan(0);
  expect(headerElements[0]).toBeInTheDocument();
});
