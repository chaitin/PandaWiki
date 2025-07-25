/* eslint-disable @typescript-eslint/no-explicit-any */
import LinearProgress from '@mui/material/LinearProgress';
import { styled } from '@mui/material/styles';
import {
  LazyExoticComponent,
  Suspense,
  createElement,
  forwardRef,
  lazy,
} from 'react';
import { JSX } from 'react/jsx-runtime';

const LoaderWrapper = styled('div')({
  position: 'fixed',
  top: 0,
  left: 0,
  zIndex: 1301,
  width: '100%',
});

const Loader = () => (
  <LoaderWrapper>
    <LinearProgress color='primary' />
  </LoaderWrapper>
);

const LazyLoadable = (
  Component: LazyExoticComponent<() => JSX.Element>
): React.ForwardRefExoticComponent<any> =>
  forwardRef((props: any, ref: React.Ref<any>) => (
    <Suspense fallback={<Loader />}>
      <Component {...props} ref={ref} />
    </Suspense>
  ));

const router = [
  {
    path: '/',
    element: createElement(
      LazyLoadable(lazy(() => import('./pages/document')))
    ),
  },
  {
    path: '/doc/editor/:id',
    element: createElement(
      LazyLoadable(lazy(() => import('./pages/document/editor')))
    ),
  },
  {
    path: '/login',
    element: createElement(LazyLoadable(lazy(() => import('./pages/login')))),
  },
  {
    path: '/setting',
    element: createElement(LazyLoadable(lazy(() => import('./pages/setting')))),
  },
  {
    path: '/release',
    element: createElement(LazyLoadable(lazy(() => import('./pages/release')))),
  },
  {
    path: '/stat',
    element: createElement(LazyLoadable(lazy(() => import('./pages/stat')))),
  },
  {
    path: '/conversation',
    element: createElement(
      LazyLoadable(lazy(() => import('./pages/conversation')))
    ),
  },
  {
    path: '/feedback/:tab?',
    element: createElement(
      LazyLoadable(lazy(() => import('./pages/feedback')))
    ),
  },
];

export default router;
