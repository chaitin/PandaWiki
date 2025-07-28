(function () {
  'use strict';

  // 获取当前脚本的域名
  const currentScript = document.currentScript || document.querySelector('script[src*="widget-bot.js"]');
  const widgetDomain = currentScript ? new URL(currentScript.src).origin : window.location.origin;

  let widgetInfo = null;
  let widgetButton = null;
  let widgetModal = null;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let currentTheme = 'light'; // 默认浅色主题

  // 应用主题
  function applyTheme(theme_mode) {
    currentTheme = theme_mode === 'dark' ? 'dark' : 'light';
    updateThemeClasses();
  }

  // 更新主题类名
  function updateThemeClasses() {
    if (widgetButton) {
      widgetButton.setAttribute('data-theme', currentTheme);
    }
    if (widgetModal) {
      widgetModal.setAttribute('data-theme', currentTheme);
    }
  }

  // 获取挂件信息
  async function fetchWidgetInfo() {
    if (widgetButton) {
      widgetButton.classList.add('loading');
    }

    try {
      const response = await fetch(`${widgetDomain}/client/v1/app/widget/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      widgetInfo = data.data.settings?.widget_bot_settings;

      // 验证返回的数据结构
      if (!widgetInfo || typeof widgetInfo !== 'object') {
        throw new Error('Invalid widget info response');
      }

      // 应用主题模式
      if (widgetInfo.theme_mode) {
        applyTheme(widgetInfo.theme_mode);
      }

      createWidget();
    } catch (error) {
      console.error('获取挂件信息失败:', error);
      // 使用默认值
      widgetInfo = {
        btn_text: '在线客服',
        btn_logo: '',
        theme_mode: 'light'
      };
      applyTheme(widgetInfo.theme_mode);
      createWidget();
    } finally {
      if (widgetButton) {
        widgetButton.classList.remove('loading');
      }
    }
  }

  // 创建垂直文字
  function createVerticalText(text) {
    return text.split('').map((char, index) =>
      `<span style="animation-delay: ${0.1 + index * 0.05}s">${char}</span>`
    ).join('');
  }

  // 创建挂件按钮
  function createWidget() {
    // 如果已存在，先删除
    if (widgetButton) {
      widgetButton.remove();
    }

    // 创建按钮容器
    widgetButton = document.createElement('div');
    widgetButton.className = 'widget-bot-button';
    widgetButton.setAttribute('role', 'button');
    widgetButton.setAttribute('tabindex', '0');
    widgetButton.setAttribute('aria-label', `打开${widgetInfo.btn_text}窗口`);
    widgetButton.setAttribute('data-theme', currentTheme);

    const buttonContent = document.createElement('div');
    buttonContent.className = 'widget-bot-button-content';

    // 添加logo（如果有）
    if (widgetInfo.btn_logo) {
      const logo = document.createElement('img');
      logo.src = widgetDomain + widgetInfo.btn_logo;
      logo.alt = 'logo';
      logo.className = 'widget-bot-logo';
      logo.onerror = () => {
        logo.style.display = 'none';
      };
      buttonContent.appendChild(logo);
    }

    // 添加文字
    const textDiv = document.createElement('div');
    textDiv.className = 'widget-bot-text';
    textDiv.innerHTML = createVerticalText(widgetInfo.btn_text || '在线客服');
    buttonContent.appendChild(textDiv);

    widgetButton.appendChild(buttonContent);

    // 添加事件监听器
    widgetButton.addEventListener('click', showModal);
    widgetButton.addEventListener('mousedown', startDrag);
    widgetButton.addEventListener('keydown', handleKeyDown);

    // 添加触摸事件支持
    widgetButton.addEventListener('touchstart', handleTouchStart, { passive: false });
    widgetButton.addEventListener('touchmove', handleTouchMove, { passive: false });
    widgetButton.addEventListener('touchend', handleTouchEnd);

    document.body.appendChild(widgetButton);

    // 创建模态框
    createModal();

    // 触发显示动画
    setTimeout(() => {
      widgetButton.style.opacity = '1';
      widgetButton.style.transform = 'translateY(0)';
    }, 100);
  }

  // 键盘事件处理
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showModal();
    }
  }

  // 触摸事件处理
  let touchStartPos = { x: 0, y: 0 };

  function handleTouchStart(e) {
    const touch = e.touches[0];
    touchStartPos = { x: touch.clientX, y: touch.clientY };
    startDrag(e);
  }

  function handleTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault()
    const touch = e.touches[0];
    drag({ clientX: touch.clientX, clientY: touch.clientY });
  }

  function handleTouchEnd(e) {
    const touch = e.changedTouches[0];
    const distance = Math.sqrt(
      Math.pow(touch.clientX - touchStartPos.x, 2) +
      Math.pow(touch.clientY - touchStartPos.y, 2)
    );

    if (distance < 10) {
      // 判断为点击事件
      setTimeout(() => showModal(), 100);
    }

    stopDrag();
  }

  // 创建模态框
  function createModal() {
    // 如果已存在，先删除
    if (widgetModal) {
      widgetModal.remove();
    }

    widgetModal = document.createElement('div');
    widgetModal.className = 'widget-bot-modal';
    widgetModal.setAttribute('role', 'dialog');
    widgetModal.setAttribute('aria-modal', 'true');
    widgetModal.setAttribute('aria-labelledby', 'widget-modal-title');
    widgetModal.setAttribute('data-theme', currentTheme);

    const modalContent = document.createElement('div');
    modalContent.className = 'widget-bot-modal-content';

    // 创建关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'widget-bot-close-btn';
    closeBtn.innerHTML = '<svg t="1752218667372" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4632" id="mx_n_1752218667373" width="32" height="32"><path d="M512 939.19762963a427.19762963 427.19762963 0 1 1 0-854.39525926 427.19762963 427.19762963 0 0 1 0 854.39525926z m0-482.08605274L396.47540505 341.53519999a19.41807408 19.41807408 0 0 0-27.44421216 0l-27.44421097 27.44421217a19.41807408 19.41807408 0 0 0 0 27.44421095L457.00801422 512l-115.47281423 115.52459495a19.41807408 19.41807408 0 0 0 0 27.44421216l27.44421217 27.44421097a19.41807408 19.41807408 0 0 0 27.44421095 0L512 566.99198578l115.52459495 115.47281423a19.41807408 19.41807408 0 0 0 27.44421216 0l27.44421097-27.44421217a19.41807408 19.41807408 0 0 0 0-27.44421095l-115.47281424-115.47281423 115.47281424-115.57637689a19.41807408 19.41807408 0 0 0 0-27.44421095l-27.44421097-27.44421096a19.41807408 19.41807408 0 0 0-27.44421216 0L512 457.00801422z" p-id="4633" fill="#ffffff"></path></svg>'
    closeBtn.setAttribute('aria-label', '关闭窗口');
    closeBtn.setAttribute('type', 'button');
    closeBtn.addEventListener('click', hideModal);

    // 创建iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'widget-bot-iframe';
    iframe.src = `${widgetDomain}/widget`;
    iframe.setAttribute('title', `${widgetInfo.btn_text}服务窗口`);
    iframe.setAttribute('allow', 'camera; microphone; geolocation');
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-presentation');

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(iframe);
    widgetModal.appendChild(modalContent);

    document.body.appendChild(widgetModal);
  }

  // 显示模态框
  function showModal() {
    if (!widgetModal) return;

    widgetModal.style.display = 'flex';
    document.body.classList.add('widget-bot-modal-open');

    // 计算模态框位置
    requestAnimationFrame(() => {
      const buttonRect = widgetButton.getBoundingClientRect();
      const modalContent = widgetModal.querySelector('.widget-bot-modal-content');

      if (modalContent) {
        // 设置模态框位置：距离按钮16px，距离底部24px
        const modalBottom = 24;
        const modalRight = Math.max(16, window.innerWidth - buttonRect.left + 16);

        modalContent.style.bottom = modalBottom + 'px';
        modalContent.style.right = modalRight + 'px';

        // 确保模态框不会超出屏幕
        const modalRect = modalContent.getBoundingClientRect();
        if (modalRect.left < 16) {
          modalContent.style.right = '16px';
          modalContent.style.left = '16px';
        }
      }
    });

    // 添加ESC键关闭功能
    document.addEventListener('keydown', handleEscKey);
  }

  // ESC键处理
  function handleEscKey(e) {
    if (e.key === 'Escape') {
      hideModal();
    }
  }

  // 隐藏模态框
  function hideModal() {
    if (!widgetModal) return;

    widgetModal.style.display = 'none';
    document.body.classList.remove('widget-bot-modal-open');

    // 恢复焦点到按钮
    if (widgetButton) {
      widgetButton.focus();
    }

    // 移除ESC键监听
    document.removeEventListener('keydown', handleEscKey);
  }

  // 开始拖拽
  function startDrag(e) {
    if (e.preventDefault) {
      e.preventDefault()
    };

    isDragging = true;

    const rect = widgetButton.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    dragOffset.x = clientX - rect.left;
    dragOffset.y = clientY - rect.top;

    // 清除bottom定位，使用top定位
    widgetButton.style.bottom = 'auto';
    widgetButton.style.top = rect.top + 'px';
    widgetButton.style.position = 'fixed';

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);

    widgetButton.classList.add('dragging');
    widgetButton.style.zIndex = '10001';
  }

  // 拖拽中
  function drag(e) {
    if (!isDragging) return;

    if (e.preventDefault) {
      e.preventDefault()
    };

    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const newTop = clientY - dragOffset.y;
    const maxTop = window.innerHeight - widgetButton.offsetHeight;

    // 限制在屏幕范围内
    const constrainedTop = Math.max(0, Math.min(newTop, maxTop));

    widgetButton.style.top = constrainedTop + 'px';
  }

  // 停止拖拽
  function stopDrag() {
    if (!isDragging) return;

    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);

    widgetButton.classList.remove('dragging');
    widgetButton.style.zIndex = '9999';

    // 吸附到右侧，恢复bottom定位
    requestAnimationFrame(() => {
      const currentTop = parseInt(widgetButton.style.top);
      const windowHeight = window.innerHeight;
      const buttonHeight = widgetButton.offsetHeight;

      // 计算距离底部的位置
      const bottomPosition = windowHeight - currentTop - buttonHeight;

      // 恢复right和bottom定位，清除top
      widgetButton.style.right = '0';
      widgetButton.style.bottom = Math.max(20, bottomPosition) + 'px';
      widgetButton.style.top = 'auto';
      widgetButton.style.left = 'auto';
    });
  }

  // 设置按钮状态
  function setButtonState(state) {
    if (!widgetButton) return;

    widgetButton.classList.remove('success', 'error', 'loading');

    if (state === 'success') {
      widgetButton.classList.add('success');
    } else if (state === 'error') {
      widgetButton.classList.add('error');
    } else if (state === 'loading') {
      widgetButton.classList.add('loading');
    }
  }

  // 更新主题模式
  function updateThemeMode(theme_mode) {
    if (theme_mode === 'light' || theme_mode === 'dark') {
      applyTheme(theme_mode);
    }
  }

  // 全局函数
  window.hideWidgetModal = hideModal;
  window.setWidgetButtonState = setButtonState;
  window.updateWidgetTheme = updateThemeMode;

  // 点击模态框背景关闭
  document.addEventListener('click', function (e) {
    if (e.target === widgetModal) {
      hideModal();
    }
  });

  // 窗口大小改变时重新定位
  window.addEventListener('resize', function () {
    if (widgetModal && widgetModal.style.display === 'flex') {
      // 重新计算模态框位置
      setTimeout(() => {
        const buttonRect = widgetButton.getBoundingClientRect();
        const modalContent = widgetModal.querySelector('.widget-bot-modal-content');

        if (modalContent) {
          const modalBottom = 24;
          const modalRight = Math.max(16, window.innerWidth - buttonRect.left + 16);

          modalContent.style.bottom = modalBottom + 'px';
          modalContent.style.right = modalRight + 'px';
        }
      }, 100);
    }
  });

  // 初始化
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fetchWidgetInfo);
    } else {
      fetchWidgetInfo();
    }
  }

  // 页面卸载时清理
  window.addEventListener('beforeunload', function () {
    if (widgetButton) {
      widgetButton.remove();
    }
    if (widgetModal) {
      widgetModal.remove();
    }
  });

  // 启动
  init();
})();
