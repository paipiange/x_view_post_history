// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'recordPost') {
    recordPost(message.data);
    sendResponse({ success: true });
  }
  return true; // 保持消息通道开放
});

// 记录帖子（从content script接收）
async function recordPost(postData) {
  try {
    if (!postData || !postData.postId || !postData.url) {
      return;
    }
    
    const result = await chrome.storage.local.get(['visitLogs']);
    let logs = result.visitLogs || [];
    
    const existingIndex = logs.findIndex(log => 
      log.postId === postData.postId || log.url === postData.url
    );
    
    if (existingIndex !== -1) {
      const existing = logs[existingIndex];
      existing.visitTime = postData.visitTime;
      existing.title = postData.title || existing.title;
      existing.content = postData.content || existing.content || '';
      existing.authorName = postData.authorName || existing.authorName || '';
      existing.authorHandle = postData.authorHandle || existing.authorHandle || '';
      existing.images = Array.isArray(postData.images) ? postData.images : (existing.images || []);
      if (postData.content && postData.content !== existing.content) {
        existing.title = postData.content.length > 20 
          ? postData.content.substring(0, 20) + '...' 
          : postData.content;
      }
      logs.unshift(logs.splice(existingIndex, 1)[0]);
    } else {
      const newLog = {
        postId: postData.postId,
        url: postData.url,
        title: postData.title || '无标题',
        content: postData.content || '',
        authorName: postData.authorName || '',
        authorHandle: postData.authorHandle || '',
        images: Array.isArray(postData.images) ? postData.images : [],
        visitTime: postData.visitTime
      };
      logs.unshift(newLog);
    }
    
    if (logs.length > 1000) {
      logs = logs.slice(0, 1000);
    }
    
    await chrome.storage.local.set({ visitLogs: logs });
  } catch (error) {
    console.error('记录帖子时出错:', error);
  }
}

