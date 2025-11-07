/// <reference types="@panda-wiki/themes/types" />

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module 'swiper/css' {
  const content: string;
  export default content;
}

declare module 'swiper/css/pagination' {
  const content: string;
  export default content;
}

declare module '@mui/material/styles' {
  interface TypeBackground {
    paper2?: string;
    paper3?: string;
    footer?: string;
  }
}

declare module '*.css' {}
