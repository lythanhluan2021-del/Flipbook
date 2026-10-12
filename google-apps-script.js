/**
 * GOOGLE APPS SCRIPT CHO WEB APP SÁCH LẬT (FLIPBOOK)
 * --------------------------------------------------
 * HƯỚNG DẪN CÀI ĐẶT:
 * 1. Truy cập https://script.google.com và tạo một "Dự án mới" (New project).
 * 2. Dán toàn bộ nội dung file này vào bộ soạn thảo Code.gs.
 * 3. Thay thế biến FOLDER_ID bằng ID của thư mục chứa ảnh trên Google Drive của bạn.
 *    (ID thư mục là chuỗi ký tự sau "/folders/" trên thanh địa chỉ trình duyệt, ví dụ: 1a2B3c...XYZ)
 * 4. Chia sẻ thư mục Google Drive đó ở chế độ: "Bất kỳ ai có đường liên kết đều có thể xem".
 * 5. Bấm nút "Triển khai" (Deploy) > "Tùy chọn triển khai mới" (New deployment).
 *    - Loại triển khai: Ứng dụng web (Web app).
 *    - Thực thi dưới dạng: Tôi (Me).
 *    - Ai có quyền truy cập: Bất kỳ ai (Anyone).
 * 6. Sao chép "URL ứng dụng web" (kết thúc bằng /exec) và dán vào nút "Đồng bộ Drive" trên Web App sách lật!
 */

var DEFAULT_FOLDER_ID = "DIEN_ID_THU_MUC_GOOGLE_DRIVE_VAO_DAY";

function doGet(e) {
  try {
    var folderId = (e && e.parameter && e.parameter.folderId) ? e.parameter.folderId : DEFAULT_FOLDER_ID;
    var folder = DriveApp.getFolderById(folderId);
    
    var files = folder.getFiles();
    var pages = [];
    var allowedExtensions = ["png", "jpg", "jpeg", "webp"];

    while (files.hasNext()) {
      var file = files.next();
      var fileName = file.getName();
      var ext = fileName.split('.').pop().toLowerCase();

      if (allowedExtensions.indexOf(ext) !== -1) {
        var fileId = file.getId();
        // Link CDN trực tiếp tốc độ cao của Google Drive
        var imageUrl = "https://lh3.googleusercontent.com/d/" + fileId;

        pages.push({
          id: fileId,
          name: fileName,
          title: cleanTitle(fileName),
          image: imageUrl,
          thumbnail: imageUrl
        });
      }
    }

    // Sắp xếp tự nhiên theo tên file (trang 1, trang 2, ..., trang 10)
    pages.sort(function(a, b) {
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Gán lại số trang sau khi sắp xếp
    pages.forEach(function(p, idx) {
      p.pageNumber = idx + 1;
    });

    var result = {
      status: "success",
      bookTitle: folder.getName(),
      totalPages: pages.length,
      pages: pages
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errResult = {
      status: "error",
      message: error.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function cleanTitle(fileName) {
  // Loại bỏ phần mở rộng .png, .jpg...
  var name = fileName.replace(/\.[^/.]+$/, "");
  // Thay thế dấu gạch ngang/dưới bằng khoảng trắng
  name = name.replace(/[_-]/g, " ");
  return name.trim();
}
