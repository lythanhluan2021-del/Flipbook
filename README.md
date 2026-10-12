# 📖 Digital Flipbook - Sách Lật Điện Tử Thông Minh

Ứng dụng Web Sách Lật (Flipbook) tương tác 3D/2D dành cho bài giảng và tài liệu học tập, hỗ trợ cơ chế đối chiếu **Trang trước & Trang sau**, âm thanh lật giấy chân thực và đồng bộ dữ liệu tự động từ **Google Drive**.

![Demo Badge](https://img.shields.io/badge/Status-Active-brightgreen)
![Tech Stack](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue)
![Platform](https://img.shields.io/badge/Sync-Google%20Drive%20API-orange)

---

## ✨ Tính Năng Nổi Bật

1. **Hiệu ứng lật sách 3D giữ lại trang trước & trang sau**:
   - Khác với sách thông thường bị mất trang cũ khi lật, ứng dụng hỗ trợ chế độ **Đối chiếu (Retain View)**: Trang vừa lật được giữ lại ở bên trái, trang mới kế tiếp mở ra ở bên phải giúp học sinh và người học dễ dàng theo dõi mạch kiến thức liên tục.
   - Có tùy chọn chuyển đổi linh hoạt giữa chế độ **Giữ trang đối chiếu** và **Lật 2 trang truyền thống**.
2. **Âm thanh giở sách chân thực (Web Audio API)**:
   - Tự động phát âm thanh sột soạt nhẹ như giở sách giấy mỗi khi chuyển trang, hoàn toàn bằng thuật toán tổng hợp âm thanh đa dải tần (không lo lỗi thiếu file audio).
3. **Bộ công cụ đọc sách toàn diện**:
   - 📑 **Mục lục bài học (Table of Contents)**: Thanh trượt bên hông truy cập nhanh mọi bài học.
   - 🖼️ **Khay trang thu nhỏ (Thumbnails)**: Xem trước và chuyển trang tức thì.
   - 🔍 **Phóng to / Thu nhỏ (Zoom)**: Phóng to đến 220% để xem chi tiết sơ đồ, hình ảnh.
   - ▶️ **Tự động lật sách (Slideshow)**: Tự động chuyển bài học sau mỗi 4.5 giây.
   - ⛶ **Toàn màn hình (Fullscreen)** & Cử chỉ vuốt chạm trên thiết bị di động (Mobile Touch Swipe).
4. **Đồng bộ tự động từ Google Drive**:
   - Sử dụng Google Apps Script làm API nhẹ không tốn phí.
   - Tự động quét thư mục ảnh trên Drive, sắp xếp trang và cập nhật nội dung tức thời khi bấm **"Đồng bộ Drive"**.

---

## 🚀 Hướng Dẫn Chạy Cục Bộ (Local)

### Yêu cầu:
- Đã cài đặt [Node.js](https://nodejs.org/) (phiên bản bất kỳ).

### Các bước:
1. Mở cửa sổ dòng lệnh (Terminal/PowerShell) tại thư mục dự án:
   ```bash
   node server.js
   ```
2. Mở trình duyệt web và truy cập:
   ```text
   http://localhost:3000
   ```

---

## ☁️ Hướng Dẫn Kết Nối Tự Động Từ Google Drive

1. Mở [Google Apps Script](https://script.google.com/) và tạo một dự án mới.
2. Sao chép toàn bộ mã nguồn trong tệp [`google-apps-script.js`](./google-apps-script.js) và dán vào dự án.
3. Thay thế biến `DEFAULT_FOLDER_ID` bằng ID thư mục Google Drive chứa ảnh của bạn.
4. Đảm bảo thư mục Google Drive được cài đặt chế độ chia sẻ: **"Bất kỳ ai có đường liên kết đều có thể xem"**.
5. Bấm **Triển khai (Deploy)** > **Tùy chọn triển khai mới (New deployment)**:
   - Loại: **Ứng dụng web (Web app)**
   - Thực thi dưới dạng: **Tôi (Me)**
   - Ai có quyền truy cập: **Bất kỳ ai (Anyone)**
6. Sao chép liên kết Web App (có đuôi `/exec`), mở Web App Flipbook và dán vào hộp thoại **"Đồng bộ Drive"** rồi bấm **Lưu & Đồng bộ ngay**.

---

## 📁 Cấu Trúc Dự Án

```text
├── public/
│   ├── index.html            # Giao diện chính của ứng dụng
│   ├── style.css             # Hiệu ứng 3D, kiểu dáng hiện đại & responsive
│   ├── app.js                # Điều khiển lật trang, zoom, phím tắt & đồng bộ Drive
│   ├── sound.js              # Bộ tổng hợp âm thanh lật giấy Web Audio API
│   ├── books-data.json       # Cấu hình danh mục trang và metadata
│   ├── images/               # Thư mục ảnh trang bài học (page-01.png -> page-08.png)
│   └── lib/
│       └── page-flip.browser.js
├── server.js                 # HTTP Server Node.js thuần (không cần dependencies)
├── google-apps-script.js     # Script tích hợp đồng bộ tự động Google Drive
├── .gitignore
└── README.md
```

---

## ⌨️ Phím Tắt Bàn Phím

- `→` / `Space` / `PageDown`: Trang sau
- `←` / `PageUp`: Trang trước
- `Home`: Về trang đầu
- `End`: Đến trang cuối
- `M`: Bật / Tắt âm thanh
- `F`: Chế độ toàn màn hình
- `Esc`: Thoát phóng to / Đóng bảng mục lục
