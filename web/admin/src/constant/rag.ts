import { ConstsNodeRagInfoStatus } from '@/request';

const RAG_SOURCES = {
  [ConstsNodeRagInfoStatus.NodeRagStatusReindexing]: {
    name: '重新索引中',
    color: 'warning',
  },
  [ConstsNodeRagInfoStatus.NodeRagStatusPending]: {
    name: '待学习',
    color: 'warning',
  },
  [ConstsNodeRagInfoStatus.NodeRagStatusRunning]: {
    name: '正在学习',
    color: 'warning',
  },
  [ConstsNodeRagInfoStatus.NodeRagStatusFailed]: {
    name: '学习失败',
    color: 'error',
  },
  [ConstsNodeRagInfoStatus.NodeRagStatusSucceeded]: {
    name: '学习成功',
    color: 'success',
  },
};

export default RAG_SOURCES;
