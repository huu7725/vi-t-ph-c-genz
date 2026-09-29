# Việt Phục Remix

**Phối chất riêng, hiểu nét Việt.** Bản demo Audition giúp học sinh, sinh viên khám phá áo dài và áo ngũ thân, thử phối màu/phụ kiện, đọc thông tin văn hóa và lưu lookbook.

Ứng dụng có hai vai trò:

- **Khách trải nghiệm:** tự phối và đọc kiến thức không giới hạn; dùng tối đa 3 lượt gợi ý AI thành công mỗi ngày và lưu tối đa 3 bản phối. Lượt AI làm mới lúc 00:00 theo giờ Việt Nam. Gợi ý mẫu offline không trừ lượt.
- **Thành viên:** đăng ký bằng email, mật khẩu tối thiểu 10 ký tự; có tối đa 100 bản phối trong tủ đồ và không áp giới hạn AI của khách. Tủ đồ được lưu ở backend theo tài khoản.

Khách có thể đăng ký hoặc đăng nhập bất kỳ lúc nào và chọn chuyển các bản phối khách hiện tại vào tài khoản. Hạn mức được kiểm tra ở backend, có chống gửi đồng thời, CSRF token, cookie `HttpOnly` và không lưu mật khẩu thô. Đây là bản demo: chưa có email xác minh, quên mật khẩu, OAuth hoặc hệ thống quản trị tài khoản.

## Chạy nhanh

Yêu cầu **Node.js 22 trở lên**, npm và kết nối mạng cho lần cài thư viện đầu tiên. Không cần Gemini API key để dùng bản demo.

Mở terminal tại thư mục `viet-phuc-remix`:

```powershell
npm install
npm run dev
```

- Giao diện: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:5000>
- Kiểm tra API: <http://127.0.0.1:5000/health>
- Dừng bằng `Ctrl+C` tại terminal chạy dự án.

`npm run dev` khởi động cả frontend và backend. Không cần mở hai terminal. Cổng 5173 và 5000 cần còn trống. Backend tạo SQLite tại `backend/var/remix.sqlite`; thư mục này được bỏ qua bởi Git.

## Bật Gemini

Từ thư mục dự án, sao chép cấu hình mẫu **nếu chưa có** `backend/.env`:

```powershell
Copy-Item backend/.env.example backend/.env
```

Mở `backend/.env` và nhập khóa của bạn vào `GEMINI_API_KEY`. Không nhập khóa vào frontend, không đưa `.env` lên Git. Khởi động lại `npm run dev` sau khi thay cấu hình.

```ini
PORT=5000
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
FRONTEND_URL=http://localhost:5173,http://127.0.0.1:5173
```

Model chính được cấu hình bằng `GEMINI_MODEL` (mặc định `gemini-3.8-flash`); model dự phòng là `GEMINI_FALLBACK_MODEL` (mặc định `gemini-3.1-flash-lite`). Google trả 404 với `gemini-2.5-flash` cho người dùng mới, nên cấu hình mẫu đã được cập nhật. Khóa chỉ nằm trong `backend/.env`, không nằm trong frontend hoặc tệp mẫu.

