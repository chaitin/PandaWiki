import { ConstsNodeRagInfoStatus } from '@/request';

const RAG_SOURCES = {
  [ConstsNodeRagInfoStatus.NodeRagStatusBasicPending]: {
    name: '待学习',
    color: 'warning',
  },
  [ConstsNodeRagInfoStatus.NodeRagStatusBasicRunning]: {
    name: '正在学习',
    color: 'warning',
  },
  [ConstsNodeRagInfoStatus.NodeRagStatusBasicFailed]: {
    name: '学习失败',
    color: 'error',
  },
  [ConstsNodeRagInfoStatus.NodeRagStatusBasicSucceeded]: {
    name: '学习成功',
    color: 'success',
  },
  [ConstsNodeRagInfoStatus.NodeRagStatusEnhancePending]: {
    name: '等待增强学习',
    color: 'warning',
  },
  [ConstsNodeRagInfoStatus.NodeRagStatusEnhanceRunning]: {
    name: '正在增强学习',
    color: 'warning',
  },
  [ConstsNodeRagInfoStatus.NodeRagStatusEnhanceFailed]: {
    name: '增强学习失败',
    color: 'error',
  },
  [ConstsNodeRagInfoStatus.NodeRagStatusEnhanceSucceeded]: {
    name: '增强学习成功',
    color: 'success',
  },
};

export default RAG_SOURCES;
