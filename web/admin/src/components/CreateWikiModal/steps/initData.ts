import { ConstsHomePageSetting } from '@/request/types';

export const INIT_DOC_DATA = [
  {
    type: 2,
    emoji: '🔥',
    name: '快速上手 - 新手必读 ！！！',
    summary:
      '本文档介绍了PandaWiki的快速上手指南，包括安装步骤（需Docker 20.x以上Linux系统）、登录方法、创建知识库、配置AI大模型（推荐使用百智云模型广场）以及访问Wiki网站的流程。文档提供了详细的操作命令和图示，并附有相关参考链接和问题交流群二维码。',
    content:
      '<blockquote><p>在使用之前，如果你还不了解 PandaWiki，请参考 <a target="_blank" type="icon" href="https://pandawiki.docs.baizhi.cloud/node/0197160c-782c-74ad-a4b7-857dae148f84" rel="noopener noreferrer nofollow" title="PandaWiki 介绍">PandaWiki 介绍</a></p></blockquote><p><strong>PandaWiki</strong> 是一款 AI 大模型驱动的开源知识库搭建系统，帮助你快速构建智能化的 <strong>产品文档、技术文档、FAQ</strong>、<strong>博客系统</strong>，借助大模型的力量为你提供<strong> AI 创作</strong>、<strong>AI 问答</strong>、<strong>AI 搜索</strong>等能力。</p><h1 id="t3bkykqa7i15ermosk3pkm">安装 PandaWiki</h1><p>你需要一台支持 Docker 20.x 以上版本的 Linux 系统来安装 PandaWiki。</p><p>使用 root 权限登录你的服务器，然后执行以下命令。</p><pre><code>bash -c "$(curl -fsSLk https://release.baizhi.cloud/panda-wiki/manager.sh)"</code></pre><p>根据命令提示的选项进行安装，命令执行过程将会持续几分钟，请耐心等待。</p><blockquote><p>关于安装与部署的更多细节请参考 <a target="_blank" type="icon" href="https://pandawiki.docs.baizhi.cloud/node/01971602-bb4e-7c90-99df-6d3c38cfd6d5" rel="noopener noreferrer nofollow" title="安装 PandaWiki">安装 PandaWiki</a></p></blockquote><h1 id="nmtq9yinktbfud30e56h1c">登录 PandaWiki</h1><p>在上一步中，安装命令执行结束后，你的终端会输出以下内容。</p><pre><code>SUCCESS  控制台信息:\nSUCCESS    访问地址(内网): http://*.*.*.*:2443\nSUCCESS    访问地址(外网): http://*.*.*.*:2443\nSUCCESS    用户名: admin\nSUCCESS    密码: **********************</code></pre><p>使用浏览器打开上述内容中的 “<strong>访问地址</strong>”，你将看到 <strong>PandaWiki</strong> 的控制台登录入口。</p><p>使用上述内容中的 “<strong>用户名</strong>” 和 “<strong>密码</strong>” 登录即可。</p><p><img src="/images/init/doc_login.png" width="683" height="387"></p><h1 id="6gyg8pye5wkbz329v5d7xn">配置大模型</h1><blockquote><p><strong>PandaWiki</strong> 是由 AI 大模型驱动的 Wiki 系统，在未配置大模型的情况下将无法正常使用。</p></blockquote><p>首次登录时会提示需要先配置 AI 模型，根据下方图片配置 “Chat 模型” 即可使用。</p><p><img src="/images/init/doc_model.png" width="694" height="393"></p><p>推荐使用 <a target="_self" type="icon" href="https://pandawiki.docs.baizhi.cloud/node/01973ffe-e1bc-7165-9a71-e7aa461c05ea" rel="noopener noreferrer nofollow" title="百智云模型广场">百智云模型广场</a> 快速接入 AI 模型，注册即可获赠 5 元的模型使用额度。</p><blockquote><p>关于大模型的更多配置细节请参考 <a target="_blank" type="icon" href="https://pandawiki.docs.baizhi.cloud/node/01971616-811c-70e1-82d9-706a202b8498" rel="noopener noreferrer nofollow" title="接入 AI 模型">接入 AI 模型</a>。</p></blockquote><h1 id="7o2if212zap0ixppxz9wwq">创建知识库</h1><p>一切配置就绪后，你需要先创建一个 “<strong>知识库”</strong>。</p><p>“<strong>知识库</strong>” 是一组文档的集合，<strong>PandaWiki</strong> 将会根据知识库中的文档，为不同的知识库分别创建 “<strong>Wiki 网站</strong>”。</p><p><img src="/images/init/doc_create_wiki.png" width="696" height="394"></p><h1 id="9xsrc8rkv7snqtipwlny9n">完成！访问 Wiki 网站</h1><p>如果你顺利完成了以上步骤，那么恭喜你，属于你的 <strong>PandaWiki</strong> 搭建成功，你可以：</p><ul class="bullet-list" data-type="bulletList"><li><p>访问 <strong>控制台</strong> 来管理你的知识库内容</p></li><li><p>访问 <strong>Wiki 网站</strong> 让你的用户使用知识库</p></li></ul><p>如有疑问，欢迎微信扫码下方二维码，加入 <strong>百智云 AI 交流群</strong> 与更多 <strong>PandaWiki</strong> 的使用者进行讨论。</p><p><img src="/images/init/doc_weixin_qrcode.png" width="232" height="232"></p><p></p>',
  },
  {
    type: 2,
    emoji: '🎚️',
    name: '演示 Demo',
    summary:
      '提供PandaWiki演示环境访问地址和控制台链接，包含管理员账号密码，数据每10分钟自动重置。',
    content:
      '<h2 id="idbynal5t33zfembxxoccq">请使用以下地址访问 PandaWiki 演示 Demo 环境</h2><p></p><p>控制台：<a target="_blank" type="icon" href="https://47.96.9.75:2443" rel="noopener noreferrer nofollow" title="https://47.96.9.75:2443">https://47.96.9.75:2443</a></p><p>Wiki 网站：<a target="_blank" type="icon" href="http://47.96.9.75/" rel="noopener noreferrer nofollow" title="http://47.96.9.75/">http://47.96.9.75/</a></p><p>账号：admin</p><p>密码：Gg2sD2IU98WRAOcY97LwhCTXAqTYuBn7</p><p></p><blockquote><p>说明：演示 Demo 已设置为只读模式，后台仅能访问，无法修改</p></blockquote><p></p>',
  },
  {
    type: 2,
    emoji: '📡',
    name: '接入 AI 模型',

    summary:
      'PandaWiki是基于AI大模型的Wiki系统，需接入智能对话、向量和重排序模型才能使用AI功能。推荐使用deepseek-chat作为对话模型，bge-m3作为向量模型，bge-reranker-v2-m3作为重排序模型。系统默认已内置向量和重排序模型，用户首次登录只需配置Chat模型即可开始使用，支持对接百智云、DeepSeek、OpenAI等平台的大模型API。',
    content:
      '<div data-id="alert_6tbj9528me" data-variant="warning" data-type="icon" data-node="alert"><p><strong>PandaWiki</strong> 是由 AI 大模型驱动的 Wiki 系统，在使用之前请先接入 AI 大模型，在未配置大模型的情况下 <strong>AI 创作</strong>、<strong>AI 问答</strong>、<strong>AI 搜索 </strong>等功能无法正常使用。</p></div><h2 id="r86nlk0nilpkew3kmbx2w1">PandaWiki 需要接入什么样的模型</h2><ul class="bullet-list" data-type="bulletList"><li><p><strong>智能对话模型（</strong>必须配置<strong>）</strong>：<span style="color: rgb(254, 161, 69);">推荐使用 "deepseek-chat"</span>，该模型将会在 PandaWiki 智能问答和摘要生成过程中使用。该配置直接决定了 PandaWiki 的智能问答效果，<span style="color: rgb(246, 78, 84);">非常不推荐使用参数量小于 100b 的模型</span>。</p></li><li><p><strong>向量模型（</strong>必须配置<strong>）</strong>：又称为 “嵌入模型”，<span style="color: rgb(254, 161, 69);">推荐使用 "bge-m3"</span>，默认安装时已内置了该模型。该模型可以<span style="color: rgba(0, 0, 0, 0.85); font-size: 16px;">将文档转化为向量，为 PandaWiki 提供了智能搜索和内容关联的能力</span>，该模型将会在 PandaWiki 内容发布、智能问答、智能搜索过程中使用。</p></li><li><p><strong>重排序模型（</strong>必须配置<strong>）</strong>：<span style="color: rgb(254, 161, 69);">推荐使用 "bge-reranker-v2-m3"</span>，默认安装时已内置了该模型。该模型通过对初始结果进行二次排序，实现 “快速召回 + 精准排序”，是提升检索系统质量的关键技术，该模型将会在 PandaWiki 智能问答、智能搜索过程中使用。</p></li><li><p><strong>文档分析模型（</strong>可选配置<strong>）</strong>：<span style="color: rgb(254, 161, 69);">推荐使用 qwen2.5- 3b 等<strong>小模型</strong></span>，在 AI 伴写、内容发布、智能问答过程中使用， 启用后文档编辑和智能问答的效果会得到加强，可选配置。</p></li><li><p><strong>图像分析模型（</strong>可选配置<strong>）</strong>：<span style="color: rgb(254, 161, 69);">推荐使用 qwen-vl-max-latest 等<strong>视觉模型</strong></span>，在内容发布、智能问答过程中使用， 启用后智能问答的效果会得到加强，可选配置。</p></li></ul><blockquote><p><span data-name="gift" data-type="emoji">🎁</span> <strong>PandaWiki</strong> 支持快速接入<a target="_self" type="icon" href="https://pandawiki.docs.baizhi.cloud/node/01973ffe-e1bc-7165-9a71-e7aa461c05ea" rel="noopener noreferrer nofollow" title="百智云在线模型">百智云在线模型</a>，新注册的用户可直接获得 5 元的使用额度，推荐新手使用。</p></blockquote><h2 id="zu6wzktl1ixzsi1xahulf0">初始化配置</h2><p>你只需要在首次登录时配置 Chat 模型即可开始使用。</p><p>PandaWiki 在初始化时已经内置了百智云模型广场的 Embedding 和 Reranker 模型，如果没有特殊需求，无需更改。</p><blockquote><p>PandaWiki 内置 Embedding 和 Reranker 模型的 API Token 为：</p><pre><code>sk-r8tmBtcU1JotPDPnlgZLOY4Z6Dbb7FufcSeTkFpRWA5v4Llr</code></pre></blockquote><h2 id="ycv3d212hip80x3a487urd">PandaWiki 对大模型 Token 的消耗量如何</h2><p>Embedding 和 Reranker 的价格很便宜，在 PandaWiki 的使用场景下，这两个模型的成本可以忽略不计。<br>因此，PandaWiki 对于 AI 大模型的主要使用成本在于 Chat 模型的输入部分。通常情况下，一次对话会消耗 1000 ~ 10000 个输入 Token。</p><p>假设某个模型每百万 Token 售价 1 元，那么每次对话的成本就在 1 分钱之内。</p><h2 id="kr859dp3jlnjwtiv38k7cd">PandaWiki 支持对接哪些平台的大模型 API</h2><p>目前 <strong>PandaWiki</strong> 支持接入的大模型供应商如下：</p><ul class="bullet-list" data-type="bulletList"><li><p><strong>百智云模型广场（推荐）</strong>：参考文档 <a target="_blank" type="icon" href="https://modelsquare.docs.baizhi.cloud/" rel="noopener noreferrer nofollow" title="百智云模型广场">百智云模型广场</a></p></li><li><p><strong>DeepSeek</strong>：参考文档 <a target="_blank" type="icon" href="https://platform.deepseek.com/" rel="noopener noreferrer nofollow" title="DeepSeek">DeepSeek</a></p></li><li><p><strong>OpenAI</strong>：ChatGPT 所使用的大模型，参考文档 <a target="_blank" type="icon" href="https://platform.openai.com/" rel="noopener noreferrer nofollow" title="OpenAI">OpenAI</a></p></li><li><p><strong>Ollama</strong>：Ollama 通常是本地部署的大模型，参考文档 <a target="_blank" type="icon" href="https://github.com/ollama/ollama/tree/main/docs" rel="noopener noreferrer nofollow" title="Ollama">Ollama</a></p></li><li><p><strong>硅基流动</strong>：参考文档 <a target="_blank" type="icon" href="https://docs.siliconflow.cn/" rel="noopener noreferrer nofollow" title="SiliconFlow">SiliconFlow</a></p></li><li><p><strong>月之暗面</strong>：Kimi 所使用的模型，参考文档 <a target="_blank" type="icon" href="https://platform.moonshot.cn/" rel="noopener noreferrer nofollow" title="Moonshot">Moonshot</a></p></li><li><p><strong>302.AI</strong>：参考文档&nbsp;<a target="_blank" type="icon" href="https://share.302.ai/8xeHHa" title="302.AI">302.AI</a></p></li><li><p><strong>其他</strong>：其他兼容 OpenAI 模型接口的 API</p></li></ul><p>如有其他大模型的兼容需求，可在 <a target="_blank" type="icon" href="https://baizhi.cloud/discussion/" rel="noopener noreferrer nofollow" title="百智云论坛">百智云论坛</a> 发帖提需求。</p><p></p><h2 id="cc951tk6zeqywhm96uuzi7">PandaWiki 支持接入哪些 embedding 模型</h2><p>PandaWiki 目前支持接入以下 embedding 模型</p><ul class="bullet-list" data-type="bulletList"><li><p>bge-m3</p></li><li><p><span style="color: rgb(0, 0, 0); font-family: ui-sans-serif, system-ui, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;; font-size: medium;">Qwen3-Embedding-0.6B</span></p></li><li><p><span style="color: rgb(0, 0, 0); font-family: ui-sans-serif, system-ui, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;; font-size: medium;">Qwen3-Embedding-4B</span></p></li></ul><ul class="bullet-list" data-type="bulletList"><li><p><span style="color: rgb(0, 0, 0); font-family: ui-sans-serif, system-ui, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;; font-size: medium;">Qwen3-Embedding-8B</span></p></li></ul><h2 id="iqgz3aibpvta3xscurfajb"></h2><h2 id="iqgz3aibpvta3xscurfajb">PandaWiki 支持接入哪些 reranker 模型</h2><ul class="bullet-list" data-type="bulletList"><li><p>bge-reranker-v2-m3</p></li></ul><p></p>',
  },
] as const;

