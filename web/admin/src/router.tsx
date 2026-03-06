import LinearProgress from '@mui/material/LinearProgress';
import { styled } from '@mui/material/styles';
import { MainLayout, NoSidebarHeaderLayout } from './layouts';

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

export const Loader = () => (
  <LoaderWrapper>
    <LinearProgress color='primary' />
  </LoaderWrapper>
);

const LazyLoadable = (
  Component: LazyExoticComponent<() => JSX.Element>,
): React.ForwardRefExoticComponent<any> =>
  forwardRef((props: any, ref: React.Ref<any>) => (
    <Suspense fallback={<Loader />}>
      <Component {...props} ref={ref} />
    </Suspense>
  ));

const router = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '',
        element: createElement(
          LazyLoadable(lazy(() => import('./pages/document/layout'))),
        ),
      },
      {
        path: '/setting',
        element: createElement(
          LazyLoadable(lazy(() => import('./pages/setting'))),
        ),
      },
      {
        path: '/contribution',
        element: createElement(
          LazyLoadable(lazy(() => import('./pages/contribution'))),
        ),
      },
      {
        path: '/release',
        element: createElement(
          LazyLoadable(lazy(() => import('./pages/release'))),
        ),
      },
      {
        path: '/stat',
        element: createElement(
          LazyLoadable(lazy(() => import('./pages/stat'))),
        ),
      },
      {
        path: '/conversation',
        element: createElement(
          LazyLoadable(lazy(() => import('./pages/conversation'))),
        ),
      },
      {
        path: '/feedback/:tab?',
        element: createElement(
          LazyLoadable(lazy(() => import('./pages/feedback'))),
        ),
      },
    ],
  },
  {
    path: '/',
    element: <NoSidebarHeaderLayout hasAuth={true} />,
    children: [
      {
        path: 'doc/editor',
        element: createElement(
          LazyLoadable(lazy(() => import('./pages/document/editor'))),
        ),
        children: [
          {
            path: ':id',
            element: createElement(
              LazyLoadable(lazy(() => import('./pages/document/editor/edit'))),
            ),
          },
          {
            path: 'history/:id',
            element: createElement(
              LazyLoadable(
                lazy(() => import('./pages/document/editor/history')),
              ),
            ),
          },
          {
            path: 'space',
            element: createElement(
              LazyLoadable(lazy(() => import('./pages/document/editor/space'))),
            ),
          },
        ],
      },
    ],
  },
  {
    path: '/',
    element: <NoSidebarHeaderLayout hasAuth={false} />,
    children: [
      {
        path: 'login',
        element: createElement(
          LazyLoadable(lazy(() => import('./pages/login'))),
        ),
      },
      {
        path: '401',
        element: createElement(LazyLoadable(lazy(() => import('./pages/401')))),
      },
    ],
  },
];

export default router;
