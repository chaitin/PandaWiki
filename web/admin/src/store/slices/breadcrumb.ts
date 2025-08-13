import { createSlice } from '@reduxjs/toolkit';

export type breadcrumb = {
  pageName: string;
};

const initialState: breadcrumb = {
  pageName: '',
};

const breadcrumbSlice = createSlice({
  name: 'breadcrumb',
  initialState: initialState,
  reducers: {
    setPageName(state, { payload }) {
      state.pageName = payload;
    },
  },
});

export const { setPageName } = breadcrumbSlice.actions;
export default breadcrumbSlice.reducer;
