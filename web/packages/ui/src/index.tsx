export { default as Footer } from './footer';
export { default as WelcomeFooter } from './welcomeFooter';
export { default as Header } from './header';
export { default as WelcomeHeader } from './welcomeHeader';
export { default as Banner } from './banner';
export { default as BasicDoc } from './basicDoc';
export { default as DirDoc } from './dirDoc';
export { default as SimpleDoc } from './simpleDoc';
export { default as Carousel } from './carousel';
export { default as Faq } from './faq';
export { default as Metrics } from './metrics';
export { default as Text } from './text';
export { default as Case } from './case';
export { default as ImgText } from './imgText';
export { default as Feature } from './feature';
export { default as Comment } from './comment';
export { default as Question } from './question';
export { default as BlockGrid } from './blockGrid';

export {
  CHAT_TOP_N_STORAGE_KEY,
  DEFAULT_CHAT_TOP_N,
  getInitialChatTopN,
  parseValidChatTopN,
  persistChatTopN,
} from './chatTopNStorage';

// 导出动画 hooks
export {
  useTextAnimation,
  useFadeInText,
  useTypewriterText,
  useCardFadeInAnimation,
  useCardAnimation,
} from './hooks/useGsapAnimation';
