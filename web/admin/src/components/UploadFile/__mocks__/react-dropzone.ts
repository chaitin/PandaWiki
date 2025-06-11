import { vi } from 'vitest';

const useDropzone = vi.fn().mockImplementation((options) => {
  // Allow tests to provide their own onDrop or other options by passing them to useDropzone
  const onDrop = options?.onDrop || vi.fn();

  // Simulate the props returned by the actual useDropzone hook
  const getRootProps = vi.fn((props) => ({
    ...props,
    // Add any specific root props you want to mock, e.g., role, tabIndex
    role: 'button', // Example, adjust as needed
    // onKeyDown, onFocus, onBlur, onClick, onDragEnter, onDragOver, onDragLeave, onDrop
  }));

  const getInputProps = vi.fn((props) => ({
    ...props,
    type: 'file',
    // onChange, etc.
  }));

  return {
    getRootProps,
    getInputProps,
    isDragActive: false,
    isFocused: false,
    isFileDialogActive: false,
    acceptedFiles: [], // Can be updated by test by calling onDrop
    fileRejections: [], // Can be updated by test by calling onDrop
    // Allow tests to trigger onDrop directly:
    // This is a custom addition to the mock for easier testing.
    // The actual useDropzone doesn't return onDrop, it takes it as an option.
    // But we can make our mock store it so tests can call it.
    _mockOnDrop: onDrop, // Store the onDrop to be called by tests
  };
});

export { useDropzone };
