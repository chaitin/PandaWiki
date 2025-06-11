import { render, screen, fireEvent } from '@testing-library/react';
import Card from './index';
import { vi } from 'vitest';

describe('Card component', () => {
  it('renders children correctly', () => {
    render(
      <Card>
        <div data-testid="child-div">Hello World</div>
        <span>Some text</span>
      </Card>
    );
    expect(screen.getByTestId('child-div')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('Some text')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(
      <Card onClick={handleClick}>
        <div>Clickable Card</div>
      </Card>
    );
    const cardElement = screen.getByText('Clickable Card').parentElement; // Get the Paper element
    if (cardElement) {
      fireEvent.click(cardElement);
    }
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const customClass = 'my-custom-card';
    render(
      <Card className={customClass}>
        <div>Card with custom class</div>
      </Card>
    );
    // The className is applied to the Paper component, which is the root of Card
    const cardElement = screen.getByText('Card with custom class').parentElement;
    expect(cardElement).toHaveClass(customClass);
    expect(cardElement).toHaveClass('paper-item'); // Also check for default class
  });

  it('applies sx prop', () => {
    // Testing sx props precisely can be tricky. We'll check if the style is applied.
    // The Paper component is the root, so its style attribute should reflect sx.
    const sxProps = { padding: '20px', backgroundColor: 'rgb(255, 0, 0)' }; // Use rgb for easier comparison
    render(
      <Card sx={sxProps}>
        <div>Card with sx</div>
      </Card>
    );
    const cardElement = screen.getByText('Card with sx').parentElement;
    expect(cardElement).toHaveStyle('padding: 20px');
    expect(cardElement).toHaveStyle('background-color: rgb(255, 0, 0)');
  });

  // The original task mentioned "title" and "actions" but these props don't exist on this Card component.
  // If these were features of a different Card or if the current Card is meant to be composed
  // (e.g., title passed as a child), the tests reflect the actual implementation.
});
