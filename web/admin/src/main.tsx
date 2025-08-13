import '@/assets/fonts/font.css';
import '@/assets/fonts/iconfont';
import '@/assets/styles/index.css';
import '@/assets/styles/markdown.css';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import store from './store';

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Provider store={store}>
      <App />
    </Provider>
  </BrowserRouter>,
);
