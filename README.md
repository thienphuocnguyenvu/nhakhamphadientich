# Nhà khám phá diện tích – Toán lớp 5

Website tiếng Việt dành cho học sinh lớp 5 để tìm hiểu diện tích địa danh ở Việt Nam và thế giới, xem ảnh minh họa, đọc kiến thức ngắn, mở nguồn tham khảo và làm một câu hỏi Toán học.

## Chạy thử

- Mở `index.html` để xem giao diện. Khi mở tệp trực tiếp trên trình duyệt có Internet, website sẽ thử gọi API AI; nếu chưa có máy chủ AI, website chuyển sang tra cứu dự phòng qua Wikipedia/Wikimedia và cung cấp liên kết để kiểm chứng diện tích.
- Chế độ dự phòng có thể lấy phần giới thiệu và hình ảnh, nhưng không bảo đảm bài viết có số liệu diện tích. Khi chưa nhận diện được số liệu, website sẽ ghi “Chưa xác minh được” thay vì đoán. Để có kết quả AI tổng hợp đầy đủ, cần triển khai lên Vercel và cấu hình khóa API.

## Triển khai thành đường link cho học sinh (Vercel)

1. Tạo tài khoản tại https://vercel.com/ nếu chưa có.
2. Đưa toàn bộ thư mục này lên một repository GitHub mới (hoặc dùng tính năng tải dự án lên nếu tài khoản Vercel hỗ trợ).
3. Trong Vercel, chọn **Add New → Project**, nhập repository vừa tạo và bấm **Deploy**.
4. Mở **Project → Settings → Environment Variables**. Thêm biến `OPENAI_API_KEY` với API key của giáo viên/chủ dự án. Có thể thêm `OPENAI_MODEL` với tên model API mà tài khoản của bạn được phép dùng; mặc định dự án dùng `gpt-5.5`.
5. Redeploy sau khi thêm biến môi trường. Vercel sẽ cấp một đường link dạng `https://ten-du-an.vercel.app` để gửi cho học sinh.
6. Mở link trên điện thoại và máy tính để thử các địa danh, kiểm tra nguồn, ảnh và câu hỏi trước khi sử dụng trong lớp.

Tài liệu biến môi trường Vercel: https://vercel.com/docs/environment-variables
Tài liệu OpenAI web search: https://developers.openai.com/api/docs/guides/tools-web-search

## Bảo mật và lưu ý sư phạm

- Tuyệt đối không đặt `OPENAI_API_KEY` trong `index.html` hoặc bất kỳ mã JavaScript nào chạy trên trình duyệt.
- API sử dụng web search để tra cứu và yêu cầu mô hình trả JSON. Dù có nguồn tham khảo, AI vẫn có thể nhầm hoặc chọn số liệu khác nhau; giáo viên cần xác minh số liệu diện tích trước khi đưa vào phiếu học tập/đánh giá.
- Ảnh được tìm từ Wikimedia Commons qua API công khai. Hãy mở trang nguồn để kiểm tra giấy phép và ghi công nếu dùng ảnh trong tài liệu xuất bản.
- Dự án hiện chưa có đăng nhập, lưu lịch sử, lọc truy vấn hay giới hạn chi phí. Nếu mở công khai cho nhiều lớp, nên bổ sung giới hạn lượt gọi/rate limit và kiểm soát chi phí tại máy chủ.
- Không thu thập tên, email, lớp cụ thể hoặc thông tin cá nhân của học sinh. Không gửi khóa API cho học sinh.


## Nếu chưa cấu hình khóa API

Website vẫn có chế độ tra cứu dự phòng qua Wikipedia/Wikimedia khi có Internet. Chế độ này không tương đương AI tìm kiếm: số liệu diện tích phải được đối chiếu với nguồn chính thức qua liên kết tìm kiếm được cung cấp. Nếu cần AI hoạt động trực tiếp, phải deploy backend và đặt `OPENAI_API_KEY` trong biến môi trường Vercel.
