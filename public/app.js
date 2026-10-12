/**
 * Flipbook Application Logic - Sử dụng Thư viện Lật Sách Canvas St.PageFlip Ban Đầu
 * Giữ nguyên hiệu ứng uốn cong, độ bóng chân thực và kéo góc trang mượt mà.
 */
document.addEventListener('DOMContentLoaded', async () => {
  let pageFlip = null;
  let bookData = null;
  let currentPage = 0;
  let zoomLevel = 1.0;
  let autoplayTimer = null;

  // DOM Elements
  const flipbookEl = document.getElementById('flipbook');
  const flipbookStage = document.getElementById('flipbookStage');
  const readerContainer = document.getElementById('readerContainer');
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

  // 1. Nạp dữ liệu sách
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

  // 2. Khởi tạo St.PageFlip ban đầu
  function initFlipbook(data) {
    bookData = data;
    headerBookTitle.textContent = bookData.bookTitle || 'Sách Lật Điện Tử';
    totalPagesLabel.textContent = bookData.pages.length;

    flipbookEl.innerHTML = '';

    // Tạo các trang HTML bên trong sách
    bookData.pages.forEach((page, index) => {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page';
      pageDiv.setAttribute('data-density', index === 0 || index === bookData.pages.length - 1 ? 'hard' : 'soft');

      const img = document.createElement('img');
      img.src = page.image;
      img.alt = page.title || `Trang ${page.pageNumber}`;
      img.loading = index < 4 ? 'eager' : 'lazy';

      pageDiv.appendChild(img);
      flipbookEl.appendChild(pageDiv);
    });

    // Kích thước chuẩn tỉ lệ ảnh bài học (~940x1672)
    const vWidth = readerContainer.clientWidth;
    const vHeight = readerContainer.clientHeight;
    const targetRatio = 940 / 1672;

    let pageHeight = Math.min(vHeight * 0.88, 800);
    let pageWidth = Math.round(pageHeight * targetRatio);

    if (vWidth < 768) {
      pageWidth = Math.min(vWidth * 0.9, 440);
      pageHeight = Math.round(pageWidth / targetRatio);
    }

    if (pageFlip) {
      pageFlip.destroy();
    }

    // Cấu hình Engine PageFlip với hiệu ứng Canvas ban đầu
    pageFlip = new St.PageFlip(flipbookEl, {
      width: pageWidth,
      height: pageHeight,
      size: 'stretch',
      minWidth: 260,
      maxWidth: 900,
      minHeight: 450,
      maxHeight: 1400,
      maxShadowOpacity: 0.6,
      showCover: false, // Mở ra hiển thị 2 trang đôi ngay từ trang đầu
      mobileScrollSupport: false,
      useMouseEvents: true,
      usePortrait: true,
      autoSize: true,
      flippingTime: 700
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

    // Bắt sự kiện lật trang
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

    if (bookData && bookData.pages[index]) {
      const p1 = bookData.pages[index];
      const p2 = bookData.pages[index + 1];
      if (p2 && pageFlip && pageFlip.getOrientation() === 'landscape') {
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
      item.classList.toggle('active', idx === index || (idx === index + 1 && pageFlip && pageFlip.getOrientation() === 'landscape'));
    });

    document.querySelectorAll('.thumb-card').forEach((item, idx) => {
      item.classList.toggle('active', idx === index || (idx === index + 1 && pageFlip && pageFlip.getOrientation() === 'landscape'));
    });
  }

  // 3. Mục lục
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

  // 4. Thumbnails
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

  // 5. Nút điều hướng
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

  // 6. Phóng to / Thu nhỏ
  function applyZoom(delta) {
    if (delta === 0) zoomLevel = 1.0;
    else zoomLevel = Math.min(Math.max(zoomLevel + delta, 0.75), 2.2);
    flipbookStage.style.transform = `scale(${zoomLevel})`;
    btnZoomReset.querySelector('span').textContent = `${Math.round(zoomLevel * 100)}%`;
  }

  btnZoomIn.addEventListener('click', () => applyZoom(0.2));
  btnZoomOut.addEventListener('click', () => applyZoom(-0.2));
  btnZoomReset.addEventListener('click', () => applyZoom(0));

  // 7. Autoplay Slideshow
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

  // 8. Âm thanh lật sách
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

  // 10. Drawer Toggles (Mục lục & Thumbnails)
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
      applyZoom(0);
    }
  });

  // Mở khóa âm thanh khi người dùng bấm chuột lần đầu
  const unlockAudio = () => {
    window.flipSound.init();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);

  window.addEventListener('resize', () => {
    if (pageFlip) pageFlip.update();
  });

  // Khởi động
  updateSoundIcon();
  const initialData = await loadBookData();
  initFlipbook(initialData);
});
