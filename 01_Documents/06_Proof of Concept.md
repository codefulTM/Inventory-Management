# 06. Proof of Concept (PoC)

Tài liệu này ghi nhận các tính năng đã được kiểm chứng qua Proof of Concept trong hệ thống Inventory Management.

---

## Danh sách các PoC đã thực hiện

### 1. PoC Authentication với Keycloak
- **Mục tiêu:** Kiểm chứng khả năng xác thực người dùng với Keycloak, OAuth2/OIDC
- **Trạng thái:** ✅ Hoàn thành
- **Chi tiết:** Xem [Phần I - PoC Authentication](#phần-i---poc-authentication)

### 2. PoC AI Analysis cho Quality Control
- **Mục tiêu:** Kiểm chứng khả năng sử dụng AI (HuggingFace) để phân tích kết quả kiểm định chất lượng
- **Trạng thái:** ✅ Hoàn thành
- **Chi tiết:** Xem tài liệu riêng tại `02_Source/05_Proof of Concept/AI_ANALYSIS_GUIDE.md`

### 3. PoC Barcode & QR Code
- **Mục tiêu:** Kiểm chứng khả năng tạo, lưu trữ và tra cứu mã Barcode và QR Code
- **Trạng thái:** ✅ Hoàn thành
- **Chi tiết:** Xem [Phần II - PoC Barcode & QR Code](#phần-ii---poc-barcode--qr-code)

---

# Phần I - PoC Authentication

## 1. Mục tiêu của Proof of Concept
Mục tiêu của Proof of Concept (PoC) này là kiểm chứng tính khả thi về mặt kỹ thuật của **tính năng authentication** trong hệ thống **Inventory Management**.

Cụ thể, nhóm muốn trả lời các câu hỏi sau:
- Tính năng này có thể được hiện thực hóa bằng công nghệ đã lựa chọn hay không?
- Những khó khăn, rủi ro kỹ thuật chính là gì?
- Giải pháp đề xuất có đáp ứng được yêu cầu cốt lõi hay không?

---

## 2. Mô tả tính năng cần kiểm chứng
### 2.1. Tên tính năng
- **Authentication cho hệ thống Inventory Management**

### 2.2. Mô tả ngắn gọn
[Tính năng làm gì? Ai sử dụng? Kết quả mong muốn là gì?]
- Tính năng authentication là quá trình kiểm tra và xác nhận danh tính của người dùng khi họ truy cập vào hệ thống. Cụ thể, hệ thống sẽ yêu cầu người dùng cung cấp thông tin đăng nhập (ví dụ: tên đăng nhập và mật khẩu), sau đó kiểm tra thông tin này với dữ liệu đã lưu trữ để xác định người dùng có hợp lệ hay không. Nếu xác thực thành công, người dùng sẽ được phép truy cập vào các chức năng của hệ thống; nếu không, truy cập sẽ bị từ chối.

- Tính năng authentication này sẽ được sử dụng bởi tất cả người dùng của hệ thống Inventory Management, bao gồm Manager, Quality Control Technician, Operator, IT Administrator. Kết quả mong muốn là đảm bảo rằng chỉ những người dùng hợp lệ mới có thể truy cập vào hệ thống, từ đó bảo vệ dữ liệu và tài nguyên quan trọng khỏi các truy cập trái phép.

### 2.3. Lý do tính năng này khó về mặt kỹ thuật
Tính năng này được đánh giá là khó về mặt kỹ thuật do:
- Cần xử lý bất đồng bộ, ví dụ như xác thực qua nhiều bước hoặc tích hợp xác thực đa yếu tố (MFA), có thể phải xử lý real-time giữa client và server.
- Phải đồng bộ dữ liệu người dùng giữa nhiều thành phần (ví dụ: nhiều server, microservices, hoặc tích hợp với hệ thống bên ngoài như LDAP, OAuth).
- Yêu cầu hiệu năng cao và độ trễ thấp để đảm bảo trải nghiệm người dùng, đặc biệt khi số lượng người dùng lớn hoặc truy cập đồng thời.
- Đảm bảo an toàn bảo mật: phải mã hóa mật khẩu, bảo vệ khỏi các tấn công như brute-force, SQL injection, session hijacking, v.v.
- Công nghệ xác thực hiện đại (OAuth2, JWT, SSO, v.v.) có thể còn mới với nhóm, đòi hỏi phải học hỏi và thử nghiệm.
- Xử lý các trường hợp lỗi, phục hồi khi xác thực thất bại hoặc hệ thống xác thực bên ngoài không phản hồi.

---

## 3. Phạm vi Proof of Concept
PoC **chỉ tập trung kiểm chứng khả năng hoạt động cốt lõi**, không bao gồm:
- Giao diện người dùng hoàn chỉnh
- Bảo mật, phân quyền
- Tối ưu hiệu năng ở quy mô lớn
- Kiểm thử toàn diện

---

## 4. Công nghệ và công cụ sử dụng
- Ngôn ngữ lập trình: Typescript
- Framework / Thư viện: React cho frontend, NestJS cho backend
- Cơ sở dữ liệu: MongoDB

---

## 5. Hiện thực PoC bằng mã nguồn
### 5.1. Kiến trúc tổng quan
```less
[ReactJS]  ──(OAuth2/OIDC)──>  [Keycloak]
    |                              |
    |<─ Access Token (JWT) ────────|
    |
    └── gọi API ───────────────> [NestJS]
                                     |
                                     └── MongoDB (user profile, business data)
```
- Những lưu ý chính:
    - Keycloak xử lý đăng ký / đăng nhập / mật khẩu / refresh token
    - Keycloak cấp Access Token (dạng JWT) cho frontend (ReactJS)
    - Backend KHÔNG tự xác thực username/password
    - MongoDB KHÔNG lưu password, chỉ lưu thông tin mở rộng của user

### 5.2. Các bước thực hiện chi tiết

1. **Cài đặt và cấu hình Keycloak**
        - Cài đặt Keycloak server (có thể dùng Docker hoặc bản cài đặt chính thức).
      
            **Hướng dẫn cài đặt Keycloak bằng Docker Compose:**
            1. Tạo file `docker-compose.yml` với nội dung:
                 ```yaml
                 version: '3'
                 services:
                     keycloak:
                         image: quay.io/keycloak/keycloak:latest
                         ports:
                             - "8081:8080"
                         environment:
                             KEYCLOAK_ADMIN: admin
                             KEYCLOAK_ADMIN_PASSWORD: admin
                         command: start-dev
                 ```
            2. Chạy lệnh sau trong thư mục chứa file `docker-compose.yml`:
                 ```sh
                 docker compose up -d
                 ```
            3. Truy cập Keycloak tại địa chỉ http://localhost:8081 với tài khoản admin/admin.
    - Tạo Realm mới cho hệ thống Inventory Management. **Realm** là một không gian quản lý độc lập trong Keycloak, nơi bạn có thể định nghĩa các user, role, client, v.v. Realm giúp tách biệt các hệ thống hoặc môi trường xác thực khác nhau trên cùng một Keycloak server.
        **Các bước tạo Realm mới:**
        1. Đăng nhập vào giao diện quản trị Keycloak tại http://localhost:8081 bằng tài khoản admin.
        2. Ở menu bên trái, chọn **Realms** → nhấn nút **Add realm** (hoặc **Create realm**).
        3. Nhập tên Realm, ví dụ: `inventory-management`.
        4. Nhấn **Create** để tạo Realm mới.
        5. Sau khi tạo xong, đảm bảo bạn đang ở trong Realm vừa tạo (góc trên bên trái giao diện sẽ hiển thị tên Realm).
    - Tạo Client cho frontend (ReactJS) với loại Public, cấu hình redirect URI phù hợp.
        **Các bước tạo Client mới:**
        1. Chọn "Clients" trong menu bên trái.
        2. Nhấn nút "Create" để tạo Client mới.
        3. Nhập Client ID, ví dụ: `inventory-frontend`.
        4. Nhấn "Next".
        5. Nhấn "Next".
        6. Nhập vào "Valid Redirect URIs", ở đây là: `http://localhost:4000/*` (địa chỉ ứng dụng ReactJS).
        7. Tắt Client authentication(bởi vì là Public client).
        8. Nhấn "Save" để hoàn tất tạo Client.
        - Loại "Public" phù hợp cho ứng dụng chạy phía trình duyệt như ReactJS, vì không cần bảo mật client secret.
        - Cấu hình "redirect URI" phù hợp: Là địa chỉ mà Keycloak sẽ chuyển hướng người dùng về sau khi đăng nhập thành công. Thường là URL của ửng dụng ReactJS.   
    - Tạo Client cho backend (NestJS) với loại Confidential (nếu cần xác thực backend với Keycloak).
        - Làm tương tự như tạo Client cho frontend, nhưng bật Client authentication(vì là Confidential client).
    - Tạo các Role và User mẫu trên Keycloak để kiểm thử. Tham khảo cách tạo Role và User mẫu tại [GeeksforGeeks: Keycloak - Create Realm, Client, Roles and User](https://www.geeksforgeeks.org/java/keycloak-create-realm-client-roles-and-user/)

2. **Khởi tạo dự án ReactJS và NestJS (trước khi tích hợp)**
    - Tạo dự án frontend (React). Ví dụ sử dụng Create React App (mặc định chạy trên port 3000):
        ```sh
        npx create-react-app inventory-frontend
        cd inventory-frontend
        npm start   # chạy ở http://localhost:3000
        ```
      Hoặc dùng Vite (mặc định chạy trên port 5173):
        ```sh
        npm create vite@latest inventory-frontend -- --template react
        cd inventory-frontend
        npm install
        npm run dev # chạy ở http://localhost:5173
        ```
      **Lưu ý: nếu muốn dùng port 4000 (thống nhất với hướng dẫn), chỉnh port cho frontend như sau:**

      - React (Create React App): tạo file `.env` trong thư mục project với nội dung:
        ```env
        PORT=4000
        ```
        rồi chạy `npm start` (ứng dụng sẽ chạy ở http://localhost:4000).

      - React (Vite): chạy lệnh:
        ```sh
        npm run dev -- --port 4000
        ```
        hoặc chỉnh `package.json` script:
        ```json
        "dev": "vite --port 4000"
        ```

    - Tạo dự án backend (NestJS). Ví dụ:
        ```sh
        npm i -g @nestjs/cli
        nest new inventory-backend
        cd inventory-backend
        npm run start:dev  # mặc định chạy ở http://localhost:3000
        ```
      Để tránh xung đột port với frontend, bạn có thể thay đổi port backend (ví dụ sang 3000):
        - Cách nhanh: chạy với biến môi trường (Linux/macOS): `PORT=3000 npm run start:dev`.
        - Trên Windows (PowerShell): `$env:PORT=3000; npm run start:dev`.
        - Hoặc chỉnh trực tiếp `src/main.ts` để lấy `process.env.PORT || 3000`.

    - Cập nhật cấu hình Keycloak (Valid Redirect URIs) theo port thực tế của frontend/backend (ví dụ `http://localhost:4000/*` cho React, `http://localhost:3000/*` cho backend nếu bạn đặt như vậy).

3. **Tích hợp Keycloak vào Frontend (ReactJS)**
    - Cài đặt thư viện hỗ trợ Keycloak cho React (ví dụ: `@react-keycloak/web`).
    - Khởi tạo Keycloak instance trong ứng dụng React, cấu hình với thông tin Realm, Client ID, URL Keycloak.
    - Thực hiện luồng đăng ký/đăng nhập bằng giao diện Keycloak (redirect hoặc popup):
        - Khi người dùng nhấn nút "Đăng nhập" trên giao diện ReactJS, ứng dụng sẽ gọi hàm keycloak.login() (nếu dùng @react-keycloak/web).
        - Trình duyệt sẽ được chuyển hướng (redirect) sang trang đăng nhập của Keycloak.
        - Người dùng nhập tên đăng nhập và mật khẩu trên giao diện Keycloak.
        - Sau khi xác thực thành công, Keycloak sẽ chuyển hướng lại về ứng dụng ReactJS (theo redirect URI đã cấu hình), kèm theo mã xác thực (authorization code hoặc token).
        - Ứng dụng ReactJS nhận Access Token (JWT) từ Keycloak, lưu vào localStorage/sessionStorage hoặc state quản lý phiên.
        - Nếu người dùng chưa có tài khoản, có thể nhấn "Đăng ký" trên giao diện Keycloak để tạo tài khoản mới (nếu bật self-registration).
        - Sau khi đăng nhập, ứng dụng ReactJS có thể lấy thông tin user (profile) từ token hoặc gọi API userinfo của Keycloak nếu cần.
    - Sau khi đăng nhập thành công, nhận Access Token (JWT) từ Keycloak và lưu vào localStorage/sessionStorage.
    - Gửi Access Token này kèm theo mỗi request API đến backend.

4. **Tích hợp xác thực Keycloak vào Backend (NestJS)**
    - Cài đặt các package hỗ trợ xác thực JWT/OAuth2 (ví dụ: `@nestjs/passport`, `passport-keycloak-oauth2`, `passport-jwt`).
    - Cấu hình middleware/guard để kiểm tra và xác thực Access Token từ client gửi lên.
      **Cụ thể hóa quy trình xác thực Access Token trong Guard (NestJS):**

      1. Cài đặt các package cần thiết:
         ```sh
         npm install @nestjs/passport passport passport-jwt jwks-rsa jsonwebtoken
         ```

      2. Lấy JWKS URI của Keycloak (từ OpenID config):
         - URL: `http://<KEYCLOAK_HOST>/realms/<REALM>/.well-known/openid-configuration`
         - Trường `jwks_uri` trong file cấu hình chứa endpoint public keys (ví dụ `.../protocol/openid-connect/certs`): http://localhost:8081/realms/inventory-management/protocol/openid-connect/certs.

      3. Phương án A (khuyến nghị): dùng Passport + passport-jwt + jwks-rsa
         - Tạo `JwtStrategy` kế thừa `PassportStrategy(Strategy)`:

         ```ts
         // auth/jwt.strategy.ts
         import { Injectable } from '@nestjs/common'
         import { PassportStrategy } from '@nestjs/passport'
         import { Strategy, ExtractJwt } from 'passport-jwt'
         import * as jwksRsa from 'jwks-rsa'

         @Injectable()
         export class JwtStrategy extends PassportStrategy(Strategy) {
           constructor() {
             super({
               jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
               // Lấy public key từ JWKS của Keycloak
               secretOrKeyProvider: jwksRsa.passportJwtSecret({
                 jwksUri: 'http://localhost:8081/realms/inventory-management/protocol/openid-connect/certs',
                 cache: true,
                 rateLimit: true,
               }),
               algorithms: ['RS256'],
             })
           }

           async validate(payload: any) {
             // trả về payload để gán vào req.user
             return payload
           }
         }
         ```

         - Đăng ký strategy trong `AuthModule`, và dùng `@UseGuards(AuthGuard('jwt'))` cho controller/route hoặc cấu hình global guard.

      4. Phương án B: Tự viết Guard (nếu muốn kiểm soát chi tiết hơn)
         - Ý tưởng: lấy token từ header `Authorization: Bearer ...`, xác thực với JWKS bằng `jwks-rsa` + `jsonwebtoken`.

         ```ts
         // auth/keycloak.guard.ts
         import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
         import * as jwksClient from 'jwks-rsa'
         import * as jwt from 'jsonwebtoken'

         @Injectable()
         export class KeycloakGuard implements CanActivate {
           private jwks = jwksClient({ jwksUri: 'http://localhost:8081/realms/inventory-management/protocol/openid-connect/certs' })

           async canActivate(context: ExecutionContext): Promise<boolean> {
             const req = context.switchToHttp().getRequest()
             const auth = req.headers.authorization?.split(' ')[1]
             if (!auth) throw new UnauthorizedException('Missing token')

             try {
               const decoded = await new Promise((resolve, reject) => {
                 jwt.verify(auth, (header, callback) => {
                   this.jwks.getSigningKey(header.kid)
                     .then(key => callback(null, key.getPublicKey()))
                     .catch(err => callback(err))
                 }, { algorithms: ['RS256'] }, (err, decoded) => {
                   if (err) reject(err)
                   else resolve(decoded)
                 })
               })

               // gán user info cho request
               req.user = decoded
               return true
             } catch (err) {
               throw new UnauthorizedException('Invalid token')
             }
           }
         }
         ```

      5. Kiểm tra quyền (roles)
         - Role có thể nằm trong `realm_access.roles` hoặc `resource_access[<client>].roles` trong payload token.
         - Viết thêm `RolesGuard` để kiểm tra `req.user` có role cần thiết hay không.

      6. Phương án thay thế: Token Introspection
         - Nếu muốn server kiểm tra token trực tiếp bằng introspect endpoint (dùng client credentials):
           POST `http://<KEYCLOAK_HOST>/realms/<REALM>/protocol/openid-connect/token/introspect` với `client_id` + `client_secret`.
         - Introspection trả về `active: true/false` và thông tin token nếu còn hợp lệ.

      7. Lưu ý bảo mật & vận hành:
         - Cache JWKS keys để tránh tải quá nhiều request.
         - Bắt lỗi rõ ràng khi refresh/introspection thất bại và yêu cầu user đăng nhập lại.
         - Xác thực signature (RS256) thay vì chỉ decode payload.

      Ví dụ áp dụng guard cho controller:
      ```ts
      @Controller('items')
      @UseGuards(AuthGuard('jwt'))
      export class ItemsController { ... }
      ```

    - Giải mã và xác thực token với public key của Keycloak (hoặc introspect token nếu cần).
    - Lấy thông tin user từ token (sub, email, roles, ...) để xử lý logic nghiệp vụ.

5. **Kiểm thử luồng đăng ký/đăng nhập**
    - Để kiểm thử, trước tiên chúng ta cần thực hiện các bước sau:
      - Tạo module test phía backend (NestJS) để mô phỏng các API cần bảo vệ.
      - Trong test controller, sử dụng JwtAuthGuard cho route "all" và sử dụng JwtAuthGuard + RolesGuard cho route "manager" để kiểm tra phân quyền.
      - Tạo các user mẫu trên Keycloak với các role khác nhau để kiểm thử phân quyền.
      - Trên frontend, ở cùng trang chứa nút Login, thêm các nút để gọi API backend đã bảo vệ:
        - Nút "Call API for all users" để gọi route chỉ dùng JwtAuthGuard. 
        - Nút "Call API for managers" để gọi route dùng JwtAuthGuard + RolesGuard.
        - Khi bấm các nút này, gọi API đến backend kèm theo Access Token trong header Authorization. 
    - Đăng ký user mới qua giao diện Keycloak hoặc API (nếu mở chức năng self-registration).
    - Đăng nhập từ frontend, kiểm tra nhận token và truy cập các API backend thành công khi có token hợp lệ. Truy cập các API với các Role khác nhau để kiểm tra phân quyền.

## 6. Kết quả thu được
### 6.1. Kết quả đạt được
- Tính năng authentication đã được hiện thực hóa thành công với Keycloak, ReactJS và NestJS.
- Người dùng có thể đăng ký, đăng nhập qua giao diện Keycloak.
- Frontend (ReactJS) nhận và lưu Access Token (JWT) từ Keycloak.
- Backend (NestJS) xác thực token từ client và bảo vệ API thành công.
- Phân quyền dựa trên Role từ token hoạt động đúng như mong đợi.

### 6.2. Những vấn đề gặp phải

- **Lưu trữ token trên client (XSS risk):** PoC hiện lưu Access Token trong `sessionStorage`, dễ bị khai thác qua XSS. Trong môi trường production cần cân nhắc dùng cookie HttpOnly hoặc cơ chế token rotation để giảm rủi ro.

- **Quản lý refresh token và vòng đời token:** Cần xử lý kịch bản token hết hạn, refresh thất bại, và đồng bộ trạng thái session trên nhiều client; khó xử lý nhất khi có nhiều điểm đăng nhập.

- **Phân quyền (roles) phức tạp:** Trong token Keycloak, vai trò (roles) có thể nằm ở nhiều chỗ khác nhau (ví dụ `realm_access` hoặc `resource_access`), nên bạn cần biết lấy role từ đâu. Việc này làm cho việc kiểm tra ai có quyền làm gì trở nên khó hơn và cũng khó viết test — đặc biệt khi có role riêng cho từng resource hoặc client.

- **Xử lý JWKS & key rotation:** Cần cache public keys và xử lý trường hợp Keycloak rotate keys (kid thay đổi) để tránh downtime hoặc lỗi xác thực.

- **Thu hồi token / logout đồng bộ:** Khi access token (JWT) đã cấp, không thể làm cho token đó vô hiệu ngay lập tức trên mọi nơi. Để thực hiện logout toàn hệ thống cần thêm cơ chế (ví dụ: kiểm tra trạng thái token qua introspection, lưu trạng thái session trên server, hoặc phát hành token có thời hạn ngắn), nên việc này phức tạp và cần thiết kế cẩn thận.

- **CORS và cấu hình môi trường:** Đồng bộ origin/port giữa frontend và backend (đặc biệt trong dev) và cấu hình CORS chính xác là nguồn lỗi thường gặp.

- **Sẵn sàng & độ trễ của Keycloak:** Keycloak trở thành thành phần phụ thuộc quan trọng; cần kế hoạch HA, caching, và fallback để giảm tác động khi Keycloak chậm hoặc không khả dụng.

**Hạn chế của giải pháp hiện tại:** PoC chứng minh luồng authentication cơ bản nhưng chưa xử lý các yêu cầu production-grade (HA, monitoring, key rotation, token revocation, secure token storage).

## 7. Đánh giá và kết luận
Dựa trên kết quả PoC, nhóm nhận thấy: Tính năng có khả thi về mặt kỹ thuật. Tuy nhiên, giải pháp đề xuất cần điều chỉnh để áp dụng vào hệ thống chính thức.

---

# Phần II - PoC Barcode & QR Code

## 1. Mục tiêu của Proof of Concept
Mục tiêu của PoC này là kiểm chứng tính khả thi về mặt kỹ thuật của **tính năng tạo và quản lý mã Barcode và QR Code** trong hệ thống **Inventory Management**.

Cụ thể, nhóm muốn trả lời các câu hỏi sau:
- Hệ thống có thể tạo và lưu trữ mã Barcode và QR Code cho sản phẩm hay không?
- Người dùng có thể tra cứu thông tin sản phẩm bằng cách quét hoặc nhập mã không?
- Hiệu năng và độ chính xác của việc tạo và đọc mã có đáp ứng yêu cầu không?

---

## 2. Mô tả tính năng cần kiểm chứng

### 2.1. Tên tính năng
- **Barcode & QR Code Management**

### 2.2. Mô tả ngắn gọn
Tính năng cho phép:
- **Tạo mã Barcode**: Tự động sinh mã Barcode dạng CODE128 cho sản phẩm với thông tin cơ bản (tên, mô tả)
- **Tạo mã QR Code**: Tự động sinh mã QR Code chứa thông tin sản phẩm và URL truy cập
- **Tra cứu**: Người dùng có thể nhập mã để tra cứu thông tin sản phẩm đã được mã hóa
- **Hiển thị và sao chép**: Hiển thị mã dưới dạng hình ảnh và cho phép sao chép mã vào clipboard

Người dùng: Operator, Manager, QC Technician (tất cả vai trò cần quản lý sản phẩm trong kho)

Kết quả mong muốn: Tăng tốc độ và độ chính xác trong việc nhập/xuất kho, kiểm kê và truy xuất nguồn gốc sản phẩm.

### 2.3. Lý do tính năng này quan trọng
- **Giảm sai sót**: Quét mã thay vì nhập tay giúp giảm thiểu lỗi nhập liệu
- **Tăng tốc độ**: Quét mã nhanh hơn nhiều so với tìm kiếm thủ công
- **Truy xuất nguồn gốc**: QR Code có thể chứa nhiều thông tin hơn, hỗ trợ truy xuất nguồn gốc nhanh chóng
- **Tiêu chuẩn ngành**: Barcode và QR Code là tiêu chuẩn trong quản lý kho hiện đại

---

## 3. Phạm vi Proof of Concept
PoC **tập trung vào các chức năng cốt lõi**:
- ✅ Tạo mã Barcode và QR Code tự động
- ✅ Lưu trữ thông tin mã trong bộ nhớ (in-memory)
- ✅ Tra cứu thông tin theo mã
- ✅ Hiển thị mã dưới dạng hình ảnh
- ✅ Phân trang danh sách mã

PoC **không bao gồm**:
- ❌ Quét mã qua camera (chỉ tra cứu bằng nhập tay)
- ❌ Lưu trữ vào database (dùng in-memory để đơn giản)
- ❌ In nhãn mã vạch vật lý
- ❌ Xử lý ở quy mô lớn (hàng triệu mã)

---

## 4. Công nghệ và công cụ sử dụng

### Backend (NestJS)
- **Framework**: NestJS
- **Ngôn ngữ**: TypeScript
- **In-memory storage**: Map<string, Product>

### Frontend (React)
- **Framework**: React 18/19
- **Thư viện Barcode**: `react-barcode` - Tạo và hiển thị Barcode dạng CODE128
- **Thư viện QR Code**: `qrcode.react` - Tạo và hiển thị QR Code dạng SVG

---

## 5. Hiện thực PoC bằng mã nguồn

### 5.1. Kiến trúc tổng quan
```
[React Frontend]
      |
      | HTTP REST API
      |
      ↓
[NestJS Backend]
      |
      ├── /barcode (BarcodeModule)
      |     ├── POST /barcode/generate
      |     ├── GET /barcode/:code
      |     └── GET /barcode
      |
      └── /qrcode (QRCodeModule)
            ├── POST /qrcode/generate
            ├── GET /qrcode/:code
            └── GET /qrcode
```

### 5.2. Các bước thực hiện chi tiết

#### Bước 1: Tạo Backend API cho Barcode

**File: `barcode.service.ts`**
```typescript
import {Injectable} from '@nestjs/common';

export interface BarcodeProduct {
  code: string;
  name: string;
  description?: string;
}

@Injectable()
export class BarcodeService {
  private barcodes: Map<string, BarcodeProduct> = new Map();

  create(product: Omit<BarcodeProduct, 'code'>): BarcodeProduct {
    const code = 'BC' + Date.now() + Math.floor(Math.random() * 1000);
    const barcode: BarcodeProduct = {code, name: product.name, ...product};
    this.barcodes.set(code, barcode);
    return barcode;
  }

  get(code: string): BarcodeProduct | undefined {
    return this.barcodes.get(code);
  }

  list(): BarcodeProduct[] {
    return Array.from(this.barcodes.values());
  }
}
```

**File: `barcode.controller.ts`**
```typescript
import { Controller, Post, Body, Get, Param, NotFoundException } from '@nestjs/common';
import { BarcodeService, BarcodeProduct } from './barcode.service';

@Controller('barcode')
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  @Post('generate')
  createBarcode(@Body() body: Omit<BarcodeProduct, 'code'>) {
    return this.barcodeService.create(body);
  }

  @Get(':code')
  getBarcode(@Param('code') code: string) {
    const barcode = this.barcodeService.get(code);
    if (!barcode) throw new NotFoundException('Barcode not found');
    return barcode;
  }

  @Get()
  listBarcodes() {
    return this.barcodeService.list();
  }
}
```

#### Bước 2: Tạo Backend API cho QR Code

**File: `qrcode.service.ts`**
```typescript
import {Injectable} from '@nestjs/common';

export interface QRCodeProduct {
  code: string;
  name: string;
  description?: string;
  url?: string;
}

@Injectable()
export class QRCodeService {
  private qrcodes: Map<string, QRCodeProduct> = new Map();

  create(product: Omit<QRCodeProduct, 'code'>): QRCodeProduct {
    const code = 'QR' + Date.now() + Math.floor(Math.random() * 10000);
    const qrcode: QRCodeProduct = {
      code, 
      name: product.name, 
      url: product.url || `https://inventory.example.com/product/${code}`,
      ...product
    };
    this.qrcodes.set(code, qrcode);
    return qrcode;
  }

  get(code: string): QRCodeProduct | undefined {
    return this.qrcodes.get(code);
  }

  list(): QRCodeProduct[] {
    return Array.from(this.qrcodes.values());
  }
}
```

#### Bước 3: Tạo Frontend Components

**Frontend cho Barcode**: Sử dụng thư viện `react-barcode`
- Component `BarcodeDemo.jsx` hiển thị danh sách barcode với phân trang
- Hỗ trợ tạo mới và tra cứu barcode
- Hiển thị barcode dưới dạng hình ảnh CODE128

**Frontend cho QR Code**: Sử dụng thư viện `qrcode.react`
- Component `QRCodeDemo.jsx` hiển thị danh sách QR code với phân trang
- Hỗ trợ tạo mới và tra cứu QR code
- Hiển thị QR code dưới dạng SVG, mã hóa URL hoặc text

#### Bước 4: Tích hợp vào App

**File: `App.jsx`**
```jsx
import BarcodeDemo from './components/BarcodeDemo'
import QRCodeDemo from './components/QRCodeDemo'

function App() {
  const [currentView, setCurrentView] = useState('main')
  
  // Chuyển đổi giữa các view: 'main', 'barcode', 'qrcode'
  
  return (
    <div className="app">
      <button onClick={() => setCurrentView('barcode')}>Barcode Demo</button>
      <button onClick={() => setCurrentView('qrcode')}>QR Code Demo</button>
      {currentView === 'barcode' && <BarcodeDemo />}
      {currentView === 'qrcode' && <QRCodeDemo />}
    </div>
  )
}
```

---

## 6. Kết quả thu được

### 6.1. Kết quả đạt được

✅ **Barcode**:
- Tạo mã Barcode tự động với format `BC{timestamp}{random}`
- Hiển thị Barcode dạng CODE128 với độ phân giải cao
- Tra cứu thông tin sản phẩm theo mã Barcode thành công
- Sao chép mã vào clipboard hoạt động tốt
- Phân trang danh sách hiển thị 2 item/trang

✅ **QR Code**:
- Tạo mã QR Code tự động với format `QR{timestamp}{random}`
- Hiển thị QR Code dạng SVG, có thể scan bằng điện thoại
- QR Code có thể mã hóa URL tùy chỉnh hoặc dùng URL mặc định
- Tra cứu và sao chép mã hoạt động tốt
- Phân trang tương tự Barcode

✅ **Giao diện**:
- Responsive, hoạt động tốt trên desktop và mobile
- Form tạo mới rõ ràng, dễ sử dụng
- Tìm kiếm nhanh, kết quả hiển thị ngay lập tức

### 6.2. Những vấn đề gặp phải

⚠️ **Lưu trữ tạm thời**: 
- Dữ liệu lưu trong memory, mất khi restart server
- Giải pháp: Cần tích hợp database (MongoDB/PostgreSQL) cho production

⚠️ **Không có tính năng quét**:
- PoC chỉ hỗ trợ nhập mã bằng tay
- Giải pháp: Cần tích hợp thư viện quét mã như `react-qr-scanner` hoặc `quagga2`

⚠️ **Thiếu validation**:
- Chưa kiểm tra trùng lặp mã
- Chưa validate định dạng input
- Giải pháp: Thêm validation ở cả frontend và backend

⚠️ **Hiệu năng**:
- Chưa test với số lượng lớn (>10,000 mã)
- Phân trang client-side không phù hợp cho dữ liệu lớn
- Giải pháp: Implement server-side pagination

---

## 7. Đánh giá và kết luận

### 7.1. Tính khả thi kỹ thuật
✅ **Khả thi cao** - Công nghệ đã chọn (NestJS + React + react-barcode + qrcode.react) hoàn toàn đáp ứng được yêu cầu cơ bản.

### 7.2. Khuyến nghị cho phát triển tiếp

**Ngắn hạn** (Áp dụng vào MVP):
1. Tích hợp database để lưu trữ vĩnh viễn
2. Thêm validation và kiểm tra trùng lặp
3. Implement server-side pagination
4. Thêm feature export/download mã dưới dạng hình ảnh

**Dài hạn** (Sau MVP):
1. Tích hợp camera để quét mã thực tế
2. Hỗ trợ in nhãn mã vạch qua máy in nhiệt
3. Tích hợp với các luồng nghiệp vụ (nhập kho, xuất kho, kiểm kê)
4. Theo dõi lịch sử quét mã (audit log)
5. Hỗ trợ nhiều định dạng Barcode khác (QR, EAN-13, Code39, v.v.)

### 7.3. Kết luận
PoC đã chứng minh được tính khả thi của việc tạo và quản lý Barcode & QR Code trong hệ thống Inventory Management. Giải pháp đơn giản, dễ triển khai và có thể mở rộng để đáp ứng yêu cầu thực tế của dự án.