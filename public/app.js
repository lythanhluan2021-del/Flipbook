/**
 * Flipbook Logic - Chế độ Giữ Trang Vừa Lật (Dual Sync Retained View)
 * Khi lật trang: Trang vừa lật được giữ lại bên trái, trang mới mở ra bên phải.
 */
document.addEventListener('DOMContentLoaded', async () => {
  let bookData = null;
  let leftIndex = 0;
  let rightIndex = 1;
  let isAnimating = false;
  let zoomLevel = 1.0;
  let autoplayTimer = null;
  let currentMode = 'retain'; // 'retain' (giữ trang vừa lật) hoặc 'spread' (lật 2 trang)

  // DOM Elements
  const headerBookTitle = document.getElementById('headerBookTitle');
  const headerCurrentLesson = document.getElementById('headerCurrentLesson');
  const pagePairLabel = document.getElementById('pagePairLabel');
  const totalPagesLabel = document.getElementById('totalPagesLabel');

  const pageLeft = document.getElementById('pageLeft');
  const pageRight = document.getElementById('pageRight');
  const imgLeft = document.getElementById('imgLeft');
  const imgRight = document.getElementById('imgRight');
  const badgeTextLeft = document.getElementById('badgeTextLeft');
  const badgeTextRight = document.getElementById('badgeTextRight');

  const flipperLeaf = document.getElementById('flipperLeaf');
  const imgFlipperFront = document.getElementById('imgFlipperFront');
  const imgFlipperBack = document.getElementById('imgFlipperBack');

  const flipbookStage = document.getElementById('flipbookStage');
  const readerContainer = document.getElementById('readerContainer');

  // Nav Arrows & Controls
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

  const modeRetain = document.getElementById('modeRetain');
  const modeSpread = document.getElementById('modeSpread');

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

    // Dữ liệu dự phòng
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

  // 2. Khởi tạo & Cập nhật giao diện sách
  function initBook(data) {
    bookData = data;
    headerBookTitle.textContent = bookData.bookTitle || 'Sách Lật Điện Tử';
    totalPagesLabel.textContent = bookData.pages.length;

    leftIndex = 0;
    rightIndex = Math.min(1, bookData.pages.length - 1);

    updateStaticDisplay();
    renderTOC();
    renderThumbnails();
  }

  function updateStaticDisplay() {
    const total = bookData.pages.length;
    const pLeft = bookData.pages[leftIndex];
    const pRight = bookData.pages[rightIndex];

    if (pLeft) {
      imgLeft.src = pLeft.image;
      badgeTextLeft.textContent = `Trang trước: Trang ${pLeft.pageNumber} (${pLeft.title})`;
    }

    if (pRight && rightIndex < total && rightIndex !== leftIndex) {
      pageRight.style.display = 'block';
      imgRight.src = pRight.image;
      badgeTextRight.textContent = `Trang sau: Trang ${pRight.pageNumber} (${pRight.title})`;
    } else {
      // Trường hợp chỉ còn 1 trang lẻ cuối cùng
      pageRight.style.display = 'none';
    }

    // Cập nhật nhãn trang trên footer
    if (pageRight.style.display !== 'none') {
      pagePairLabel.textContent = `Trang ${pLeft.pageNumber} • ${pRight.pageNumber}`;
      headerCurrentLesson.textContent = `Trang ${pLeft.pageNumber}: ${pLeft.title}  ✦  Trang ${pRight.pageNumber}: ${pRight.title}`;
    } else {
      pagePairLabel.textContent = `Trang ${pLeft.pageNumber}`;
      headerCurrentLesson.textContent = `Trang ${pLeft.pageNumber}: ${pLeft.title}`;
    }

    // Điều khiển trạng thái nút
    const canGoPrev = leftIndex > 0;
    const canGoNext = rightIndex < total - 1;

    arrowPrev.disabled = !canGoPrev;
    btnPrevPage.disabled = !canGoPrev;
    btnFirstPage.disabled = !canGoPrev;

    arrowNext.disabled = !canGoNext;
    btnNextPage.disabled = !canGoNext;
    btnLastPage.disabled = !canGoNext;

    // Cập nhật Mục lục & Thumbnails
    updateActiveSidebarItems();
  }

  function updateActiveSidebarItems() {
    document.querySelectorAll('.toc-item').forEach((item, idx) => {
      item.classList.remove('active-left', 'active-right');
      if (idx === leftIndex) item.classList.add('active-left');
      if (idx === rightIndex && pageRight.style.display !== 'none') item.classList.add('active-right');
    });

    document.querySelectorAll('.thumb-card').forEach((item, idx) => {
      item.classList.remove('active-left', 'active-right');
      if (idx === leftIndex) item.classList.add('active-left');
      if (idx === rightIndex && pageRight.style.display !== 'none') item.classList.add('active-right');
    });
  }

  // 3. Hoạt ảnh Lật tiến (Flip Next: Lật trang phải sang trái và GIỮ LẠI nó ở bên trái!)
  function flipNext() {
    if (isAnimating) return;
    const total = bookData.pages.length;
    if (rightIndex >= total - 1) return; // Đã ở trang cuối

    isAnimating = true;

    const oldLeft = leftIndex;
    const oldRight = rightIndex;

    // Mục tiêu mới
    let nextLeft, nextRight;
    if (currentMode === 'retain') {
      // CHẾ ĐỘ GIỮ LẠI TRANG VỪA LẬT:
      // Trang vừa lật (oldRight) chuyển sang nằm ở bên trái!
      // Trang mới (oldRight + 1) hiện ra ở bên phải!
      nextLeft = oldRight;
      nextRight = oldRight + 1;
    } else {
      // Chế độ 2 trang truyền thống
      nextLeft = Math.min(oldLeft + 2, total - 2);
      nextRight = nextLeft + 1;
    }

    // 1. Chuẩn bị ảnh cho tấm lật 3D (Flipper Leaf)
    imgFlipperFront.src = bookData.pages[oldRight].image; // Mặt úp xuống khi đang ở bên phải
    imgFlipperBack.src = bookData.pages[oldRight].image;  // Mặt ngửa lên khi lật sang bên trái (chính là trang vừa lật!)

    // 2. Chuẩn bị trang bên phải bên dưới tấm lật sẵn sàng nhận trang mới tiếp theo
    if (nextRight < total) {
      pageRight.style.display = 'block';
      imgRight.src = bookData.pages[nextRight].image;
      badgeTextRight.textContent = `Trang sau: Trang ${bookData.pages[nextRight].pageNumber} (${bookData.pages[nextRight].title})`;
    }

    // 3. Bật âm thanh lật sách chân thực
    window.flipSound.play();

    // 4. Kích hoạt hoạt ảnh CSS 3D
    flipperLeaf.className = 'flipper-leaf flipping-next';

    // 5. Kết thúc hoạt ảnh sau 650ms
    setTimeout(() => {
      leftIndex = nextLeft;
      rightIndex = nextRight;

      flipperLeaf.className = 'flipper-leaf'; // Reset flipper
      updateStaticDisplay();
      isAnimating = false;
    }, 650);
  }

  // 4. Hoạt ảnh Lật lùi (Flip Prev: Lật ngược từ trái sang phải)
  function flipPrev() {
    if (isAnimating) return;
    if (leftIndex <= 0) return; // Đã ở trang đầu

    isAnimating = true;

    const oldLeft = leftIndex;
    const oldRight = rightIndex;

    let prevLeft, prevRight;
    if (currentMode === 'retain') {
      // CHẾ ĐỘ GIỮ LẠI: Lùi 1 trang
      prevLeft = oldLeft - 1;
      prevRight = oldLeft;
    } else {
      // Chế độ 2 trang truyền thống
      prevLeft = Math.max(0, oldLeft - 2);
      prevRight = prevLeft + 1;
    }

    // 1. Chuẩn bị ảnh tấm lật (từ bên trái lật ngược về phải)
    imgFlipperBack.src = bookData.pages[oldLeft].image;
    imgFlipperFront.src = bookData.pages[oldLeft].image;

    // 2. Chuẩn bị trang bên trái bên dưới để đón nhận trang trước đó
    imgLeft.src = bookData.pages[prevLeft].image;
    badgeTextLeft.textContent = `Trang trước: Trang ${bookData.pages[prevLeft].pageNumber} (${bookData.pages[prevLeft].title})`;

    // 3. Bật âm thanh lật giấy
    window.flipSound.play();

    // 4. Kích hoạt hiệu ứng lật lùi 3D
    flipperLeaf.className = 'flipper-leaf flipping-prev';

    // 5. Kết thúc hoạt ảnh
    setTimeout(() => {
      leftIndex = prevLeft;
      rightIndex = prevRight;

      flipperLeaf.className = 'flipper-leaf';
      updateStaticDisplay();
      isAnimating = false;
    }, 650);
  }

  // 5. Nhảy thẳng đến trang bất kỳ
  function jumpToPage(targetIdx) {
    if (isAnimating) return;
    const total = bookData.pages.length;
    targetIdx = Math.max(0, Math.min(targetIdx, total - 1));

    if (currentMode === 'retain') {
      if (targetIdx === total - 1) {
        leftIndex = Math.max(0, total - 2);
        rightIndex = total - 1;
      } else {
        leftIndex = targetIdx;
        rightIndex = Math.min(targetIdx + 1, total - 1);
      }
    } else {
      leftIndex = Math.floor(targetIdx / 2) * 2;
      rightIndex = Math.min(leftIndex + 1, total - 1);
    }

    window.flipSound.play();
    updateStaticDisplay();
  }

  // 6. Mục lục (Table of Contents)
  function renderTOC() {
    tocList.innerHTML = '';
    bookData.pages.forEach((page, index) => {
      const item = document.createElement('div');
      item.className = 'toc-item';
      item.innerHTML = `
        <span class="toc-num">${index + 1}</span>
        <span class="toc-text">${page.title}</span>
      `;
      item.addEventListener('click', () => {
        jumpToPage(index);
        tocDrawer.classList.remove('open');
        btnToc.classList.remove('active');
      });
      tocList.appendChild(item);
    });
    updateActiveSidebarItems();
  }

  // 7. Khay ảnh thu nhỏ (Thumbnails)
  function renderThumbnails() {
    thumbsTray.innerHTML = '';
    bookData.pages.forEach((page, index) => {
      const card = document.createElement('div');
      card.className = 'thumb-card';
      card.innerHTML = `
        <img src="${page.image}" alt="Trang ${index + 1}">
        <span>Trang ${index + 1}</span>
      `;
      card.addEventListener('click', () => {
        jumpToPage(index);
      });
      thumbsTray.appendChild(card);
    });
    updateActiveSidebarItems();
  }

  // 8. Tương tác trực tiếp trên mặt trang sách
  pageRight.addEventListener('click', flipNext);
  pageLeft.addEventListener('click', flipPrev);

  arrowNext.addEventListener('click', flipNext);
  btnNextPage.addEventListener('click', flipNext);

  arrowPrev.addEventListener('click', flipPrev);
  btnPrevPage.addEventListener('click', flipPrev);

  btnFirstPage.addEventListener('click', () => jumpToPage(0));
  btnLastPage.addEventListener('click', () => jumpToPage(bookData.pages.length - 1));

  // 9. Zoom controls
  function applyZoom(delta) {
    if (delta === 0) zoomLevel = 1.0;
    else zoomLevel = Math.min(Math.max(zoomLevel + delta, 0.75), 2.2);
    flipbookStage.style.transform = `scale(${zoomLevel})`;
    btnZoomReset.querySelector('span').textContent = `${Math.round(zoomLevel * 100)}%`;
  }

  btnZoomIn.addEventListener('click', () => applyZoom(0.2));
  btnZoomOut.addEventListener('click', () => applyZoom(-0.2));
  btnZoomReset.addEventListener('click', () => applyZoom(0));

  // 10. Chuyển đổi chế độ (Mode Switching)
  modeRetain.addEventListener('click', () => {
    currentMode = 'retain';
    modeRetain.classList.add('active');
    modeSpread.classList.remove('active');
    updateStaticDisplay();
  });

  modeSpread.addEventListener('click', () => {
    currentMode = 'spread';
    modeSpread.classList.add('active');
    modeRetain.classList.remove('active');
    jumpToPage(leftIndex);
  });

  // 11. Autoplay Slideshow
  btnAutoplay.addEventListener('click', () => {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
      btnAutoplay.classList.remove('active');
    } else {
      btnAutoplay.classList.add('active');
      autoplayTimer = setInterval(() => {
        if (rightIndex >= bookData.pages.length - 1) {
          jumpToPage(0);
        } else {
          flipNext();
        }
      }, 4500);
    }
  });

  // 12. Âm thanh lật sách
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

  // 13. Toàn màn hình
  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // 14. Sidebar drawers
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

  // 15. Google Drive Sync Modal
  btnDriveSync.addEventListener('click', () => {
    driveModal.classList.add('open');
  });

  btnCloseDriveModal.addEventListener('click', () => {
    driveModal.classList.remove('open');
  });

  btnConfirmSync.addEventListener('click', async () => {
    const url = driveApiUrlInput.value.trim();
    if (!url) {
      alert('Vui lòng dán link Google Apps Script Web App của bạn!');
      return;
    }

    btnConfirmSync.disabled = true;
    btnConfirmSync.textContent = 'Đang đồng bộ...';

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.pages && data.pages.length > 0) {
        localStorage.setItem('flipbook_drive_api', url);
        initBook(data);
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
    initBook(localData);
    driveModal.classList.remove('open');
    alert('Đã khôi phục về danh sách ảnh bài học có sẵn trong máy!');
  });

  // 16. Phím tắt bàn phím
  window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT') return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      flipNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      flipPrev();
    } else if (e.key === 'Home') {
      jumpToPage(0);
    } else if (e.key === 'End') {
      jumpToPage(bookData.pages.length - 1);
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

  // Cử chỉ vuốt trên màn hình cảm ứng
  let touchStartX = 0;
  readerContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  readerContainer.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 45) {
      if (diff < 0) flipNext(); // Vuốt sang trái -> xem trang tiếp theo
      else flipPrev(); // Vuốt sang phải -> lùi lại trang trước
    }
  }, { passive: true });

  // Mở khóa âm thanh khi người dùng tương tác lần đầu
  const unlockAudio = () => {
    window.flipSound.init();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);

  // Khởi chạy ứng dụng
  updateSoundIcon();
  const initialData = await loadBookData();
  initBook(initialData);
});
