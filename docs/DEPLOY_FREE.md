# Deploy miễn phí bằng Render

Repository này có `render.yaml` cho hai service:

- `viet-phuc-remix-api`: Node.js + Express API.
- `viet-phuc-remix-web`: React/Vite static site. Rule `/api/*` rewrite tới API để frontend dùng cookie đăng nhập same-origin.

## Giới hạn của gói miễn phí

Render có web service và static site miễn phí, phù hợp cho demo/hobby. Web service miễn phí có thể sleep khi không có traffic. Backend hiện dùng SQLite tại `backend/var/remix.sqlite`; filesystem của free service không phải nơi lưu trữ bền vững. Tài khoản, tủ đồ và lượt AI có thể mất khi service bị redeploy hoặc filesystem bị thay mới.

Bản deploy miễn phí vẫn chạy đầy đủ chức năng. Để dữ liệu tồn tại lâu dài, cần chuyển `AuthStore` sang database cloud như Render Postgres/Neon/Supabase hoặc Turso. Không chỉ đổi `DATABASE_PATH` là đủ vì SQLite local không kết nối trực tiếp tới Postgres/Turso.

## Cách deploy

1. Tạo **API key mới** trong Google AI Studio. Khóa đã từng xuất hiện trong lịch sử hội thoại nên không nên dùng lại khi phát hành công khai.

2. Mở [Render](https://render.com), đăng nhập bằng GitHub và chọn **New → Blueprint**. Chọn repository `huu7725/vi-t-ph-c-genz` và branch `main`.

3. Render đọc `render.yaml`. Khi được hỏi secret, nhập khóa mới vào `GEMINI_API_KEY`. Không commit khóa vào GitHub.

4. Deploy. Hai địa chỉ dự kiến là:
   - `https://viet-phuc-remix-api.onrender.com/health`
   - `https://viet-phuc-remix-web.onrender.com/`

   Nếu Render báo tên service đã tồn tại hoặc sinh hostname khác, đổi tên service trong Dashboard rồi sửa:
   - `FRONTEND_URL` của API thành URL static site thật.
   - Destination rewrite `/api/*` của static site thành URL API thật.

5. Kiểm tra API:

```powershell
Invoke-RestMethod https://viet-phuc-remix-api.onrender.com/health
```

Kết quả cần có `status: "OK"` và `geminiConfigured: true`.

6. Mở static site, vào **Phòng phối đồ**, bấm **Gợi ý cùng Gemini**, sau đó thử đăng ký tài khoản. Nếu backend vừa sleep, request đầu tiên có thể mất vài chục giây; thử lại sau khi service thức dậy.

## Nếu tạo service thủ công

API web service:

- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`
- Plan: `Free`
- Environment: `NODE_VERSION=22`, `NODE_ENV=production`, `COOKIE_SECURE=true`, `GEMINI_MODEL=gemini-3.8-flash`, `GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite`, `GEMINI_API_KEY=<secret mới>`, `FRONTEND_URL=<URL static site>`.

Static site:

- Root Directory: repository root (`.`)
- Build Command: `npm install && npm run build -w frontend`
- Publish Directory: `frontend/dist`
- Rewrite `/api/*` → `https://<api-service>.onrender.com/api/*`.
- Rewrite `/*` → `/index.html`.

Render hỗ trợ rewrite destination là URL public đầy đủ; rewrite giữ nguyên URL trên trình duyệt. Cấu hình này giúp frontend gọi `/api` same-origin và dùng cookie HttpOnly.

## Kiểm tra lỗi thường gặp

**`Yêu cầu không đến từ ứng dụng`**

Kiểm tra `FRONTEND_URL` đúng origin static site, không có đường dẫn phía sau. Nếu mở bằng `www`, phải thêm đúng origin `https://www...`; `localhost` và `127.0.0.1` chỉ dành cho local.

**Frontend mở được nhưng `/api` 404**

Kiểm tra rewrite `/api/*` của static site và URL API. Mở trực tiếp `/health` để tách lỗi API khỏi lỗi rewrite.

**Gemini hiện gợi ý mẫu**

Kiểm tra `GEMINI_API_KEY` ở API service, không phải static site. Xem log API và kiểm tra `health.geminiConfigured`. Model mặc định là `gemini-3.8-flash`; model dự phòng là `gemini-3.1-flash-lite`.

**Đăng nhập mất sau restart**

Đây là giới hạn SQLite trên filesystem ephemeral của free web service. Tính năng chạy đúng; dữ liệu bền vững cần database cloud và migration `AuthStore`.

## Nguồn chính thức

- [Render deploy miễn phí](https://render.com/docs/free)
- [Render web services](https://render.com/docs/web-services)
- [Render static sites](https://render.com/docs/static-sites)
- [Render redirects và rewrites](https://render.com/docs/redirects-rewrites)
- [Render Blueprint specification](https://render.com/docs/blueprint-spec)
- [Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key)