export const INIT_LADING_DATA = {
  title: 'PandaWiki',
  theme_mode: 'light',
  home_page_setting:
    ConstsHomePageSetting.HomePageSettingCustom as ConstsHomePageSetting,
  icon: '/images/init/icon.png',
  btns: [],
  web_app_custom_style: {
    allow_theme_switching: false,
    header_search_placeholder: '问问AI吧',
    show_brand_info: true,
    footer_show_intro: true,
    social_media_accounts: [
      {
        channel: 'wechat_oa',
        text: '微信交流群',
        link: '',
        icon: '/images/init/weixin_qrcode.png',
        phone: '',
      },
    ],
  },
  footer_settings: {
    footer_style: 'complex',
    corp_name: '',
    icp: '',
    brand_name: 'PandaWiki 知识库',
    brand_desc:
      'PandaWiki 是一款 AI 驱动的开源知识库系统，支持构建产品文档、技术文档、FAQ 和博客，提供AI创作、问答和搜索功能',
    brand_logo: '/images/init/brand_logo.png',
    brand_groups: [
      {
        name: '相关产品',
        links: [
          {
            name: 'PandaWiki',
            url: 'https://baizhi.cloud/landing/pandawiki',
          },
          {
            name: 'MonkeyCode',
            url: 'https://baizhi.cloud/landing/monkeycode',
          },
          {
            name: 'KoalaQA',
            url: 'https://baizhi.cloud/landing/koaloa',
          },
        ],
      },
      {
        name: '长亭科技',
        links: [
          {
            name: '长亭科技官网',
            url: 'https://chaitin.cn/',
          },
          {
            name: '长亭百智云',
            url: 'https://baizhi.cloud/',
          },
          {
            name: '长亭百川云',
            url: 'https://rivers.chaitin.cn/',
          },
        ],
      },
      {
        name: '其他',
        links: [
          {
            name: '关于我们',
            url: 'https://chaitin.cn/',
          },
          {
            name: '开源协议',
            url: 'https://github.com/chaitin/PandaWiki?tab=AGPL-3.0-1-ov-file#readme',
          },
        ],
      },
    ],
  },
  web_app_landing_configs: [
    {
      type: 'banner',
      banner_config: {
        title: '欢迎使用 PandaWiki AI 知识库',
        title_color: '#6E73FE',
        title_font_size: 60,
        subtitle:
          'PandaWiki 是一款 AI 驱动的开源知识库搭建系统，帮助你快速构建智能化产品文档、技术文档、FAQ、博客系统，借助大模型的力量为你提供 AI 创作、AI 问答、AI 搜索等能力。',
        placeholder: '有问题？问问 AI',
        subtitle_color: '#ffffff80',
        subtitle_font_size: 16,
        bg_url: '',
        hot_search: [
          '如何安装PandaWiki',
          'PandaWiki能做什么？',
          '忘了admin的密码如何重置？',
        ],
        btns: [
          {
            id: '1760701149843',
            text: '查看文档',
            type: 'contained',
            href: '',
          },
          {
            id: '1760701163769',
            text: '社区论坛',
            type: 'outlined',
            href: 'https://pandawiki.qa.baizhi.cloud',
          },
        ],
      },

      node_ids: [],
      nodes: null,
    },
    {
      type: 'basic_doc',
      basic_doc_config: {
        title: '极速入门',
        title_color: '#000000',
        bg_color: '#ffffff00',
      },
      node_ids: [],
    },
    {
      type: 'carousel',
      carousel_config: {
        title: '产品介绍',
        bg_color: '#3248F2',
        list: [
          {
            id: '1760701308042',
            title: '数据统计',
            url: '/images/init/carousel_data_statistics.jpg',
            desc: '',
          },
          {
            id: '1760701285851',
            title: '文档管理',
            url: '/images/init/carousel_doc_manage.jpg',
            desc: '',
          },
          {
            id: '1760701343411',
            title: '文档首页',
            url: '/images/init/carousel_doc_home.jpg',
            desc: '',
          },
          {
            id: '1760701321421',
            title: '智能问答',
            url: '/images/init/carousel_ai_qa.jpg',
            desc: '',
          },
          {
            id: '1760701346392',
            title: '三方机器人集成',
            url: '/images/init/carousel_third_party_robot.jpg',
            desc: '',
          },
          {
            id: '1760701385679',
            title: '网页挂件机器人',
            url: '/images/init/carousel_web_robot.jpg',
            desc: '',
          },
        ],
      },
      node_ids: [],
      nodes: null,
    },
    {
      type: 'faq',
      faq_config: {
        title: '常见问题',
        title_color: '#000000',
        bg_color: '#ffffff00',
        list: [
          {
            id: '1760701530938',
            question: '回答出错 failed to format messages',
            link: 'https://pandawiki.qa.baizhi.cloud/discuss/LqX2h8EfdqaGjbYW',
          },
          {
            id: '1760701557320',
            question: '安装失败',
            link: 'https://pandawiki.qa.baizhi.cloud',
          },
        ],
      },
      node_ids: [],
      nodes: null,
    },
  ],
};
