// Content Script - 监听X页面上的帖子
(function() {
  'use strict';

  // 存储已记录的帖子ID，避免重复记录
  const recordedPosts = new Set();
  
  // 优化图片地址，尽量获取小尺寸缩略图
  function optimizeImageUrl(url) {
    try {
      if (!url) return url;
      const u = new URL(url);
      // X 图片通常带有 format / name 参数，将 name 调整为 small
      if (u.searchParams.has('name')) {
        u.searchParams.set('name', 'small');
      }
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  // 提取帖子内容
  function extractPostContent(element) {
    try {
      const article = element.closest('article') || element;

      let textContent = '';
      let postId = '';
      let postUrl = '';
      let authorName = '';
      let authorHandle = '';
      const images = [];

      // 方法1: 查找时间戳链接（最可靠的方法）
      const timeLinks = article.querySelectorAll('a[href*="/status/"]');
      for (const link of timeLinks) {
        const href = link.getAttribute('href');
        const match = href.match(/\/status\/(\d+)/);
        if (match) {
          postId = match[1];
          if (href.startsWith('http')) {
            postUrl = href.split('?')[0];
          } else {
            postUrl = `https://x.com${href.split('?')[0]}`;
          }
          // 从链接中推断作者handle
          const parts = href.split('/').filter(Boolean);
          if (parts.length >= 2) {
            authorHandle = `@${parts[0]}`;
          }
          break;
        }
      }

      // 方法2: 从data属性获取（如果有）
      if (!postId && article.dataset) {
        const dataPostId = article.getAttribute('data-post-id') ||
                          article.getAttribute('data-tweet-id');
        if (dataPostId) {
          postId = dataPostId;
        }
      }

      // 提取作者信息
      const userNameBlock = article.querySelector('[data-testid="User-Name"]');
      if (userNameBlock) {
        const spans = userNameBlock.querySelectorAll('span');
        if (spans.length > 0) {
          authorName = spans[0].innerText.trim();
        }
        const handleSpan = Array.from(spans).find(s => (s.innerText || '').startsWith('@'));
        if (handleSpan) {
          authorHandle = handleSpan.innerText.trim();
        }
      }
      // 如果handle缺失，从postUrl尝试推断
      if (!authorHandle && postUrl) {
        const pathParts = new URL(postUrl).pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
          authorHandle = `@${pathParts[0]}`;
        }
      }

      // 提取文本内容
      const tweetTextElement = article.querySelector('[data-testid="tweetText"]');
      if (tweetTextElement) {
        textContent = tweetTextElement.innerText || tweetTextElement.textContent || '';
      } else {
        const allSpans = article.querySelectorAll('span');
        let maxLength = 0;
        let bestText = '';

        for (const span of allSpans) {
          const text = span.innerText || span.textContent || '';
          if (text.length > maxLength &&
              text.length > 10 &&
              !text.match(/^[\d\s·]+$/) &&
              !text.match(/^[回复|转发|点赞|收藏]/) &&
              !text.includes('@') &&
              !text.match(/^\d+[KMB]?$/)) {
            maxLength = text.length;
            bestText = text;
          }
        }

        if (bestText) {
          textContent = bestText;
        }
      }

      // 提取图片（用于图片帖）
      const imageEls = article.querySelectorAll('img[src*="twimg.com"]');
      for (const img of imageEls) {
        const src = img.getAttribute('src');
        if (!src) continue;
        images.push({
          src: optimizeImageUrl(src),
          alt: (img.getAttribute('alt') || '').trim()
        });
        if (images.length >= 4) break; // 最多记录4张缩略图
      }

      // 如果文本为空但有图片，使用图片的alt或占位
      if ((!textContent || textContent.length < 5) && images.length > 0) {
        const altText = images.map(i => i.alt).filter(Boolean).join(' ');
        textContent = altText || '图片帖子';
      }

      // 如果还是没有内容，尝试从整个article提取
      if (!textContent || textContent.length < 5) {
        const clone = article.cloneNode(true);
        clone.querySelectorAll('a, button, [data-testid="reply"], [data-testid="retweet"], [data-testid="like"]').forEach(el => el.remove());
        textContent = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
      }

      textContent = textContent.replace(/\s+/g, ' ').trim();

      if (!postId || !textContent || textContent.length < 3) {
        return null;
      }

      return {
        postId,
        content: textContent,
        url: postUrl,
        authorName,
        authorHandle,
        images
      };
    } catch (e) {
      console.error('提取帖子内容时出错:', e);
      return null;
    }
  }
  
  // 记录帖子
  function recordPost(element) {
    const postData = extractPostContent(element);
    if (!postData || !postData.postId || !postData.content) {
      return;
    }
    
    // 避免重复记录
    if (recordedPosts.has(postData.postId)) {
      return;
    }
    
    recordedPosts.add(postData.postId);
    
    // 确保有完整的URL
    let postUrl = postData.url;
    if (!postUrl || !postUrl.includes('/status/')) {
      postUrl = `https://x.com/i/web/status/${postData.postId}`;
    }
    
    // 生成标题（前20字，按字符计算）
    const content = postData.content.trim();
    let title = '';
    if (content.length > 20) {
      let cutPoint = 20;
      const punctuation = ['。', '，', '！', '？', '.', ',', '!', '?', ' ', '\n'];
      for (let i = 18; i < Math.min(25, content.length); i++) {
        if (punctuation.includes(content[i])) {
          cutPoint = i + 1;
          break;
        }
      }
      title = content.substring(0, cutPoint) + '...';
    } else {
      title = content;
    }
    
    chrome.runtime.sendMessage({
      type: 'recordPost',
      data: {
        postId: postData.postId,
        url: postUrl,
        title,
        content,
        authorName: postData.authorName || '',
        authorHandle: postData.authorHandle || '',
        images: postData.images || [],
        visitTime: new Date().toISOString()
      }
    }, () => {
      if (chrome.runtime.lastError) {
        // 忽略错误
      }
    });
  }
  
  // 检查并记录可见的帖子
  function checkAndRecordPosts() {
    // 查找所有帖子元素
    // X的帖子通常在article标签中，或者有特定的data-testid
    const postSelectors = [
      'article[data-testid="tweet"]',
      'article[role="article"]',
      '[data-testid="tweet"]'
    ];
    
    for (const selector of postSelectors) {
      const posts = document.querySelectorAll(selector);
      posts.forEach(post => {
        // 检查是否在视口中（使用IntersectionObserver会更高效，但这里用简单方法）
        const rect = post.getBoundingClientRect();
        if (rect.top < window.innerHeight + 500 && rect.bottom > -500) {
          recordPost(post);
        }
      });
    }
  }
  
  // 使用IntersectionObserver监听帖子进入视口
  function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // 延迟一点记录，确保内容已加载
          setTimeout(() => {
            recordPost(entry.target);
          }, 300);
        }
      });
    }, {
      rootMargin: '800px', // 提前800px开始记录（提前记录更多）
      threshold: 0.01 // 只要有一点进入视口就记录
    });
    
    // 观察所有帖子元素
    function observePosts() {
      const postSelectors = [
        'article[data-testid="tweet"]',
        'article[role="article"]',
        'article' // 备用选择器
      ];
      
      const observed = new Set();
      postSelectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(post => {
            // 避免重复观察
            if (!observed.has(post)) {
              observer.observe(post);
              observed.add(post);
            }
          });
        } catch (e) {
          console.error('观察帖子时出错:', e);
        }
      });
    }
    
    // 初始观察
    setTimeout(observePosts, 1000);
    
    // 使用MutationObserver监听新帖子加载
    const mutationObserver = new MutationObserver((mutations) => {
      let shouldObserve = false;
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'ARTICLE' || node.querySelector('article')) {
              shouldObserve = true;
            }
          }
        });
      });
      
      if (shouldObserve) {
        setTimeout(observePosts, 500);
      }
    });
    
    if (document.body) {
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
  
  // 页面加载完成后开始监听（尽快记录）
  const init = () => {
    setupIntersectionObserver();
    // 立即检查一次，确保进入页面就记录
    setTimeout(checkAndRecordPosts, 200);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // 定期检查（备用方案）
  setInterval(checkAndRecordPosts, 4000);
  
  // 监听滚动事件（备用方案）
  let scrollTimer = null;
  window.addEventListener('scroll', () => {
    if (scrollTimer) {
      clearTimeout(scrollTimer);
    }
    scrollTimer = setTimeout(checkAndRecordPosts, 500);
  }, { passive: true });
  
})();