SDK được nâng lên `@google/genai` 2.x thay vì phiên bản 0.1.1 cũ trong bản nháp. Mã sử dụng `models.generateContent`, JSON response schema và kiểm tra Zod độc lập. Xem [SDK chính thức](https://github.com/googleapis/js-genai) và [structured output](https://ai.google.dev/gemini-api/docs/structured-output).

Khi không có khóa, API lỗi, hết thời gian chờ hoặc phản hồi không hợp lệ, ứng dụng trả **gợi ý mẫu** với nhãn rõ ràng. Nếu backend mất kết nối, frontend vẫn phối đồ thủ công, đọc dữ liệu công khai đi kèm và tạo gợi ý mẫu. Đây không phải ứng dụng PWA: cần tải được trang trước, không đảm bảo mở lại khi toàn bộ máy chủ đã tắt.

## Các chức năng đã triển khai

- Khám phá hai nhóm áo và xem hộp thoại kiến thức có đường dẫn nguồn.
- Chọn ba sự kiện, ba phong cách, 12 màu mẫu và 13 phụ kiện.
- Chọn mẫu Nam/Nữ riêng cho cả áo dài và áo ngũ thân; khuôn mặt, tóc, vai, phom áo và tà áo được minh họa riêng. Lựa chọn được giữ khi gợi ý, lưu, áp dụng lại và so sánh.
- Font Be Vietnam Pro và Noto Serif (cả kiểu nghiêng) được đóng gói cùng ứng dụng với bộ ký tự tiếng Việt, không gọi Google Fonts khi mở trang.
- Mockup SVG phản ánh màu áo, quần và từng phụ kiện; sneakers/guốc thay thế nhau.
- Gợi ý Gemini hoặc tối đa ba phương án mẫu. Bản đầu giữ lựa chọn hiện tại; các bản còn lại đề xuất thay đổi. Những bản giống nhau được gộp.
- Áp dụng gợi ý vào phòng phối đồ, gồm cả sự kiện và phong cách.
- Đăng ký, đăng nhập, đăng xuất, phiên khách và phiên thành viên; mật khẩu băm bằng scrypt, session lưu dạng hash trong SQLite.
- Lưu cả bản tự phối và bản gợi ý; tủ đồ khách/thành viên được phân tách theo actor ở backend. Các bản phối cũ trong localStorage có nút chuyển sang tủ đồ hiện tại.
- Giới hạn khách 3 lượt AI thành công/ngày và 3 bản phối; thành viên 100 bản phối. Lượt AI thất bại hoặc gợi ý mẫu không bị trừ.
- So sánh hai bản; xóa và hoàn tác thao tác xóa gần nhất.
- Xuất lookbook thành JSON. Chưa có chức năng nhập lại hoặc đường dẫn chia sẻ công khai.
- Xử lý dữ liệu lưu hỏng, bộ nhớ trình duyệt không cho ghi, lỗi kết nối, hết hạn phiên và đồng bộ nhiều tab qua `BroadcastChannel`.
- Giao diện thích ứng máy tính/điện thoại; điều hướng bàn phím, tên màu, focus và dialog hỗ trợ Escape.

## Cấu trúc

```text
viet-phuc-remix/
├── backend/
│   ├── src/
│   │   ├── data/
│   │   │   ├── cultureFacts.json
│   │   │   ├── catalog.json
│   │   │   ├── cautionRules.json
│   │   │   └── fallbackLooks.json
│   │   ├── services/geminiService.ts
│   │   ├── routes/recommendRoute.ts
│   │   ├── routes/authRoutes.ts
│   │   ├── routes/lookbookRoutes.ts
│   │   ├── auth.ts
│   │   ├── authStore.ts
│   │   ├── tests/recommendation.test.ts
│   │   ├── tests/auth.test.ts
│   │   ├── domain.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── ExploreSection.tsx
│   │   │   ├── StudioSection.tsx
│   │   │   ├── RecommendationSection.tsx
│   │   │   ├── LookbookSection.tsx
│   │   │   ├── CultureDialog.tsx
│   │   │   └── GarmentMockupSvg.tsx
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── tests/app.spec.ts
├── tests/auth.spec.ts
├── docs/SOURCES.md
├── package.json
├── package-lock.json
├── playwright.config.ts
└── README.md
```

## Kiến trúc và luồng dữ liệu

1. React dùng danh mục công khai đi kèm để mở ngay, sau đó đọc `GET /api/data`.
2. `GET /api/auth/session` tạo một actor khách nếu chưa có cookie; `POST /api/auth/register`, `POST /api/auth/login` và `POST /api/auth/logout` quản lý phiên. Tài khoản dùng cookie HttpOnly, mật khẩu băm scrypt và token CSRF cho mutation.
3. Lựa chọn được lưu ở state của `App`, mockup cập nhật ngay trên trình duyệt.
4. `POST /api/recommend` kiểm tra request bằng Zod: ID, hex, phụ kiện trùng hoặc xung đột. Backend đặt reservation trước khi gọi Gemini để chống dùng vượt lượt đồng thời.
5. Backend lấy các fact đã đối chiếu và đúng trang phục, đưa nội dung cùng nguồn vào ngữ cảnh Gemini.
6. Gemini chỉ trả các lựa chọn phối đồ, lời giải thích thẩm mỹ và ID tham chiếu; không tự cung cấp bài kiến thức văn hóa.
7. Backend kiểm tra JSON, loại áo/sự kiện, ID nguồn, phụ kiện và màu. Bản đầu phải giữ màu/phụ kiện đang chọn. Phản hồi sai được thử lại tối đa một lần; lỗi kết nối chuyển ngay sang mẫu.
8. Lượt thành công được cộng vào `ai_usage` theo ngày Việt Nam; lỗi provider, fallback và request bị từ chối không cộng. Tủ đồ dùng khóa `(actor_id, look_id)` nên tài khoản không đọc/xóa được bản phối của nhau.
9. Nội dung văn hóa hiển thị được ghép nguyên văn từ dữ liệu nguồn. Lưu ý bắt buộc của ứng dụng được gắn thêm độc lập với AI.
10. Tủ đồ máy chủ là nguồn chính; bản sao localStorage cũ chỉ được khôi phục có kiểm tra và chuyển thủ công.

`backend/src/domain.ts` là module thuần dùng chung cho backend và frontend (alias `@domain`). Nó chỉ chứa danh mục công khai, kiểu, schema và xử lý mẫu; **không import SDK, biến môi trường hoặc khóa**. Cách này tránh hai bộ dữ liệu dự phòng bị lệch nhau. Frontend gọi URL tương đối `/api`, Vite proxy tới API khi phát triển.

### API

`GET /api/data` → `{ catalog, cultureFacts, cautionRules }`.

`POST /api/recommend` nhận:

```json
{
  "garmentId": "ao_ngu_than",
  "eventId": "ky_yeu",
  "styleId": "thanh_lich",
  "gender": "nu",
  "primaryColor": "#1E5E58",
  "accentColor": "#FDFBF7",
  "selectedAccessories": ["acc_quat_tre", "acc_sneaker_trang"]
}
```

Trả `{ looks, isFallback, note }`. Mỗi look gồm dữ liệu phối, `source`, tên danh mục và các bản ghi văn hóa/lưu ý đã ghép. Request sai trả JSON với HTTP 400; quá 16 KB trả 413. Không trả lỗi thô hay khóa từ nhà cung cấp.

## Build và kiểm thử

```powershell
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

- `build`: TypeScript backend, TypeScript frontend và Vite production build.
- `test`: kiểm tra 18 tổ hợp trang phục/sự kiện/phong cách, validation, nguồn sai, đường Gemini mô phỏng, retry/fallback, khôi phục lookbook, HTTP, đăng ký/đăng nhập, băm mật khẩu, tách tài khoản, giới hạn 3 lượt/ngày, chống race condition, CSRF và reset ngày Việt Nam.
- `test:e2e`: Chromium ở kích thước desktop và điện thoại; chọn màu/phụ kiện, nguồn văn hóa, lưu/tải lại/so sánh/xóa/hoàn tác, gợi ý mẫu, xuất JSON, mất kết nối, đăng ký/đăng nhập, chuyển tủ đồ khách và giới hạn AI.
- Các test không gọi Gemini thật, không phát sinh chi phí API. Khi chạy E2E, backend cần ở chế độ không khóa như bản demo mặc định.
- Ảnh chụp kiểm tra nằm trong `test-results/`, thư mục này được bỏ qua bởi Git.

Để chạy bản đã build, dừng `npm run dev` rồi chạy:

```powershell
npm start
```

Mở <http://127.0.0.1:5000>. Express phục vụ cả frontend đã build và API. Backend chỉ lắng nghe loopback để dùng demo trên máy; chưa cấu hình phát hành công khai. Khi phát hành thật cần HTTPS, đặt `COOKIE_SECURE=true`, giới hạn `FRONTEND_URL` về origin thực, backup SQLite, email xác minh/reset mật khẩu và một reverse proxy có rate limit.

## Nội dung văn hóa và giới hạn

Xem [nhật ký đối chiếu nguồn](docs/SOURCES.md). Nhãn `verified` chỉ có nghĩa đã đối chiếu nội dung cụ thể với trang được dẫn vào ngày ghi trong dữ liệu; **chưa được chuyên gia thẩm định**. Nội dung ban đầu có những trích dẫn không trùng trang nguồn và nhận định quá rộng; bản này đã thu hẹp các khẳng định và sửa tên nguồn.

Gợi ý phối đương đại là ý tưởng thẩm mỹ, không phải phục dựng. SVG là hình vẽ gốc trong dự án, không thể hiện chính xác kỹ thuật may năm thân hoặc độ vừa cơ thể. Chưa có thử đồ bằng ảnh người thật, thông tin thời tiết, OAuth, email xác minh/reset mật khẩu, đồng bộ đám mây hoặc mạng xã hội. Gemini vẫn có thể tạo lời giải thích thẩm mỹ chưa phù hợp; không nên coi AI là người thẩm định văn hóa.

## Kịch bản demo 3 phút

**0:00–0:30 — Vấn đề.** “Khi chuẩn bị kỷ yếu hoặc ngày hội văn hóa, chúng mình muốn mặc Việt phục nhưng chưa biết phối màu, chọn phụ kiện và tìm thông tin ở đâu. Việt Phục Remix giúp thử phối và đọc kiến thức có nguồn ngay trong một luồng.”

**0:30–1:00 — Khám phá.** Mở trang chủ, chọn câu chuyện của áo ngũ thân. Chỉ ra đường dẫn Bảo tàng Phụ nữ Nam Bộ và giải thích rằng mockup là minh họa, không phải phục dựng.

**1:00–1:45 — Tự phối.** Vào phòng phối đồ, chọn ngày hội văn hóa, phong cách trẻ trung. Đổi màu áo sang đỏ gạch, thử quạt/kính/túi, thay sneakers bằng guốc. Chỉ ra màu và phụ kiện thay đổi trực tiếp. Lưu bản tự phối.

**1:45–2:20 — Gợi ý.** Bấm “Gợi ý cùng Gemini”. Nếu chưa cấu hình khóa, nói rõ đây là gợi ý mẫu. Khi có khóa, giải thích Gemini nhận danh mục cùng ngữ cảnh nguồn; backend kiểm tra ID trước khi hiển thị. Áp dụng một phương án và lưu.

**2:20–2:50 — Lookbook.** Chọn hai bản để so sánh, đọc sự kiện/phụ kiện, thử tải lại trang để thấy dữ liệu còn lưu. Có thể xuất JSON để giữ bản sao.

**2:50–3:00 — Giá trị.** “Chúng mình muốn người trẻ thử phong cách của riêng mình, đồng thời có một điểm bắt đầu đáng tin cậy để tìm hiểu trang phục Việt.”


## Mẫu Nam/Nữ và tương thích dữ liệu

`gender` nhận `nam` hoặc `nu`. Nếu request hoặc bản phối cũ thiếu trường này, ứng dụng dùng mẫu Nữ. ID bản phối Nữ giữ thuật toán cũ để các bản đã lưu vẫn đọc/xóa được; mẫu Nam có ID riêng dù chọn cùng màu và phụ kiện. Backend kiểm tra lựa chọn, chuyển vào ngữ cảnh Gemini, ghép vào gợi ý dự phòng và lưu trong dữ liệu JSON của bản phối. Không cần xóa hoặc tạo lại SQLite.

Hai mẫu là minh họa thời trang, không phải mẫu rập hay cam kết phục dựng lịch sử. Áo dài minh họa tà trước liền và quần dài phía trong; áo ngũ thân dùng phom rộng hơn cùng năm khuy. Màu sắc/phụ kiện không bị giới hạn theo mẫu.

`tests/models.spec.ts` kiểm tra tải font thường/nghiêng có dấu, tiêu đề không tràn ở 320/390/820/1440 px, bốn phom áo khác nhau và việc giữ mẫu qua AI giả lập, lưu, mở lại, so sánh. Các test dùng máy chủ riêng và không gọi Gemini thật.

Nguồn font: [Be Vietnam Pro](https://github.com/bettergui/BeVietnamPro), [Noto Serif](https://github.com/notofonts/latin-greek-cyrillic), phân phối qua Fontsource theo SIL Open Font License. Bản giấy phép nằm trong `docs/licenses/`.


## Kết nối Gemini đã xác nhận

Ngày 29/09/2026 đã kiểm tra qua chính endpoint `/api/recommend`: `gemini-3.8-flash` trả ba bản phối hợp lệ cho mẫu nam, `isFallback=false`, mọi bản có `source=gemini`, thời gian khoảng 9 giây. Phiên khách kiểm tra được cộng đúng một lượt AI. Đây là kết quả tại thời điểm kiểm tra, không phải cam kết độ trễ hoặc khả năng sẵn sàng của nhà cung cấp.

Khi model chính không còn khả dụng (404), bị giới hạn (429), quá tải (5xx) hoặc timeout, backend thử model dự phòng một lần. Nếu cần sửa JSON, dùng lại model vừa phản hồi thành công. Mỗi lệnh gọi bị giới hạn 12 giây, cả chuỗi dùng chung hạn 25 giây, thấp hơn timeout 29 giây của trình duyệt. SDK không tự lặp lại 5 lần bên ngoài kiểm soát này. Lỗi xác thực không thử chuyển model.

Nếu cả hai model không trả được gợi ý, giao diện hiển thị lý do an toàn cùng gợi ý mẫu; không tiết lộ khóa/lỗi thô và không trừ lượt AI. Kiểm thử tự động dùng dữ liệu giả lập, không sử dụng khóa trong `.env`.


## Địa chỉ frontend và đăng nhập local

Cấu hình `FRONTEND_URL` nhận danh sách origin cách nhau bởi dấu phẩy. Khi phát triển local, backend nhận cả `localhost` và `127.0.0.1` của cùng giao thức/cổng, kể cả khi tệp cấu hình cũ chỉ ghi một trong hai. Dấu `/` cuối origin được chuẩn hóa. Ở production (`NODE_ENV=production`), chỉ các origin khai báo rõ ràng được đưa vào danh sách cho phép; không tự thêm alias. CSRF token, SameSite cookie và kiểm tra nguồn yêu cầu vẫn được giữ.

Đã xác nhận lỗi cũ: `FRONTEND_URL=http://localhost:5173` khiến yêu cầu từ `http://127.0.0.1:5173` qua Vite bị trả `403 ORIGIN_REJECTED` trước bước đăng nhập/đăng ký. Bản sửa có kiểm thử hồi quy cho cấu hình cũ, đường dẫn qua proxy, origin giả mạo và production. Hai địa chỉ có cookie riêng; tài khoản thành viên được dùng chung trong SQLite và có thể đăng nhập trên cả hai.

Ngày 29/09/2026 đã đăng ký tài khoản kiểm tra qua frontend local, đối chiếu hàng dữ liệu thật trong `backend/var/remix.sqlite`, đăng xuất và đăng nhập lại thành công từ cả hai địa chỉ. Tài khoản kiểm tra và các phiên của nó đã được dọn sau kiểm thử; dữ liệu người dùng được giữ nguyên.


## Phối màu linh hoạt và phụ kiện

Phần màu có 12 màu gợi ý, bộ chọn màu tự do và ô mã HEX cho từng màu áo/quần. Nhập đủ 6 ký tự HEX (có thể kèm #) rồi nhấn Enter hoặc “Áp dụng”; dữ liệu được chuẩn hóa thành #RRGGBB. Mã không hợp lệ hiện hướng dẫn và không thay màu đang dùng. Có nút đổi màu áo–quần, phối đồng màu và 6 bảng màu để thử nhanh. Màu tùy chọn được giữ khi lưu, mở lại, xuất lookbook hoặc dùng làm đầu vào Gemini.

Danh mục có 13 phụ kiện, gồm 5 món mới: bông tai ngọc trai, vòng tay bạc, kẹp tóc hoa, chuỗi ngọc trai và túi đeo chéo mini. Mỗi món có hình SVG riêng cho cả mẫu nam/nữ. Giày/guốc, kiềng/chuỗi ngọc và túi cói/túi đeo chéo là các nhóm thay thế nhau: frontend đổi lựa chọn cùng nhóm, backend kiểm tra tương ứng và prompt AI nhận danh sách nhóm. Có thể bỏ chọn toàn bộ phụ kiện bằng một nút.

Mẫu nữ giữ tóc layer nâu trầm, mái ôm mặt, đôi mắt rõ hơn, màu môi nhẹ và góc nghiêng đầu. Theo lựa chọn mới, `acc_non_la` trở lại là **Nón lá cầm tay** ở bên dưới để không che khăn vấn. Quai nón nối với bàn tay; khi có quạt, nón dịch xuống để cả hai cùng hiện. ID phụ kiện giữ nguyên nên bản phối cũ tự dùng vị trí mới mà không cần chuyển dữ liệu.

`tests/styling.spec.ts` kiểm tra mã HEX hợp lệ/sai, đổi màu, bảng màu, phụ kiện mới, nhóm thay thế nhau, vị trí nón, gợi ý giả lập và lưu/mở lại bản phối có hơn 8 phụ kiện. Các luồng này dùng máy chủ kiểm thử riêng, không gọi Gemini thật.


## Hoa văn nét viền và Gemini

Trong phòng phối đồ, mục “Vẽ chất riêng lên nếp áo” có các mẫu: cành lá, hoa sen, rồng, phượng, mây cuộn, trúc và không hoa văn. Có thể chọn giữa thân, dọc tà hoặc viền gấu, đổi màu nét, chỉnh kích thước, độ dày và độ đậm. Các mẫu mang tính minh họa sáng tạo đương đại, không phải tư liệu phục dựng hoặc xác nhận quy chế sử dụng lịch sử.

Nhập mô tả từ 5–400 ký tự rồi chọn **Vẽ hoa văn bằng AI**. Gemini trả một họa tiết nét viền riêng; xem trước rồi bấm **Áp dụng hoa văn**. Ví dụ: “Hoa sen kết hợp mây cuộn ở hai bên, nét thanh mảnh, bố cục đối xứng để viền tà áo”. Tạo thành công dùng 1 lượt trong hạn mức AI hiện có của khách (chung với gợi ý phối đồ). Lỗi kết nối hoặc dữ liệu không hợp lệ không trừ lượt; mẫu đang dùng được giữ nguyên.

Backend bổ sung `POST /api/patterns/generate`, yêu cầu session cookie và CSRF token giống các thao tác khác. Gemini trả JSON `{ name, paths }`, tối đa 16 nét và 6.000 ký tự hình học. Bộ kiểm tra chỉ nhận các lệnh tuyệt đối `M/L/Q/C/Z` đúng số tham số, tọa độ 0–100; từ chối markup, URL, script, CSS, tọa độ ngoài khung và dữ liệu quá lớn. React dựng từng `<path>` với `fill=none`; không chèn HTML/SVG thô từ mô hình. Họa tiết được giới hạn trong thân áo bằng clipPath.

`pattern` được lưu cùng bản phối trong SQLite và đi qua gợi ý, xuất JSON, mở lại, so sánh. Bản cũ thiếu `pattern` được gán cành lá mặc định và giữ ID cũ. Không cần xóa/tạo lại cơ sở dữ liệu. Phần JSON path dài chỉ được gửi đến API tạo hoa văn và lưu lookbook; gợi ý trang phục nhận mô tả tóm tắt, sau đó backend giữ nguyên họa tiết người dùng đã chọn.

Đã gọi Gemini thật qua endpoint ứng dụng ngày 29/09/2026: mẫu **Sen Nở Vân Mây**, 11 nét, khoảng 6 giây, trừ đúng 1 lượt. Nét vẽ trả về được lưu tại `docs/examples/gemini-line-motif.json`; thời gian phụ thuộc dịch vụ. Kiểm thử tự động dùng provider giả lập và SQLite riêng, không gọi API thật.


## Trang trí trực tiếp trên mẫu áo

Trong phòng phối đồ, bấm **Trang trí trực tiếp** cạnh mẫu hoặc **Mở trình trang trí** ở phần hoa văn. Cửa sổ riêng cho phép:

1. Chọn họa tiết, chạm/click vào phần vải áo để đặt; hỗ trợ cả thân và tay áo.
2. Chọn **Chọn & kéo** để di chuyển. Kéo nút vuông đổi kích thước, nút tròn để xoay; có thanh trượt tương ứng.
3. Đổi màu, độ đậm, độ dày nét cho từng họa tiết; nhân bản, xóa, hoàn tác và làm lại.
4. Bấm **Áp dụng bố cục**, sau đó **Lưu bản phối này**. Hủy/Escape không thay bố cục đã áp dụng.

Bố cục mẫu cũ được chuyển thành các họa tiết độc lập khi mở trình chỉnh. Hoa văn Gemini có thể đặt nhiều lần và phối cùng các mẫu có sẵn. Mẫu AI chỉ lưu một bộ nét trong `pattern.assets`; từng họa tiết tham chiếu bằng ID. Dữ liệu vị trí dùng tọa độ SVG 320×520 nên không lệch theo kích thước màn hình. Pointer events hỗ trợ chuột và chạm, pointer capture giữ thao tác kéo; không cho đặt tâm họa tiết ngoài vải. ClipPath giới hạn nét vẽ trong thân và tay áo. Phím mũi tên dịch chuyển 2 đơn vị (Shift: 10); Delete/Backspace xóa; Ctrl/Cmd+Z hoàn tác (thêm Shift để làm lại).

Giới hạn: 24 họa tiết và 4 mẫu riêng (AI hoặc tự vẽ), tổng cấu hình tối đa 10.000 ký tự. Backend kiểm tra ID duy nhất, asset hợp lệ, tọa độ, scale, rotation và giới hạn trước khi lưu SQLite. Bản phối cũ vẫn đọc được, gợi ý AI giữ nguyên bố cục tự trang trí. Có thể mở bảng “Tự vẽ họa tiết mới” ngay trong trình trang trí để tạo mẫu nét tay rồi đặt lên áo.


## Tự vẽ họa tiết bằng tay

Bấm **Tự vẽ họa tiết** trong phần hoa văn, hoặc **Tự vẽ họa tiết của bạn** cạnh mẫu áo. Trong trình trang trí trực tiếp cũng có nút **Tự vẽ họa tiết mới** để không mất bố cục đang chỉnh.

- Dùng chuột, bút cảm ứng hoặc ngón tay: giữ và kéo để vẽ, nhấc tay để kết thúc nét.
- Đặt tên, đổi màu và độ dày cho toàn bộ họa tiết. Bật/tắt lưới căn nét. Nét sáng được xem trên nền tối cho dễ nhìn; nền/lưới không đưa lên áo.
- **Xóa nét** bỏ trọn nét được chạm; **Xóa toàn bộ nét**, hoàn tác/làm lại và Ctrl/Cmd+Z cũng được hỗ trợ.
- **Dùng họa tiết này** áp dụng vào áo hoặc đưa vào thư viện của trình trang trí. Sau đó đặt, kéo, xoay, đổi cỡ và lưu bản phối vào SQLite.
- Hủy bảng vẽ giữ nguyên bản phối và bố cục trước đó. Thao tác vẽ tay không gọi Gemini, không trừ lượt AI.

Nét vẽ được chuyển sang đường SVG tuyệt đối M/L/Q trong khung 0–100, làm mượt và rút gọn điểm. Mỗi mẫu tối đa 16 nét, mỗi nét tối đa 900 ký tự, toàn bộ tối đa 6.000 ký tự theo schema hiện có. Không lưu ảnh raster hoặc mã SVG thô. Schema của backend tiếp tục kiểm tra dữ liệu trước khi lưu; bản phối cũ vẫn dùng được. Bộ kiểm thử kiểm tra hình học hữu hạn, nét dài, biên khung, hoàn tác/làm lại, xóa nét, áp dụng màu/độ dày, lưu/mở lại và vẽ bên trong dialog trang trí.
