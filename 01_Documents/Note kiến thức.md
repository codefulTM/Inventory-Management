# Access Token

"Vé vào cửa" ngắn hạn (thường 15p-1h)

- Đính kèm mỗi request API trong header Authorization
- Hết hạn → Phải login lại hoặc dùng refresh token

# Refresh Token

"Vé làm mới vé vào cửa" dài hạn (thường 7-30 ngày)

- Chỉ dùng để đổi lấy access token mới khi access token hết hạn
- Không dùng gọi API trực tiếp

# Tại sao cần 2 cái - Access Token và Refresh Token?

- Nếu chỉ dùng 1 access token dài hạn → hacker lấy được là dùng thoải mái
- Có refresh token → access token hết nhanh, hạn chế thiệt hại. Refresh token thì được lưu kỹ, ít bị lộ hơn
