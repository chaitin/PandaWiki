import { AppSetting, KnowledgeBaseListItem } from '@/api';
import { DomainLicenseResp } from '@/request/pro/types';
import {
  DomainAppDetailResp,
  DomainKnowledgeBaseDetail,
  V1UserInfoResp,
  GithubComChaitinPandaWikiDomainModelListItem,
} from '@/request/types';
import { createSlice } from '@reduxjs/toolkit';

export interface config {
  user: V1UserInfoResp;
  kb_id: string;
  license: DomainLicenseResp;
  kbList: KnowledgeBaseListItem[] | null;
  modelList: GithubComChaitinPandaWikiDomainModelListItem[] | null;
  kb_c: boolean;
  modelStatus: boolean;
  kbDetail: DomainKnowledgeBaseDetail;
  appPreviewData: DomainAppDetailResp | null;
  refreshAdminRequest: () => void;
  isRefreshDocList: boolean;
  isCreateWikiModalOpen: boolean;
}

const initialState: config = {
  user: {
    id: '',
    account: '',
    created_at: '',
  },
  license: {
    edition: 2,
    expired_at: 0,
    started_at: 0,
  },
  kb_id: '',
  kbList: null,
  modelList: null,
  kb_c: false,
  modelStatus: false,
  kbDetail: {} as DomainKnowledgeBaseDetail,
  appPreviewData: null,
  refreshAdminRequest: () => {},
  isRefreshDocList: false,
  isCreateWikiModalOpen: false,
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setUser(state, { payload }) {
      state.user = payload;
    },
    setKbId(state, { payload }) {
      localStorage.setItem('kb_id', payload);
      state.kb_id = payload;
    },
    setKbList(state, { payload }) {
      state.kbList = payload;
    },
    setKbC(state, { payload }) {
      state.kb_c = payload;
    },
    setModelList(state, { payload }) {
      state.modelList = payload;
    },
    setModelStatus(state, { payload }) {
      state.modelStatus = payload;
    },
    setLicense(state, { payload }) {
      state.license = payload;
    },
    setAppPreviewData(state, { payload }) {
      state.appPreviewData = payload;
    },
    setKbDetail(state, { payload }) {
      state.kbDetail = payload;
    },
    setRefreshAdminRequest(state, { payload }) {
      state.refreshAdminRequest = payload;
    },
    setIsRefreshDocList(state, { payload }) {
      state.isRefreshDocList = payload;
    },
    setIsCreateWikiModalOpen(state, { payload }) {
      state.isCreateWikiModalOpen = payload;
    },
  },
});

export const {
  setUser,
  setKbId,
  setKbList,
  setKbC,
  setModelStatus,
  setLicense,
  setAppPreviewData,
  setKbDetail,
  setRefreshAdminRequest,
  setModelList,
  setIsRefreshDocList,
  setIsCreateWikiModalOpen,
} = configSlice.actions;
export default configSlice.reducer;
