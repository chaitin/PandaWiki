/// <reference types="@panda-wiki/themes/types" />

declare module '@cap.js/widget' {
  interface CapOptions {
    apiEndpoint: string;
  }

  class Cap {
    constructor(options: CapOptions);
    solve(): Promise<{ token: string }>;
  }

  export default Cap;
}
