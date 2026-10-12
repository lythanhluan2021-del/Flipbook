/**
 * Flipbook Logic - Tối ưu 1 trang trên điện thoại & Nâng cấp Zoom trực tiếp trong trang
 * - Bấm vào giữa trang không còn tự ý lật nữa (tránh lật nhầm khi học sinh đang đọc).
 * - Nhấp đúp (Double-click/Double-tap) phóng to ngay vị trí đang xem.
 * - Khi phóng to: Kéo rê (Drag/Pan) thoải mái để đọc chi tiết sơ đồ và chữ nhỏ.
 * - Trên điện thoại: Tự động chuyển về 1 trang duy nhất (Single Page) to rõ, đọc dễ dàng.
 */
document.addEventListener('DOMContentLoaded', async () => {
  let pageFlip = null;
  let bookData = null;
  let currentPage = 0;

  // Zoom & Pan State
  let zoomLevel = 1.0;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startDragX = 0;
  let startDragY = 0;
  let lastTapTime = 0;
  let autoplayTimer = null;

  // DOM Elements
  const flipbookEl = document.getElementById('flipbook');
  const flipbookStage = document.getElementById('flipbookStage');
  const readerContainer = document.getElementById('readerContainer');
  const zoomHud = document.getElementById('zoomHud');
  const zoomHudText = document.getElementById('zoomHudText');
  const btnResetZoomHud = document.getElementById('btnResetZoomHud');

  const headerBookTitle = document.getElementById('headerBookTitle');
  const headerCurrentLesson = document.getElementById('headerCurrentLesson');
  const pageNumberInput = document.getElementById('pageNumberInput');
  const totalPagesLabel = document.getElementById('totalPagesLabel');

  // Controls
  const arrowPrev = document.getElementById('arrowPrev');
  const arrowNext = document.getElementById('arrowNext');
  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');
  const btnFirstPage = document.getElementById('btnFirstPage');
  const btnLastPage = document.getElementById('btnLastPage');

  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnZoomReset = document.getElementById('btnZoomReset');
  const btnAutoplay = document.getElementById('btnAutoplay');
  const btnFullscreen = document.getElementById('btnFullscreen');

  const btnSound = document.getElementById('btnSound');
  const soundOnIcon = document.getElementById('soundOnIcon');
  const soundOffIcon = document.getElementById('soundOffIcon');

  const btnToc = document.getElementById('btnToc');
  const tocDrawer = document.getElementById('tocDrawer');
  const btnCloseToc = document.getElementById('btnCloseToc');
  const tocList = document.getElementById('tocList');

  const btnThumbs = document.getElementById('btnThumbs');
  const thumbsTray = document.getElementById('thumbsTray');

  const btnDriveSync = document.getElementById('btnDriveSync');
  const driveModal = document.getElementById('driveModal');
  const btnCloseDriveModal = document.getElementById('btnCloseDriveModal');
  const driveApiUrlInput = document.getElementById('driveApiUrl');
  const btnConfirmSync = document.getElementById('btnConfirmSync');
  const btnResetLocalData = document.getElementById('btnResetLocalData');

  // 1. Nạp dữ liệu bài học
  async function loadBookData() {
    const savedDriveUrl = localStorage.getItem('flipbook_drive_api');
    if (savedDriveUrl) {
      driveApiUrlInput.value = savedDriveUrl;
      try {
        const res = await fetch(savedDriveUrl);
        if (res.ok) {
          const driveData = await res.json();
          if (driveData && driveData.pages && driveData.pages.length > 0) {
            console.log('Nạp từ Drive API thành công:', driveData);
            return driveData;
          }
        }
      } catch (err) {
        console.warn('Không thể nạp từ Drive API:', err);
      }
    }

    try {
      const res = await fetch('books-data.json');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Lỗi đọc books-data.json:', e);
    }

    return {
      bookTitle: 'TIN HỌC ỨNG DỤNG 12 - KẾT NỐI TRI THỨC',
      totalPages: 8,
      pages: [
        { pageNumber: 1, title: 'Bài 1: Làm quen với trí tuệ nhân tạo', image: 'images/page-01.png' },
        { pageNumber: 2, title: 'Bài 2: Trí tuệ nhân tạo trong đời sống', image: 'images/page-02.png' },
        { pageNumber: 3, title: 'Bài 3: Một số thiết bị mạng thông dụng', image: 'images/page-03.png' },
        { pageNumber: 4, title: 'Bài 4: Giao thức mạng', image: 'images/page-04.png' },
        { pageNumber: 5, title: 'Bài 5 (Phần 1): Chia sẻ tài nguyên mạng Windows', image: 'images/page-05.png' },
        { pageNumber: 6, title: 'Bài 5 (Phần 2): Chia sẻ tài nguyên trên mạng', image: 'images/page-06.png' },
        { pageNumber: 7, title: 'Bài 6: Giao tiếp và ứng xử trên mạng', image: 'images/page-07.png' },
        { pageNumber: 8, title: 'Bài 7: HTML và cấu trúc trang web', image: 'images/page-08.png' }
      ]
    };
  }

  // 2. Khởi tạo sách với cấu hình chuẩn
  function initFlipbook(data) {
    bookData = data;
    headerBookTitle.textContent = bookData.bookTitle || 'Sách Lật Điện Tử';
    totalPagesLabel.textContent = bookData.pages.length;

    flipbookEl.innerHTML = '';

    // Tạo các trang sách ban đầu
    bookData.pages.forEach((page, index) => {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page';
      pageDiv.setAttribute('data-density', index === 0 || index === bookData.pages.length - 1 ? 'hard' : 'soft');

      const img = document.createElement('img');
      img.src = page.image;
      img.alt = page.title || `Trang ${page.pageNumber}`;
      img.loading = index < 3 ? 'eager' : 'lazy';

      pageDiv.appendChild(img);
      flipbookEl.appendChild(pageDiv);
    });

    const isMobile = window.innerWidth < 768;
    const vWidth = readerContainer.clientWidth;
    const vHeight = readerContainer.clientHeight;
    const targetRatio = 940 / 1672;

    let pageWidth, pageHeight;

    if (isMobile) {
      // Trên điện thoại: Tối ưu 1 trang đơn, lấp đầy màn hình để dễ đọc
      pageWidth = Math.round(Math.min(vWidth * 0.95, 480));
      pageHeight = Math.round(pageWidth / targetRatio);
      if (pageHeight > vHeight * 0.88) {
        pageHeight = Math.round(vHeight * 0.88);
        pageWidth = Math.round(pageHeight * targetRatio);
      }
    } else {
      // Trên máy tính / màn hình lớn: Hiển thị 2 trang đôi
      pageHeight = Math.round(Math.min(vHeight * 0.88, 800));
      pageWidth = Math.round(pageHeight * targetRatio);
    }

    if (pageFlip) {
      pageFlip.destroy();
    }

    pageFlip = new St.PageFlip(flipbookEl, {
      width: pageWidth,
      height: pageHeight,
      size: 'stretch',
      minWidth: 260,
      maxWidth: 900,
      minHeight: 450,
      maxHeight: 1400,
      maxShadowOpacity: 0.6,
      showCover: false,
      mobileScrollSupport: false,
      // TẮT useMouseEvents: Bấm vào trang sẽ KHÔNG TỰ ĐỘNG LẬT nữa!
      // Giữ cho học sinh thoải mái chỉ trỏ, phóng to và đọc nội dung.
      useMouseEvents: false,
      usePortrait: true,
      autoSize: true,
      flippingTime: 700
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

    pageFlip.on('flip', (e) => {
      currentPage = e.data;
      onPageChanged(currentPage);
      window.flipSound.play();
    });

    pageFlip.on('init', () => {
      onPageChanged(0);
    });

    renderTOC();
    renderThumbnails();
  }

  function onPageChanged(index) {
    const pageNum = index + 1;
    pageNumberInput.value = pageNum;

    const isLandscape = pageFlip && pageFlip.getOrientation() === 'landscape';
    if (bookData && bookData.pages[index]) {
      const p1 = bookData.pages[index];
      const p2 = bookData.pages[index + 1];
      if (p2 && isLandscape) {
        headerCurrentLesson.textContent = `Trang ${p1.pageNumber}: ${p1.title}  ✦  Trang ${p2.pageNumber}: ${p2.title}`;
      } else {
        headerCurrentLesson.textContent = `Trang ${p1.pageNumber}: ${p1.title}`;
      }
    }

    arrowPrev.disabled = index === 0;
    btnPrevPage.disabled = index === 0;
    btnFirstPage.disabled = index === 0;

    const isLast = index >= bookData.pages.length - 1;
    arrowNext.disabled = isLast;
    btnNextPage.disabled = isLast;
    btnLastPage.disabled = isLast;

    document.querySelectorAll('.toc-item').forEach((item, idx) => {
      item.classList.toggle('active', idx === index || (idx === index + 1 && isLandscape));
    });

    document.querySelectorAll('.thumb-card').forEach((item, idx) => {
      item.classList.toggle('active', idx === index || (idx === index + 1 && isLandscape));
    });

    // Reset zoom khi chuyển trang
    if (zoomLevel !== 1.0) {
      setZoom(1.0);
    }
  }

  // 3. Hệ thống Zoom & Pan mượt mà trong trang sách
  function applyTransform() {
    flipbookStage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    btnZoomReset.querySelector('span').textContent = `${Math.round(zoomLevel * 100)}%`;

    if (zoomLevel > 1.0) {
      flipbookStage.classList.add('is-zoomed');
      zoomHud.classList.add('visible');
      zoomHudText.textContent = `🔍 Đang phóng to ${Math.round(zoomLevel * 100)}% • Kéo để di chuyển • Nhấp đúp để thu nhỏ`;
    } else {
      flipbookStage.classList.remove('is-zoomed', 'is-dragging');
      zoomHud.classList.remove('visible');
      panX = 0;
      panY = 0;
      flipbookStage.style.transform = `scale(1)`;
    }
  }

  function setZoom(newLevel, centerX, centerY) {
    const prevLevel = zoomLevel;
    zoomLevel = Math.min(Math.max(newLevel, 1.0), 3.0);

    if (zoomLevel === 1.0) {
      panX = 0;
      panY = 0;
    } else if (centerX !== undefined && centerY !== undefined) {
      // Zoom tập trung vào điểm click
      const rect = readerContainer.getBoundingClientRect();
      const offsetX = centerX - rect.left - rect.width / 2;
      const offsetY = centerY - rect.top - rect.height / 2;
      panX = -offsetX * (zoomLevel - 1);
      panY = -offsetY * (zoomLevel - 1);
    }

    applyTransform();
  }

  // Nhấp đúp (Double-click trên PC) để phóng to / thu nhỏ
  flipbookStage.addEventListener('dblclick', (e) => {
    e.preventDefault();
    if (zoomLevel > 1.05) {
      setZoom(1.0);
    } else {
      setZoom(2.2, e.clientX, e.clientY);
    }
  });

  // Kéo rê (Drag / Pan) khi đang phóng to
  flipbookStage.addEventListener('mousedown', (e) => {
    if (zoomLevel <= 1.0) return;
    isDragging = true;
    startDragX = e.clientX - panX;
    startDragY = e.clientY - panY;
    flipbookStage.classList.add('is-dragging');
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panX = e.clientX - startDragX;
    panY = e.clientY - startDragY;
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      flipbookStage.classList.remove('is-dragging');
    }
  });

  // Lăn chuột (Wheel) để phóng to / thu nhỏ
  readerContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setZoom(zoomLevel + delta, e.clientX, e.clientY);
  }, { passive: false });

  // Nút công cụ Zoom
  btnZoomIn.addEventListener('click', () => setZoom(zoomLevel + 0.3));
  btnZoomOut.addEventListener('click', () => setZoom(zoomLevel - 0.3));
  btnZoomReset.addEventListener('click', () => setZoom(1.0));
  btnResetZoomHud.addEventListener('click', () => setZoom(1.0));

  // Tương tác chạm trên Mobile (Touch: Pinch-to-zoom & Double-tap)
  let initialPinchDist = 0;
  let initialPinchZoom = 1;
  let touchStartX = 0;
  let touchStartY = 0;

  readerContainer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      // Pinch 2 ngón tay
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDist = Math.hypot(dx, dy);
      initialPinchZoom = zoomLevel;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      const t = e.touches[0];

      // Phát hiện Double-tap (chạm 2 lần liên tiếp trên điện thoại)
      if (now - lastTapTime < 300) {
        e.preventDefault();
        if (zoomLevel > 1.05) setZoom(1.0);
        else setZoom(2.2, t.clientX, t.clientY);
        lastTapTime = 0;
        return;
      }
      lastTapTime = now;

      touchStartX = t.clientX;
      touchStartY = t.clientY;

      if (zoomLevel > 1.0) {
        isDragging = true;
        startDragX = t.clientX - panX;
        startDragY = t.clientY - panY;
        flipbookStage.classList.add('is-dragging');
      }
    }
  }, { passive: false });

  readerContainer.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (initialPinchDist > 0) {
        const factor = dist / initialPinchDist;
        setZoom(initialPinchZoom * factor);
      }
    } else if (e.touches.length === 1 && isDragging && zoomLevel > 1.0) {
      e.preventDefault();
      const t = e.touches[0];
      panX = t.clientX - startDragX;
      panY = t.clientY - startDragY;
      applyTransform();
    }
  }, { passive: false });

  readerContainer.addEventListener('touchend', (e) => {
    if (isDragging) {
      isDragging = false;
      flipbookStage.classList.remove('is-dragging');
    }
    initialPinchDist = 0;

    // Khi không zoom: vuốt ngang để lật trang trên điện thoại
    if (zoomLevel <= 1.0 && e.changedTouches.length === 1) {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) > 50) {
        if (diff < 0) pageFlip && pageFlip.flipNext();
        else pageFlip && pageFlip.flipPrev();
      }
    }
  });

  // 4. Mục lục
  function renderTOC() {
    tocList.innerHTML = '';
    bookData.pages.forEach((page, index) => {
      const item = document.createElement('div');
      item.className = 'toc-item' + (index === currentPage ? ' active' : '');
      item.innerHTML = `
        <span class="toc-num">${index + 1}</span>
        <span class="toc-text">${page.title}</span>
      `;
      item.addEventListener('click', () => {
        pageFlip.flip(index);
        tocDrawer.classList.remove('open');
        btnToc.classList.remove('active');
      });
      tocList.appendChild(item);
    });
  }

  // 5. Thumbnails
  function renderThumbnails() {
    thumbsTray.innerHTML = '';
    bookData.pages.forEach((page, index) => {
      const card = document.createElement('div');
      card.className = 'thumb-card' + (index === currentPage ? ' active' : '');
      card.innerHTML = `
        <img src="${page.image}" alt="Trang ${index + 1}">
        <span>Trang ${index + 1}</span>
      `;
      card.addEventListener('click', () => {
        pageFlip.flip(index);
      });
      thumbsTray.appendChild(card);
    });
  }

  // 6. Điều hướng lật trang bằng nút và phím
  arrowPrev.addEventListener('click', () => pageFlip && pageFlip.flipPrev());
  btnPrevPage.addEventListener('click', () => pageFlip && pageFlip.flipPrev());
  arrowNext.addEventListener('click', () => pageFlip && pageFlip.flipNext());
  btnNextPage.addEventListener('click', () => pageFlip && pageFlip.flipNext());

  btnFirstPage.addEventListener('click', () => pageFlip && pageFlip.flip(0));
  btnLastPage.addEventListener('click', () => pageFlip && pageFlip.flip(bookData.pages.length - 1));

  pageNumberInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      let num = parseInt(pageNumberInput.value, 10);
      if (!isNaN(num) && num >= 1 && num <= bookData.pages.length) {
        pageFlip.flip(num - 1);
      } else {
        pageNumberInput.value = currentPage + 1;
      }
    }
  });

  // 7. Autoplay
  btnAutoplay.addEventListener('click', () => {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
      btnAutoplay.classList.remove('active');
    } else {
      btnAutoplay.classList.add('active');
      autoplayTimer = setInterval(() => {
        if (!pageFlip) return;
        if (currentPage >= bookData.pages.length - 1) {
          pageFlip.flip(0);
        } else {
          pageFlip.flipNext();
        }
      }, 4500);
    }
  });

  // 8. Âm thanh
  function updateSoundIcon() {
    const isEnabled = window.flipSound.enabled;
    soundOnIcon.style.display = isEnabled ? 'block' : 'none';
    soundOffIcon.style.display = isEnabled ? 'none' : 'block';
    btnSound.classList.toggle('active', isEnabled);
  }

  btnSound.addEventListener('click', () => {
    window.flipSound.toggle();
    updateSoundIcon();
    if (window.flipSound.enabled) {
      window.flipSound.play();
    }
  });

  // 9. Toàn màn hình
  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // 10. Drawer Toggles
  btnToc.addEventListener('click', () => {
    const isOpen = tocDrawer.classList.toggle('open');
    btnToc.classList.toggle('active', isOpen);
    if (isOpen) {
      thumbsTray.classList.remove('open');
      btnThumbs.classList.remove('active');
    }
  });

  btnCloseToc.addEventListener('click', () => {
    tocDrawer.classList.remove('open');
    btnToc.classList.remove('active');
  });

  btnThumbs.addEventListener('click', () => {
    const isOpen = thumbsTray.classList.toggle('open');
    btnThumbs.classList.toggle('active', isOpen);
    if (isOpen) {
      tocDrawer.classList.remove('open');
      btnToc.classList.remove('active');
    }
  });

  // 11. Google Drive Sync Modal
  btnDriveSync.addEventListener('click', () => {
    driveModal.classList.add('open');
  });

  btnCloseDriveModal.addEventListener('click', () => {
    driveModal.classList.remove('open');
  });

  btnConfirmSync.addEventListener('click', async () => {
    const url = driveApiUrlInput.value.trim();
    if (!url) {
      alert('Vui lòng dán liên kết Web App Google Apps Script của bạn!');
      return;
    }

    btnConfirmSync.disabled = true;
    btnConfirmSync.textContent = 'Đang đồng bộ...';

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.pages && data.pages.length > 0) {
        localStorage.setItem('flipbook_drive_api', url);
        initFlipbook(data);
        driveModal.classList.remove('open');
        alert(`Đồng bộ thành công ${data.pages.length} trang sách từ Google Drive!`);
      } else {
        alert('Dữ liệu không đúng định dạng chứa danh sách các trang.');
      }
    } catch (err) {
      alert('Lỗi kết nối tới Drive API: ' + err.message);
    } finally {
      btnConfirmSync.disabled = false;
      btnConfirmSync.textContent = 'Lưu & Đồng bộ ngay';
    }
  });

  btnResetLocalData.addEventListener('click', async () => {
    localStorage.removeItem('flipbook_drive_api');
    driveApiUrlInput.value = '';
    const localData = await loadBookData();
    initFlipbook(localData);
    driveModal.classList.remove('open');
    alert('Đã khôi phục về danh sách ảnh bài học có sẵn trong máy!');
  });

  // 12. Phím tắt bàn phím
  window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT') return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      pageFlip && pageFlip.flipNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      pageFlip && pageFlip.flipPrev();
    } else if (e.key === 'Home') {
      pageFlip && pageFlip.flip(0);
    } else if (e.key === 'End') {
      pageFlip && pageFlip.flip(bookData.pages.length - 1);
    } else if (e.key.toLowerCase() === 'm') {
      btnSound.click();
    } else if (e.key.toLowerCase() === 'f') {
      btnFullscreen.click();
    } else if (e.key === 'Escape') {
      tocDrawer.classList.remove('open');
      thumbsTray.classList.remove('open');
      driveModal.classList.remove('open');
      btnToc.classList.remove('active');
      btnThumbs.classList.remove('active');
      setZoom(1.0);
    }
  });

  // Mở khóa âm thanh
  const unlockAudio = () => {
    window.flipSound.init();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);

  // Resize handler
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (bookData) initFlipbook(bookData);
    }, 250);
  });

  // Khởi chạy
  updateSoundIcon();
  const initialData = await loadBookData();
  initFlipbook(initialData);
});
