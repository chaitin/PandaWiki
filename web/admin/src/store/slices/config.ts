import { KnowledgeBaseListItem, LicenseInfo, UserInfo } from '@/api';
import { createSlice } from '@reduxjs/toolkit';

export interface config {
  user: UserInfo
  kb_id: string
  license: LicenseInfo
  kbList: KnowledgeBaseListItem[]
  kb_c: boolean
  modelStatus: boolean
}
const initialState: config = {
  user: {
    id: '',
    account: '',
    created_at: '',
  },
  license: {
    edition: 0,
    expired_at: 0,
    started_at: 0,
  },
  kb_id: '',
  kbList: [],
  kb_c: false,
  modelStatus: false
}

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setUser(state, { payload }) {
      state.user = payload
    },
    setKbId(state, { payload }) {
      localStorage.setItem('kb_id', payload)
      state.kb_id = payload
    },
    setKbList(state, { payload }) {
      state.kbList = payload
    },
    setKbC(state, { payload }) {
      state.kb_c = payload
    },
    setModelStatus(state, { payload }) {
      state.modelStatus = payload
    },
    setLicense(state, { payload }) {
      state.license = payload
    },
  },
})

export const { setUser, setKbId, setKbList, setKbC, setModelStatus, setLicense } = configSlice.actions;
export default configSlice.reducer