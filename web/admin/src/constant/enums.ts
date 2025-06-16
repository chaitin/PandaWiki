
import ChatLogo from '@/assets/images/chat-logo.png'
import DingLogo from '@/assets/images/ding.png'
import FeishuLogo from '@/assets/images/feishu.png'
import WecomLogo from '@/assets/images/wecom.png'

export const PageStatus = {
  1: {
    label: '正在处理',
    color: '#3248F2',
    bgcolor: '#EBEFFE',
  },
  2: {
    label: '已学习',
    color: '#82DDAF',
    bgcolor: '#F2FBF7',
  },
  3: {
    label: '处理失败',
    color: '#FE4545',
    bgcolor: '#FEECEC',
  },
}

export const PluginType = {
  1: '内置工具',
  2: '自定义工具',
}

export const IconMap = {
  'gpt-4o': 'icon-chatgpt',
  'deepseek-r1': 'icon-deepseek',
  'deepseek-v3-0324': 'icon-deepseek'
}

export const AppType = {
  1: {
    label: '网页应用',
    bgcolor: '#21222D',
    logo: ChatLogo,
  },
  2: {
    label: '网页挂件',
    bgcolor: '#3248F2',
    logo: ChatLogo,
  },
  3: {
    label: '钉钉机器人',
    bgcolor: '#0089FF',
    logo: DingLogo,
  },
  4: {
    label: '企业微信机器人',
    bgcolor: '#368ae9',
    logo: WecomLogo,
  },
  5: {
    label: '飞书机器人',
    bgcolor: '#3d73f6',
    logo: FeishuLogo,
  }
}

export const AnswerStatus = {
  1: '正在为您查找结果',
  2: '正在思考',
  3: '正在回答',
  4: '',
  5: '等待工具确认运行',
}

export const PageType = {
  1: '在线网页',
  2: '离线文件',
  3: '自定义文档',
}

export const VersionMap = {
  free: {
    label: '免费版',
    offlineFileSize: 5
  },
  contributor: {
    label: '社区贡献者版',
    offlineFileSize: 10
  },
  pro: {
    label: '专业版',
    offlineFileSize: 20
  },
  business: {
    label: '商业版',
    offlineFileSize: 20
  },
  enterprise: {
    label: '旗舰版',
    offlineFileSize: 20
  },
}

export const ModelProvider = {
  BaiZhiCloud: {
    label: 'BaiZhiCloud',
    cn: '百智云',
    icon: 'icon-baizhiyunlogo',
    urlWrite: false,
    secretRequired: true,
    customHeader: false,
    modelDocumentUrl: 'https://model-square.app.baizhi.cloud/token',
    defaultBaseUrl: 'https://model-square.app.baizhi.cloud/v1',
  },
  DeepSeek: {
    label: 'DeepSeek',
    cn: '',
    icon: 'icon-deepseek',
    urlWrite: false,
    secretRequired: true,
    customHeader: false,
    modelDocumentUrl: 'https://platform.deepseek.com/api_keys',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
  },
  OpenAI: {
    label: 'OpenAI',
    cn: '',
    icon: 'icon-chatgpt',
    urlWrite: false,
    secretRequired: true,
    customHeader: false,
    modelDocumentUrl: 'https://platform.openai.com/api-keys',
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  Ollama: {
    label: 'Ollama',
    cn: '',
    icon: 'icon-ollama',
    urlWrite: true,
    secretRequired: false,
    customHeader: true,
    modelDocumentUrl: '',
    defaultBaseUrl: 'http://127.0.0.1:11434/api',
  },
  SiliconFlow: {
    label: 'SiliconFlow',
    cn: '硅基流动',
    icon: 'icon-a-ziyuan2',
    urlWrite: false,
    secretRequired: true,
    customHeader: false,
    modelDocumentUrl: 'https://cloud.siliconflow.cn/account/ak',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
  },
  Moonshot: {
    label: 'Moonshot',
    cn: '月之暗面',
    icon: 'icon-Kim',
    urlWrite: false,
    secretRequired: true,
    customHeader: false,
    modelDocumentUrl: 'https://platform.moonshot.cn/console/api-keys',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
  },
  AzureOpenAI: {
    label: 'AzureOpenAI',
    cn: 'Azure OpenAI',
    icon: 'icon-azure',
    urlWrite: true,
    secretRequired: true,
    customHeader: false,
    modelDocumentUrl: 'https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/OpenAI',
    defaultBaseUrl: 'https://<resource_name>.openai.azure.com',
  },
  Other: {
    label: 'Other',
    cn: '其他',
    icon: 'icon-a-AIshezhi',
    urlWrite: true,
    secretRequired: true,
    customHeader: false,
    modelDocumentUrl: '',
    defaultBaseUrl: '',
  }
}

export const MAC_SYMBOLS = {
  ctrl: "⌘",
  alt: "⌥",
  shift: "⇧",
}