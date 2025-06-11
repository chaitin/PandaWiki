import { render, screen } from '@testing-library/react';
import Header from './index'; // Path confirmed by ls
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from '../../store'; // Changed to default import

describe('Header component', () => {
  it('renders without crashing', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      </Provider>
    );
    // A simple initial assertion.
    // We can make this more specific if we know an element that's always present.
    // For now, if no error is thrown, the test will pass.
    // Example: expect(screen.getByRole('banner')).toBeInTheDocument();
    // The default <header> HTML element has a "banner" role.
    // Let's try to find something more concrete or just check for the banner role.
    // For a generic header, it's common to have a company logo or main title.
    // Based on the output, "文档" seems to be a stable part of the header.
    expect(screen.getByText('文档')).toBeInTheDocument();
  });
});
