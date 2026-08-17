(function () {
  'use strict';

  const defaultModalPosition = 'follow';
  const defaultBtnPosition = 'bottom_right';
  const defaultBtnStyle = 'side_sticky';

  // 获取当前脚本的域名
  const currentScript = document.currentScript || document.querySelector('script[src*="widget-bot.js"]');
  const ulrObj = new URL(currentScript.src)
  const widgetDomain = `${ulrObj.origin}${ulrObj.pathname}`.replace('/widget-bot.js', '')

  // API 域名：从 data-api-domain 读取，默认 Java 后端 8080
  const apiDomain = (currentScript.getAttribute('data-api-domain') || 'http://localhost:8080').replace(/\/$/, '')

  // 知识库 ID：从 data-kb-id 读取
  const kbId = currentScript.getAttribute('data-kb-id') || ''

  let widgetInfo = null;
  let widgetButton = null;
  let widgetModal = null;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let currentTheme = 'light'; // 默认浅色主题
  let customTriggerElement = null; // 自定义触发元素
  let customTriggerHandler = null; // 自定义触发元素的事件处理函数
  let dragAnimationFrame = null; // 拖拽动画帧ID
  let buttonSize = { width: 0, height: 0 }; // 缓存按钮尺寸
  let initialPosition = { left: 0, top: 0 }; // 拖拽开始时的初始位置
  let hasDragged = false; // 标记是否发生了拖拽
  let dragStartPos = { x: 0, y: 0 }; // 拖拽开始时的鼠标位置

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
      const response = await fetch(`${apiDomain}/share/v1/app/widget/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-kb-id': kbId,
        },
        credentials: 'omit'
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

      // 根据 btn_style 创建不同的挂件
      const btnStyle = widgetInfo.btn_style || defaultBtnStyle;
      if (btnStyle === 'btn_trigger') {
        createCustomTrigger();
      } else {
        createWidget();
      }
    } catch (error) {
      console.error('获取挂件信息失败:', error);
      // 使用默认值
      widgetInfo = {
        btn_text: '在线客服',
        btn_logo: `''`,
        btn_style: defaultBtnStyle,
        btn_position: defaultBtnPosition,
        modal_position: defaultModalPosition,
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

  // 应用按钮位置
  function applyButtonPosition(button, position) {
    const pos = position || defaultBtnPosition;
    button.style.top = 'auto';
    button.style.right = 'auto';
    button.style.bottom = 'auto';
    button.style.left = 'auto';

    // 两种模式使用相同的默认位置：距离边缘16px，垂直方向190px
    switch (pos) {
      case 'top_left':
        button.style.top = '190px';
        button.style.left = '16px';
        break;
      case 'top_right':
        button.style.top = '190px';
        button.style.right = '16px';
        break;
      case 'bottom_left':
        button.style.bottom = '190px';
        button.style.left = '16px';
        break;
      case 'bottom_right':
      default:
        button.style.bottom = '190px';
        button.style.right = '16px';
        break;
    }
  }

  // 创建侧边吸附按钮
  function createSideStickyButton() {
    widgetButton = document.createElement('div');
    widgetButton.className = 'widget-bot-button widget-bot-side-sticky';
    widgetButton.setAttribute('role', 'button');
    widgetButton.setAttribute('tabindex', '0');
    widgetButton.setAttribute('aria-label', `打开${widgetInfo.btn_text || '在线客服'}窗口`);
    widgetButton.setAttribute('data-theme', currentTheme);

    const buttonContent = document.createElement('div');
    buttonContent.className = 'widget-bot-button-content';

    // 侧边吸附显示图标和文字（btn_logo 以及 btn_text）
    const icon = document.createElement('img');
    const defaultIconSrc = widgetDomain + '/favicon.png';
    icon.src = widgetInfo.btn_logo ? (widgetDomain + widgetInfo.btn_logo) : defaultIconSrc;
    icon.alt = 'icon';
    icon.className = 'widget-bot-icon';
    icon.onerror = () => {
      // 如果当前不是 favicon.png，尝试使用 favicon.png 作为备用
      if (icon.src !== defaultIconSrc) {
        icon.src = defaultIconSrc;
      } else {
        // 如果 favicon.png 也加载失败，隐藏图标
        icon.style.display = 'none';
      }
    };
    buttonContent.appendChild(icon);

    // 添加文字
    const textDiv = document.createElement('div');
    textDiv.className = 'widget-bot-text';
    textDiv.textContent = widgetInfo.btn_text || '在线客服';
    // 设置固定宽度、自动换行和居中
    textDiv.style.wordWrap = 'break-word';
    textDiv.style.whiteSpace = 'normal';
    textDiv.style.textAlign = 'center';
    buttonContent.appendChild(textDiv);

    widgetButton.appendChild(buttonContent);

    // 应用位置 - 距离边缘16px，垂直方向190px
    const position = widgetInfo.btn_position || defaultBtnPosition;
    applyButtonPosition(widgetButton, position);

    // 设置 border-radius 为 24px（统一圆角）
    widgetButton.style.borderRadius = '24px';

    // 添加事件监听器
    widgetButton.addEventListener('click', handleButtonClick);
    widgetButton.addEventListener('mousedown', startDrag);
    widgetButton.addEventListener('keydown', handleKeyDown);

    // 添加触摸事件支持
    widgetButton.addEventListener('touchstart', handleTouchStart, { passive: false });
    widgetButton.addEventListener('touchmove', handleTouchMove, { passive: false });
    widgetButton.addEventListener('touchend', handleTouchEnd);

    document.body.appendChild(widgetButton);
  }

  // 创建悬浮球按钮
  function createHoverBallButton() {
    widgetButton = document.createElement('div');
    widgetButton.className = 'widget-bot-button widget-bot-hover-ball';
    widgetButton.setAttribute('role', 'button');
    widgetButton.setAttribute('tabindex', '0');
    widgetButton.setAttribute('aria-label', `打开${widgetInfo.btn_text || '在线客服'}窗口`);
    widgetButton.setAttribute('data-theme', currentTheme);

    const buttonContent = document.createElement('div');
    buttonContent.className = 'widget-bot-button-content';

    // 悬浮球只显示图标（btn_logo）
    const icon = document.createElement('img');
    const defaultIconSrc = widgetDomain + '/favicon.png';
    icon.src = widgetInfo.btn_logo ? (widgetDomain + widgetInfo.btn_logo) : defaultIconSrc;
    icon.alt = 'icon';
    icon.className = 'widget-bot-icon widget-bot-hover-ball-icon';
    icon.onerror = () => {
      // 如果当前不是 favicon.png，尝试使用 favicon.png 作为备用
      if (icon.src !== defaultIconSrc) {
        icon.src = defaultIconSrc;
      } else {
        // 如果 favicon.png 也加载失败，隐藏图标
        icon.style.display = 'none';
      }
    };
    buttonContent.appendChild(icon);

    widgetButton.appendChild(buttonContent);

    // 应用位置 - 距离边缘16px，垂直方向190px
    applyButtonPosition(widgetButton, widgetInfo.btn_position || defaultBtnPosition);

    // 添加事件监听器
    widgetButton.addEventListener('click', handleButtonClick);
    widgetButton.addEventListener('mousedown', startDrag);
    widgetButton.addEventListener('keydown', handleKeyDown);

    // 添加触摸事件支持
    widgetButton.addEventListener('touchstart', handleTouchStart, { passive: false });
    widgetButton.addEventListener('touchmove', handleTouchMove, { passive: false });
    widgetButton.addEventListener('touchend', handleTouchEnd);

    document.body.appendChild(widgetButton);
  }

  // 创建挂件按钮
  function createWidget() {
    // 如果已存在，先删除
    if (widgetButton) {
      widgetButton.remove();
    }

    const btnStyle = widgetInfo.btn_style || defaultBtnStyle;

    if (btnStyle === 'hover_ball') {
      createHoverBallButton();
    } else {
      createSideStickyButton();
    }

    // 创建模态框
    createModal();

    // 触发显示动画
    setTimeout(() => {
      widgetButton.style.opacity = '1';
    }, 100);
  }

  // 创建自定义触发按钮
  function createCustomTrigger() {
    const btnId = widgetInfo.btn_id;
    if (!btnId) {
      console.error('btn_trigger 模式需要提供 btn_id');
      return;
    }

    let retryCount = 0;
    const maxRetries = 50; // 最多重试 50 次（5秒）

    // 绑定事件到元素
    function attachTrigger(element) {
      if (!element) return;

      // 避免重复绑定
      if (element.hasAttribute('data-widget-trigger-attached')) {
        return;
      }

      element.setAttribute('data-widget-trigger-attached', 'true');
      customTriggerElement = element;

      // 创建事件处理函数并保存引用
      customTriggerHandler = function (e) {
        e.preventDefault();
        e.stopPropagation();
        showModal();
      };

      // 绑定点击事件
      element.addEventListener('click', customTriggerHandler);
    }

    // 尝试查找并绑定元素
    function tryAttachTrigger() {
      const element = document.getElementById(btnId);
      if (element) {
        attachTrigger(element);
        createModal();
        return true;
      }
      return false;
    }

    // 立即尝试一次
    if (tryAttachTrigger()) {
      return;
    }

    // 如果元素还没加载，使用多种方式监听
    function retryAttach() {
      if (tryAttachTrigger()) {
        return;
      }

      retryCount++;
      if (retryCount < maxRetries) {
        setTimeout(retryAttach, 100);
      } else {
        console.warn('自定义触发按钮未找到，已停止重试:', btnId);
      }
    }

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver(function (mutations) {
      if (tryAttachTrigger()) {
        observer.disconnect();
      }
    });

    // 开始观察 DOM 变化
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 如果 DOM 已加载完成，立即开始重试
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(retryAttach, 100);
      });
    } else {
      setTimeout(retryAttach, 100);
    }

    // 延迟断开观察器（避免无限观察）
    setTimeout(function () {
      observer.disconnect();
    }, 10000); // 10秒后断开
  }

  // 处理按钮点击事件（区分点击和拖拽）
  function handleButtonClick(e) {
    // 如果发生了拖拽，不打开弹框
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    showModal();
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

    // 只有在没有拖拽且移动距离很小的情况下才认为是点击
    if (!hasDragged && distance < 10) {
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

    const modalPosition = widgetInfo.modal_position || defaultModalPosition;
    if (modalPosition === 'fixed') {
      widgetModal.classList.add('widget-bot-modal-fixed');
    }

    const modalContent = document.createElement('div');
    modalContent.className = 'widget-bot-modal-content';
    if (modalPosition === 'fixed') {
      modalContent.classList.add('widget-bot-modal-content-fixed');
    }

    // 创建关闭按钮（透明框）
    const closeBtn = document.createElement('button');
    closeBtn.className = 'widget-bot-close-btn';
    closeBtn.setAttribute('aria-label', '关闭窗口');
    closeBtn.setAttribute('type', 'button');

    // 创建一个内部元素来处理实际的点击事件（因为按钮设置了 pointer-events: none）
    const closeBtnArea = document.createElement('div');
    closeBtnArea.style.width = '100%';
    closeBtnArea.style.height = '100%';
    closeBtnArea.style.pointerEvents = 'auto'; // 内部元素可以接收事件
    closeBtnArea.style.cursor = 'pointer';
    closeBtnArea.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      hideModal();
    });
    closeBtn.appendChild(closeBtnArea);

    // 创建iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'widget-bot-iframe';
    iframe.src = `${widgetDomain}/widget${kbId ? `?kb_id=${encodeURIComponent(kbId)}` : ''}`;
    iframe.setAttribute('title', `${widgetInfo.btn_text || '在线客服'}服务窗口`);
    iframe.setAttribute('allow', 'camera; microphone; geolocation');
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-presentation');

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(iframe);
    widgetModal.appendChild(modalContent);

    document.body.appendChild(widgetModal);
  }

  // 检测是否为移动端
  function isMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // 智能定位弹框（follow模式）
  function positionModalFollow(modalContent) {
    if (!widgetButton || !modalContent) return;

    // 移动端强制居中显示
    if (isMobile()) {
      modalContent.style.position = 'relative';
      modalContent.style.top = 'auto';
      modalContent.style.left = 'auto';
      modalContent.style.right = 'auto';
      modalContent.style.bottom = 'auto';
      modalContent.style.margin = 'auto';
      modalContent.style.width = 'calc(100% - 32px)';
      modalContent.style.height = 'auto';
      return;
    }

    requestAnimationFrame(() => {
      const buttonRect = widgetButton.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const margin = 16; // 距离屏幕边缘的最小距离
      const buttonGap = 16; // 弹框和按钮之间的最小距离

      // 先设置一个临时位置来获取弹框尺寸
      const originalPosition = modalContent.style.position;
      const originalTop = modalContent.style.top;
      const originalLeft = modalContent.style.left;
      const originalVisibility = modalContent.style.visibility;
      const originalDisplay = modalContent.style.display;

      modalContent.style.position = 'absolute';
      modalContent.style.top = '0';
      modalContent.style.left = '0';
      modalContent.style.visibility = 'hidden';
      modalContent.style.display = 'block';

      const modalRect = modalContent.getBoundingClientRect();
      const modalWidth = modalRect.width;
      const modalHeight = modalRect.height;

      modalContent.style.visibility = originalVisibility || 'visible';
      modalContent.style.display = originalDisplay || 'block';

      // 计算按钮中心点
      const buttonCenterX = buttonRect.left + buttonRect.width / 2;
      const buttonCenterY = buttonRect.top + buttonRect.height / 2;

      // 判断按钮在屏幕的哪一侧
      const isLeftSide = buttonCenterX < windowWidth / 2;
      const isTopSide = buttonCenterY < windowHeight / 2;

      // 智能选择弹框位置，确保完整显示
      let finalTop, finalBottom, finalLeft, finalRight;

      if (isLeftSide) {
        // 按钮在左侧，弹框优先显示在右侧（按钮右侧）
        finalLeft = buttonRect.right + buttonGap;
        finalRight = 'auto';

        // 如果右侧空间不够，显示在左侧（按钮左侧）
        if (finalLeft + modalWidth > windowWidth - margin) {
          finalLeft = 'auto';
          finalRight = windowWidth - buttonRect.left + buttonGap;
          // 如果左侧空间也不够，则贴左边（但保持与按钮的距离）
          if (buttonRect.left - buttonGap - modalWidth < margin) {
            finalLeft = margin;
            finalRight = 'auto';
          }
        }
      } else {
        // 按钮在右侧，弹框优先显示在左侧（按钮左侧）
        finalLeft = 'auto';
        finalRight = windowWidth - buttonRect.left + buttonGap;

        // 如果左侧空间不够，显示在右侧（按钮右侧）
        if (buttonRect.left - buttonGap - modalWidth < margin) {
          finalRight = 'auto';
          finalLeft = buttonRect.right + buttonGap;
          // 如果右侧空间也不够，则贴右边（但保持与按钮的距离）
          if (finalLeft + modalWidth > windowWidth - margin) {
            finalLeft = 'auto';
            finalRight = margin;
          }
        }
      }

      // 垂直方向：优先与按钮顶部对齐
      // 弹框顶部与按钮顶部对齐
      finalTop = buttonRect.top;
      finalBottom = 'auto';

      // 如果弹框底部超出屏幕，则向上调整，确保弹框完整显示在屏幕内
      if (finalTop + modalHeight > windowHeight - margin) {
        // 计算向上调整后的位置
        const adjustedTop = windowHeight - margin - modalHeight;
        // 如果调整后的位置仍然在按钮上方，则使用调整后的位置
        if (adjustedTop >= margin) {
          finalTop = adjustedTop;
        } else {
          // 如果调整后仍然超出，则贴顶部
          finalTop = margin;
        }
      } else if (finalTop < margin) {
        // 如果弹框顶部超出屏幕，则贴顶部
        finalTop = margin;
      }

      // 应用最终位置
      modalContent.style.top = finalTop !== undefined ? (typeof finalTop === 'string' ? finalTop : finalTop + 'px') : 'auto';
      modalContent.style.bottom = finalBottom !== undefined ? (typeof finalBottom === 'string' ? finalBottom : finalBottom + 'px') : 'auto';
      modalContent.style.left = finalLeft !== undefined ? (typeof finalLeft === 'string' ? finalLeft : finalLeft + 'px') : 'auto';
      modalContent.style.right = finalRight !== undefined ? (typeof finalRight === 'string' ? finalRight : finalRight + 'px') : 'auto';

      // 最终检查并修正，确保弹框完全在屏幕内
      requestAnimationFrame(() => {
        const finalModalRect = modalContent.getBoundingClientRect();

        // 修正左边界
        if (finalModalRect.left < margin) {
          modalContent.style.left = margin + 'px';
          modalContent.style.right = 'auto';
        }

        // 修正右边界
        if (finalModalRect.right > windowWidth - margin) {
          modalContent.style.right = margin + 'px';
          modalContent.style.left = 'auto';
        }

        // 修正上边界
        if (finalModalRect.top < margin) {
          modalContent.style.top = margin + 'px';
          modalContent.style.bottom = 'auto';
        }

        // 修正下边界
        if (finalModalRect.bottom > windowHeight - margin) {
          modalContent.style.bottom = margin + 'px';
          modalContent.style.top = 'auto';
        }
      });
    });
  }

  // 显示模态框
  function showModal() {
    if (!widgetModal) return;

    widgetModal.style.display = 'flex';
    document.body.classList.add('widget-bot-modal-open');

    const modalPosition = widgetInfo.modal_position || defaultModalPosition;
    const modalContent = widgetModal.querySelector('.widget-bot-modal-content');

    // 移动端强制居中显示
    if (isMobile()) {
      modalContent.style.position = 'relative';
      modalContent.style.top = 'auto';
      modalContent.style.left = 'auto';
      modalContent.style.right = 'auto';
      modalContent.style.bottom = 'auto';
      modalContent.style.margin = 'auto';
      modalContent.style.width = 'calc(100% - 32px)';
      modalContent.style.height = 'auto';
    } else if (modalPosition === 'fixed') {
      // 桌面端固定模式：居中展示
      modalContent.style.position = 'relative';
      modalContent.style.top = 'auto';
      modalContent.style.left = 'auto';
      modalContent.style.right = 'auto';
      modalContent.style.bottom = 'auto';
      modalContent.style.margin = 'auto';
    } else {
      // 桌面端跟随模式：跟随按钮位置 - 智能定位，确保弹框完整显示在屏幕内
      positionModalFollow(modalContent);
    }

    // 添加ESC键关闭功能（先移除避免重复绑定）
    document.removeEventListener('keydown', handleEscKey);
    document.addEventListener('keydown', handleEscKey);
  }

  // ESC键处理
  function handleEscKey(e) {
    // 只在弹框显示时响应 ESC 键
    if (e.key === 'Escape' && widgetModal && widgetModal.style.display === 'flex') {
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
    hasDragged = false; // 重置拖拽标记

    const rect = widgetButton.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    // 记录拖拽开始位置
    dragStartPos.x = clientX;
    dragStartPos.y = clientY;

    // 由于 transform-origin 是 center，scale 不会改变元素中心位置
    // 但 getBoundingClientRect() 返回的尺寸是放大后的，需要计算原始尺寸
    // 假设当前可能有 scale(1.1)，计算原始尺寸
    const scale = 1.1; // hover 时的 scale 值
    const originalWidth = rect.width / scale;
    const originalHeight = rect.height / scale;

    // 缓存按钮原始尺寸（未缩放）
    buttonSize.width = originalWidth;
    buttonSize.height = originalHeight;

    // 由于 transform-origin 是 center，元素的左上角位置需要考虑 scale 的影响
    // 中心点位置不变，但左上角会向左上移动
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const originalLeft = centerX - originalWidth / 2;
    const originalTop = centerY - originalHeight / 2;

    initialPosition.left = originalLeft;
    initialPosition.top = originalTop;

    // 计算鼠标相对于原始尺寸（未缩放）按钮左上角的偏移
    dragOffset.x = clientX - originalLeft;
    dragOffset.y = clientY - originalTop;

    widgetButton.style.position = 'fixed';
    widgetButton.style.top = originalTop + 'px';
    widgetButton.style.left = originalLeft + 'px';
    widgetButton.style.right = 'auto';
    widgetButton.style.bottom = 'auto';
    // 保持 scale 效果
    widgetButton.style.transform = 'scale(1.1)';

    widgetButton.style.transition = 'none';
    widgetButton.style.willChange = 'left, top, transform';

    document.addEventListener('mousemove', drag, { passive: false });
    document.addEventListener('mouseup', stopDrag);

    widgetButton.classList.add('dragging');
    widgetButton.style.zIndex = '10001';
  }

  // 拖拽中 - 直接更新位置，实现丝滑跟随
  function drag(e) {
    if (!isDragging) return;

    if (e.preventDefault) {
      e.preventDefault();
    }

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    // 检测是否发生了实际移动（超过5px才认为是拖拽）
    const moveDistance = Math.sqrt(
      Math.pow(clientX - dragStartPos.x, 2) +
      Math.pow(clientY - dragStartPos.y, 2)
    );
    if (moveDistance > 5) {
      hasDragged = true;
    }
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const buttonWidth = buttonSize.width;
    const buttonHeight = buttonSize.height;

    // 直接基于鼠标位置计算新位置
    // 鼠标位置减去拖拽偏移量，得到按钮左上角应该的位置
    const newLeft = clientX - dragOffset.x;
    const newTop = clientY - dragOffset.y;

    // 垂直位置：限制在屏幕范围内，距离顶部和底部最小距离为 24px
    const minTop = 24;
    const maxTop = Math.max(minTop, windowHeight - buttonHeight - 24);
    const constrainedTop = Math.max(minTop, Math.min(newTop, maxTop));

    // 水平位置：限制在屏幕范围内
    const maxLeft = windowWidth - buttonWidth;
    const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));

    widgetButton.style.left = constrainedLeft + 'px';
    widgetButton.style.top = constrainedTop + 'px';
    widgetButton.style.right = 'auto';
    widgetButton.style.bottom = 'auto';
    // 保持 scale 效果
    widgetButton.style.transform = 'scale(1.1)';
  }

  // 停止拖拽
  function stopDrag() {
    if (!isDragging) return;

    isDragging = false;

    // 取消待执行的动画帧
    if (dragAnimationFrame) {
      cancelAnimationFrame(dragAnimationFrame);
      dragAnimationFrame = null;
    }

    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);

    widgetButton.classList.remove('dragging');
    widgetButton.style.zIndex = '9999';

    // 恢复过渡效果
    widgetButton.style.transition = '';
    widgetButton.style.willChange = '';
    // 移除 transform，让 CSS hover 效果可以正常工作
    widgetButton.style.transform = '';

    // 根据按钮类型和当前位置进行最终定位
    requestAnimationFrame(() => {
      const buttonRect = widgetButton.getBoundingClientRect();
      const currentLeft = buttonRect.left;
      const currentTop = buttonRect.top;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const buttonWidth = buttonSize.width;
      const buttonHeight = buttonSize.height;

      // 两种模式使用相同的停止拖拽逻辑：只能左右侧边缘吸附
      // 根据按钮实际位置判断左右，保持当前位置
      const screenCenterX = windowWidth / 2;
      const buttonCenterX = currentLeft + buttonWidth / 2;
      const isLeftSide = buttonCenterX < screenCenterX;
      const sideDistance = 16; // 距离边缘的距离

      // 垂直位置：保持在当前位置，限制在屏幕范围内，距离顶部和底部最小距离为 24px
      const minTop = 24;
      const maxTop = Math.max(minTop, windowHeight - buttonHeight - 24);
      const finalTop = Math.max(minTop, Math.min(currentTop, maxTop));
      let finalLeft;

      // 水平位置：距离左右边16px
      if (isLeftSide) {
        finalLeft = sideDistance;
        widgetButton.style.left = sideDistance + 'px';
        widgetButton.style.right = 'auto';
      } else {
        finalLeft = windowWidth - sideDistance - buttonWidth;
        widgetButton.style.right = sideDistance + 'px';
        widgetButton.style.left = 'auto';
      }

      widgetButton.style.top = finalTop + 'px';
      widgetButton.style.bottom = 'auto';

      // 更新 border-radius（现在都是24px圆角）
      widgetButton.style.borderRadius = '24px';

      // 更新初始位置，为下次拖拽做准备
      if (finalLeft !== undefined && finalTop !== undefined) {
        initialPosition.left = finalLeft;
        initialPosition.top = finalTop;
      } else {
        // 如果未定义，使用当前实际位置
        initialPosition.left = buttonRect.left;
        initialPosition.top = buttonRect.top;
      }
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
      const modalContent = widgetModal.querySelector('.widget-bot-modal-content');
      if (!modalContent) return;

      // 移动端强制居中显示
      if (isMobile()) {
        modalContent.style.position = 'relative';
        modalContent.style.top = 'auto';
        modalContent.style.left = 'auto';
        modalContent.style.right = 'auto';
        modalContent.style.bottom = 'auto';
        modalContent.style.margin = 'auto';
        modalContent.style.width = 'calc(100% - 32px)';
        modalContent.style.height = 'auto';
        return;
      }

      const modalPosition = widgetInfo?.modal_position || defaultModalPosition;
      if (modalPosition === 'fixed') {
        // 固定居中模式不需要重新定位
        return;
      }

      // 重新计算模态框位置（使用智能定位）
      positionModalFollow(modalContent);
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
    if (customTriggerElement && customTriggerHandler) {
      customTriggerElement.removeEventListener('click', customTriggerHandler);
      customTriggerElement.removeAttribute('data-widget-trigger-attached');
    }
  });

  // 启动
  init();
})();

