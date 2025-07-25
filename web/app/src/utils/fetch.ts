type SSECallback<T> = (data: T) => void;
type SSEErrorCallback = (error: Error) => void;
type SSECompleteCallback = () => void;

interface SSEClientOptions {
  url: string;
  headers?: Record<string, string>;
  onOpen?: SSECompleteCallback;
  onError?: SSEErrorCallback;
  onCancel?: SSEErrorCallback;
  onComplete?: SSECompleteCallback;
}

class SSEClient<T> {
  private controller: AbortController;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null;
  private textDecoder: TextDecoder;
  private buffer: string;

  constructor(private options: SSEClientOptions) {
    this.controller = new AbortController();
    this.reader = null;
    this.textDecoder = new TextDecoder();
    this.buffer = '';
  }

  public subscribe(body: BodyInit, onMessage: SSECallback<T>) {
    this.controller.abort();
    this.controller = new AbortController();
    const { url, headers, onOpen, onError, onComplete } = this.options;

    const timeoutDuration = 300000;
    const timeoutId = setTimeout(() => {
      this.unsubscribe();
      onError?.(new Error('Request timed out after 5 minutes'));
    }, timeoutDuration);

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...headers,
      },
      body,
      signal: this.controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          clearTimeout(timeoutId);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (!response.body) {
          clearTimeout(timeoutId);
          onError?.(new Error('No response body'));
          return;
        }

        onOpen?.();
        this.reader = response.body.getReader();

        while (true) {
          const { done, value } = await this.reader.read();
          if (done) {
            clearTimeout(timeoutId);
            onComplete?.();
            break;
          }

          this.processChunk(value, onMessage);
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error.name !== 'AbortError') {
          onError?.(error);
        }
      });
  }

  private processChunk(chunk: Uint8Array | undefined, callback: SSECallback<T>) {
    if (!chunk) return;

    this.buffer += this.textDecoder.decode(chunk, { stream: true });
    const lines = this.buffer.split('\n');

    let currentData = '';
    let isDataLine = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('data: ')) {
        if (isDataLine) {
          currentData += '\n';
        }
        currentData += line.slice(6);
        isDataLine = true;
      } else if (line === '') {
        if (isDataLine) {
          try {
            const data = JSON.parse(currentData) as T;
            callback(data);
          } catch (error) {
            console.error(error)
            this.options.onError?.(new Error('Failed to parse SSE data'));
          }
          currentData = '';
          isDataLine = false;
        }
      }
    }

    this.buffer = lines[lines.length - 1];
  }

  public unsubscribe() {
    this.controller.abort();
    if (this.reader) {
      this.reader.cancel();
    }
    this.options.onCancel?.(new Error('Request canceled'));
  }
}

export default SSEClient;