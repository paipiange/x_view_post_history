// 页面加载时显示记录
document.addEventListener('DOMContentLoaded', () => {
  loadLogs();
  setupSearch();
  setupClearButton();
});

// 加载访问记录
async function loadLogs() {
  try {
    const result = await chrome.storage.local.get(['visitLogs']);
    const logs = result.visitLogs || [];
    
    displayLogs(logs);
    updateCount(logs.length);
  } catch (error) {
    console.error('加载记录时出错:', error);
    document.getElementById('logsContainer').innerHTML = 
      '<div class="empty">加载失败，请重试</div>';
  }
}

// 显示记录列表
function displayLogs(logs) {
  const container = document.getElementById('logsContainer');
  
  if (logs.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📝</div>
        <div>暂无访问记录</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = logs.map((log, index) => {
    const time = formatTime(log.visitTime);
    const contentPreview = log.content 
      ? (log.content.length > 100 ? log.content.substring(0, 100) + '...' : log.content)
      : '';
    const author = (log.authorName || log.authorHandle)
      ? `<div class="log-author">${escapeHtml(log.authorName || '')} ${escapeHtml(log.authorHandle || '')}</div>`
      : '';
    const images = Array.isArray(log.images) && log.images.length > 0
      ? `<div class="log-images">${log.images.slice(0, 3).map(img => 
          `<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt || '图片')}" />`
        ).join('')}</div>`
      : '';
    
    return `
      <div class="log-item" data-index="${index}">
        ${author}
        <div class="log-title">${escapeHtml(log.title)}</div>
        ${contentPreview ? `<div class="log-content">${escapeHtml(contentPreview)}</div>` : ''}
        ${images}
        <div class="log-url">${escapeHtml(log.url)}</div>
        <div class="log-time">${time}</div>
      </div>
    `;
  }).join('');
  
  // 添加点击事件
  container.querySelectorAll('.log-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      const url = logs[index].url;
      chrome.tabs.create({ url: url });
    });
  });
}

// 更新记录数量
function updateCount(count) {
  document.getElementById('logCount').textContent = count;
}

// 格式化时间
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 设置搜索功能
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  
  searchInput.addEventListener('input', async (e) => {
    const keyword = e.target.value.toLowerCase().trim();
    
    if (!keyword) {
      await loadLogs();
      return;
    }
    
    try {
      const result = await chrome.storage.local.get(['visitLogs']);
      const logs = result.visitLogs || [];
      
      // 过滤匹配的记录（搜索标题、内容、URL、作者）
      const filteredLogs = logs.filter(log => 
        log.title.toLowerCase().includes(keyword) ||
        log.url.toLowerCase().includes(keyword) ||
        (log.content && log.content.toLowerCase().includes(keyword)) ||
        (log.authorName && log.authorName.toLowerCase().includes(keyword)) ||
        (log.authorHandle && log.authorHandle.toLowerCase().includes(keyword))
      );
      
      displayLogs(filteredLogs);
      updateCount(filteredLogs.length);
    } catch (error) {
      console.error('搜索时出错:', error);
    }
  });
}

// 设置清空按钮
function setupClearButton() {
  const clearBtn = document.getElementById('clearBtn');
  
  clearBtn.addEventListener('click', async () => {
    if (confirm('确定要清空所有访问记录吗？')) {
      try {
        await chrome.storage.local.set({ visitLogs: [] });
        await loadLogs();
      } catch (error) {
        console.error('清空记录时出错:', error);
        alert('清空失败，请重试');
      }
    }
  });
}

