import '@testing-library/jest-dom';
import { vi } from 'vitest'; // Keep for potential vi.mock usage if not fully removing mocks

// All other mocks (Canvas, Axios) are temporarily removed for diagnostic purposes.
// If tests stop timing out, we will add them back one by one.

// Example of how a specific mock might be added back:
// vi.mock('axios', () => ({ default: { get: vi.fn() /* ... more ... */ } }));
