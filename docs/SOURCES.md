# Nhật ký đối chiếu nguồn

Ngày truy cập: **28/09/2026**. Các đường dẫn đã được mở và đọc nội dung. `verified` là đối chiếu bài nguồn, không đồng nghĩa với đồng thuận học thuật hoặc thẩm định chuyên gia.

| Bản ghi            | Nguồn thực tế                                                                                                      | Phạm vi dùng                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `fact_ao_dai_01`   | [All about ao dai: Vietnam's national dress — Vietnam Tourism](https://vietnam.travel/things-to-do/ao-dai-vietnam) | Vai trò Le Mur Nguyễn Cát Tường trong thập niên 1930, dáng hai tà ôm hơn; không khẳng định một niên đại duy nhất cho toàn bộ áo dài. |
| `fact_ngu_than_01` | [Áo dài ngũ thân — Hành trình trở lại — Bảo tàng Phụ nữ Nam Bộ](https://baotangphunu.com/4266-2/)                  | Năm thân, năm cúc; nguồn có cách diễn giải biểu tượng Nho học, được trình bày như diễn giải của nguồn.                               |
| `fact_ngu_than_02` | Cùng bài Bảo tàng Phụ nữ Nam Bộ                                                                                    | Nguồn đề cập tay thụng và tay hẹp. Không đưa kích thước 30–40 cm hoặc quy định cấm vận động vì chưa đối chiếu được các chi tiết đó.  |
| `caution_quan_dai` | Bài Vietnam Tourism                                                                                                | Cấu trúc áo phối cùng quần; chỉ mô tả cách minh họa trong sản phẩm, không áp đặt quy chế triều Nguyễn cho người dùng hiện nay.       |
| `caution_remix`    | Biên tập của ứng dụng, `editorial`                                                                                 | Phân biệt phối đương đại và hướng dẫn của ban tổ chức. Không gán cho bảo tàng hoặc tài liệu lịch sử.                                 |

## Những thay đổi so với bản nháp

- URL `https://baotangphunu.com/4266-2/` là bài **Áo dài ngũ thân — Hành trình trở lại**, không phải bản trực tuyến của sách _Ngàn năm áo mũ_. Đã sửa tác giả/đơn vị và tên nguồn cho khớp.
- [Trang Hội Liên hiệp Phụ nữ Việt Nam trong bản nháp](https://hoilhpn.org.vn/tin-chi-tiet/-/chi-tiet/lich-su-phat-trien-ao-dai-viet-nam-qua-cac-thoi-ky-35475-4512.html) tồn tại nhưng có chi tiết niên đại/cách trình bày khác các nguồn còn lại. Không dùng để ghép thành một lịch sử chắc chắn duy nhất.
- Bỏ khẳng định gộp “5 thân tượng trưng tứ thân phụ mẫu và ngũ thường” trong catalog. Catalog hiện mô tả cấu trúc, không trộn ý nghĩa của thân áo và cúc áo.
- Bỏ diễn giải màu đỏ “mang lại may mắn” khỏi lời tư vấn thẩm mỹ; không trình bày hiệu quả biểu tượng như sự thật phổ quát.
- Không giữ các trích dẫn chung chung “Quy chuẩn văn hóa trang phục thanh niên”, “Thành đoàn & Bảo tàng Áo dài” hoặc dẫn tên sách mà không có đoạn xác thực cho quy tắc. Không gán nhãn kiểm chứng cho những nội dung này.
- Không đưa ra phán xét phẩm chất, sự tôn nghiêm hay mức độ đúng văn hóa của người mặc dựa vào cách phối.

## Quy trình bổ sung dữ liệu

1. Ghi đúng tên trang, đơn vị phát hành, URL và nội dung cụ thể hỗ trợ khẳng định.
2. Để trạng thái `draft` nếu chưa đọc hoặc nguồn chưa hỗ trợ đầy đủ. Bộ lọc công khai chỉ lấy `verified`.
3. Khi có nhiều quan điểm, nêu rõ phạm vi và chủ thể diễn giải; không trộn các nguồn thành một khẳng định mới.
4. Đối chiếu cùng chuyên gia/người thực hành trước khi sử dụng cho tư vấn nghi lễ hoặc phục dựng.
5. Với ảnh tư liệu mới, kiểm tra quyền sử dụng riêng. Các SVG hiện tại là minh họa được viết trong mã dự án.

Tài liệu kỹ thuật: [Google Gen AI SDK](https://github.com/googleapis/js-genai), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output). Kiểm tra Zod/ID là bước riêng; JSON đúng cấu trúc không đảm bảo mọi lời giải thích của mô hình đúng nội dung.
