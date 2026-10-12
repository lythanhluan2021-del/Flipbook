/**
 * Flipbook Logic - Giữ lại trang vừa lật bên trái sử dụng St.PageFlip Canvas Engine
 * Đảm bảo 100% hiệu ứng uốn cong 3D, đổ bóng và kéo góc trang tuyệt đẹp của Page-Flip,
 * đồng thời giữ lại trang vừa lật ở bên trái để đối chiếu trang trước - trang sau.
 */
document.addEventListener('DOMContentLoaded', async () => {
  let pageFlip = null;
  let rawBookData = null;
  let currentSpread = 0;
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

  // 2. Khởi tạo Flipbook với cơ chế phân bổ trang đối chiếu (Retained Spreads)
  function initFlipbook(data) {
    rawBookData = data;
    headerBookTitle.textContent = rawBookData.bookTitle || 'Sách Lật Điện Tử';
    totalPagesLabel.textContent = rawBookData.pages.length;

    flipbookEl.innerHTML = '';

    const pages = rawBookData.pages;
    const totalLessons = pages.length;

    // Xây dựng danh sách cặp trang (Spreads):
    // Cặp 0: [Bài 1, Bài 2]
    // Cặp 1: [Bài 2, Bài 3] -> Bài 2 được giữ lại ở bên trái!
    // Cặp 2: [Bài 3, Bài 4] -> Bài 3 được giữ lại ở bên trái!
    // ...
    // Cặp n: [Bài n-1, Bài n]
    const spreads = [];
    for (let i = 0; i < totalLessons - 1; i++) {
      spreads.push({
        leftLesson: pages[i],
        rightLesson: pages[i + 1]
      });
    }

    // Tạo các phần tử DOM cho St.PageFlip
    spreads.forEach((spread, spreadIdx) => {
      // Trang trái của cặp
      const pageLeftEl = document.createElement('div');
      pageLeftEl.className = 'page page-left';
      pageLeftEl.setAttribute('data-density', 'soft');
      const imgL = document.createElement('img');
      imgL.src = spread.leftLesson.image;
      imgL.alt = spread.leftLesson.title;
      imgL.loading = spreadIdx === 0 ? 'eager' : 'lazy';
      pageLeftEl.appendChild(imgL);
      flipbookEl.appendChild(pageLeftEl);

      // Trang phải của cặp
      const pageRightEl = document.createElement('div');
      pageRightEl.className = 'page page-right';
      pageRightEl.setAttribute('data-density', 'soft');
      const imgR = document.createElement('img');
      imgR.src = spread.rightLesson.image;
      imgR.alt = spread.rightLesson.title;
      imgR.loading = spreadIdx === 0 ? 'eager' : 'lazy';
      pageRightEl.appendChild(imgR);
      flipbookEl.appendChild(pageRightEl);
    });

    // Kích thước chuẩn
    const vWidth = readerContainer.clientWidth;
    const vHeight = readerContainer.clientHeight;
    const targetRatio = 940 / 1672;

    let pageHeight = Math.min(vHeight * 0.88, 780);
    let pageWidth = Math.round(pageHeight * targetRatio);

    if (vWidth < 768) {
      pageWidth = Math.min(vWidth * 0.9, 440);
      pageHeight = Math.round(pageWidth / targetRatio);
    }

    if (pageFlip) {
      pageFlip.destroy();
    }

    // Khởi tạo engine St.PageFlip
    pageFlip = new St.PageFlip(flipbookEl, {
      width: pageWidth,
      height: pageHeight,
      size: 'stretch',
      minWidth: 260,
      maxWidth: 900,
      minHeight: 450,
      maxHeight: 1400,
      maxShadowOpacity: 0.6,
      showCover: false, // Mở luôn 2 trang đôi
      mobileScrollSupport: false,
      useMouseEvents: true,
      usePortrait: true,
      autoSize: true,
      flippingTime: 700
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

    // Bắt sự kiện lật trang
    pageFlip.on('flip', (e) => {
      // e.data là pageIndex của trang đầu tiên trong cặp (0, 2, 4, 6...)
      currentSpread = Math.floor(e.data / 2);
      onSpreadChanged(currentSpread, spreads);
      window.flipSound.play();
    });

    pageFlip.on('init', () => {
      onSpreadChanged(0, spreads);
    });

    renderTOC(spreads);
    renderThumbnails(spreads);
  }

  function onSpreadChanged(sIndex, spreads) {
    if (!spreads || !spreads[sIndex]) return;

    const current = spreads[sIndex];
    const leftLesson = current.leftLesson;
    const rightLesson = current.rightLesson;

    // Cập nhật nhãn trang trên footer
    pageNumberInput.value = `${leftLesson.pageNumber} - ${rightLesson.pageNumber}`;

    // Cập nhật tiêu đề bài học trên Header
    headerCurrentLesson.textContent = `Trang trước: Trang ${leftLesson.pageNumber} (${leftLesson.title})  ✦  Trang sau: Trang ${rightLesson.pageNumber} (${rightLesson.title})`;

    // Trạng thái nút
    arrowPrev.disabled = sIndex === 0;
    btnPrevPage.disabled = sIndex === 0;
    btnFirstPage.disabled = sIndex === 0;

    const isLast = sIndex >= spreads.length - 1;
    arrowNext.disabled = isLast;
    btnNextPage.disabled = isLast;
    btnLastPage.disabled = isLast;

    // Highlight trong Mục lục & Thumbnails
    document.querySelectorAll('.toc-item').forEach((item, idx) => {
      const isLeft = idx === leftLesson.pageNumber - 1;
      const isRight = idx === rightLesson.pageNumber - 1;
      item.classList.toggle('active', isLeft || isRight);
    });

    document.querySelectorAll('.thumb-card').forEach((item, idx) => {
      const isLeft = idx === leftLesson.pageNumber - 1;
      const isRight = idx === rightLesson.pageNumber - 1;
      item.classList.toggle('active', isLeft || isRight);
    });
  }

  // 3. Mục lục (Table of Contents)
  function renderTOC(spreads) {
    tocList.innerHTML = '';
    rawBookData.pages.forEach((page, index) => {
      const item = document.createElement('div');
      item.className = 'toc-item' + (index === 0 || index === 1 ? ' active' : '');
      item.innerHTML = `
        <span class="toc-num">${index + 1}</span>
        <span class="toc-text">${page.title}</span>
      `;
      item.addEventListener('click', () => {
        // Nhảy đến cặp trang tương ứng
        let targetSpread = Math.min(index, spreads.length - 1);
        if (pageFlip) {
          pageFlip.flip(targetSpread * 2);
        }
        tocDrawer.classList.remove('open');
        btnToc.classList.remove('active');
      });
      tocList.appendChild(item);
    });
  }

  // 4. Khay trang thu nhỏ (Thumbnails)
  function renderThumbnails(spreads) {
    thumbsTray.innerHTML = '';
    rawBookData.pages.forEach((page, index) => {
      const card = document.createElement('div');
      card.className = 'thumb-card' + (index === 0 || index === 1 ? ' active' : '');
      card.innerHTML = `
        <img src="${page.image}" alt="Trang ${index + 1}">
        <span>Trang ${index + 1}</span>
      `;
      card.addEventListener('click', () => {
        let targetSpread = Math.min(index, spreads.length - 1);
        if (pageFlip) {
          pageFlip.flip(targetSpread * 2);
        }
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
  btnLastPage.addEventListener('click', () => {
    if (pageFlip && rawBookData) {
      const maxSpread = rawBookData.pages.length - 2;
      pageFlip.flip(maxSpread * 2);
    }
  });

  pageNumberInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      let num = parseInt(pageNumberInput.value, 10);
      if (!isNaN(num) && num >= 1 && num <= rawBookData.pages.length) {
        let s = Math.min(num - 1, rawBookData.pages.length - 2);
        pageFlip.flip(s * 2);
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
        if (!pageFlip || !rawBookData) return;
        const maxSpread = rawBookData.pages.length - 2;
        if (currentSpread >= maxSpread) {
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
      if (pageFlip && rawBookData) {
        pageFlip.flip((rawBookData.pages.length - 2) * 2);
      }
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

  // Mở khóa âm thanh khi tương tác lần đầu
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
