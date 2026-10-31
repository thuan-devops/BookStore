# Báo Cáo Trả Lời Câu Hỏi Bổ Sung — Buổi 7

## Câu 1: Cấu trúc điều hướng
**Đề bài:** Vì sao `BookDetail` được đăng ký ở Stack mà không đặt trong Tab? Nếu đặt vào Tab thì màn hình sẽ khác đi thế nào?

**Trả lời:**
- `BookDetail` được đăng ký ở cấp Stack Navigator (`RootNavigator`) vì đây là màn hình con đi sâu vào chi tiết sản phẩm. Khi chuyển sang màn hình này từ danh sách sách, nó cần che phủ toàn bộ màn hình (bao gồm cả thanh Bottom Tab Bar) để người dùng tập trung vào nội dung và quyết định mua hàng, đồng thời tự động thừa hưởng nút quay lại (`← Back`) trên Header mặc định của Stack.
- Nếu đặt `BookDetail` vào bên trong Tab Navigator, màn hình này sẽ biến thành một tab ngang hàng trên thanh điều hướng bên dưới; thanh Tab Bar vẫn luôn hiển thị chiếm dụng diện tích phía dưới màn hình và không có nút quay lại (`←`) tự động trên header để quay về danh sách sách trước đó.

---

## Câu 2: Redux Toolkit & useMemo
**Đề bài:** Trong reducer viết `state.items.push(...)` mà sao state gốc không bị sửa trực tiếp? Thử bỏ `useMemo` trong `useCart`: kết quả hiển thị có đổi không, và có hậu quả gì?

**Trả lời:**
- Redux Toolkit tích hợp sẵn thư viện **Immer**. Khi viết code trông như "đột biến trực tiếp" (`state.items.push(...)`), Immer thực chất cung cấp một đối tượng `Draft` trung gian để ghi nhận các thay đổi, sau đó tự động sao chép và tạo ra một state mới bất biến (immutable state). Do đó state gốc của Redux không hề bị sửa trực tiếp.
- Nếu bỏ `useMemo` trong `useCart`, kết quả hiển thị (tổng số lượng `totalQuantity` và tổng tiền `totalPrice`) **hoàn toàn không bị thay đổi** (vẫn tính toán ra kết quả đúng). Tuy nhiên, hậu quả là hàm `reduce` sẽ bị thực thi lại sau **mỗi lần render** của component gọi hook, gây hao phí tài nguyên CPU không cần thiết, đặc biệt khi giỏ hàng có số lượng mặt hàng lớn.

---

## Câu 3: Promise.all & Promise.allSettled
**Đề bài:** Nếu `getCategories()` lỗi còn `getBooks()` thành công thì Home hiện gì? Tìm cách để vẫn hiện được danh sách sách (gợi ý: `Promise.allSettled`) và nói rõ cách đó phải đánh đổi gì.

**Trả lời:**
- `Promise.all` có cơ chế "fail-fast": chỉ cần một trong các Promise bị lỗi (reject), toàn bộ `Promise.all` sẽ bị lỗi ngay lập tức và nhảy vào khối `catch`. Do đó, nếu `getCategories()` lỗi thì dù `getBooks()` thành công, Home vẫn rơi vào nhánh `error` và hiển thị `ErrorView`, người dùng không xem được sách.
- Cách giải quyết là dùng `Promise.allSettled`:
  ```ts
  const results = await Promise.allSettled([getBooks(), getCategories()]);
  if (results[0].status === "fulfilled") setBooks(results[0].value);
  if (results[1].status === "fulfilled") setCategories(results[1].value);
  ```
- **Đánh đổi:** Code xử lý kết quả phức tạp hơn; giao diện rơi vào trạng thái "phân mảnh" (nửa thành công, nửa thất bại như sách hiển thị được nhưng thanh danh mục bị thiếu hoặc trống); lập trình viên phải tự quản lý thông báo lỗi cục bộ cho từng phần thay vì dùng một màn hình báo lỗi chung (`ErrorView`).

---

## Câu 4: Debounce trong tìm kiếm
**Đề bài:** Vì sao không đặt `setTimeout` thẳng trong `onChangeText`? Hàm dọn dẹp (`return () => clearTimeout`) giúp tránh lỗi gì?

**Trả lời:**
- Nếu đặt `setTimeout` trực tiếp trong `onChangeText`, mỗi ký tự người dùng gõ vào vẫn tạo ra một timer độc lập mà không bị hủy bỏ khi gõ tiếp. Kết quả là việc tìm kiếm/lọc vẫn diễn ra đủ số lần theo số ký tự được gõ (chỉ bị trễ đi sau một khoảng thời gian) chứ không gom lại được thành một lần duy nhất khi người dùng ngừng gõ.
- Hàm dọn dẹp (`return () => clearTimeout(timer)`) trong `useEffect` giúp hủy bộ đếm thời gian của lần gõ phím trước đó ngay khi người dùng gõ thêm ký tự mới (trước khi timer kịp kích hoạt). Đồng thời, nó giúp tránh lỗi cập nhật state trên component đã unmount (memory leak warning) nếu người dùng rời khỏi màn hình trước khi timer hoàn thành.

---

## Câu 5: Code bổ sung — Tuỳ chọn sắp xếp giá cho Home
**Đề bài:** Thêm tuỳ chọn sắp xếp “Giá tăng dần / giảm dần” cho Home. Chỉ cần thêm một state và sửa một chỗ trong `visibleBooks`.

**Đoạn mã triển khai:**
```tsx
// 1. Khai báo state lưu trạng thái sắp xếp tại HomeScreen
type SortOrder = "asc" | "desc" | null;
const [sortOrder, setSortOrder] = useState<SortOrder>(null);

// 2. Điều chỉnh useMemo của visibleBooks để thực hiện sort theo giá
const visibleBooks = useMemo(() => {
  const filtered = filterBooks(books, {
    keyword: debouncedKeyword,
    categoryId,
    priceRange,
  });

  if (!sortOrder) return filtered;

  // Clone mảng và sắp xếp theo giá
  return [...filtered].sort((a, b) =>
    sortOrder === "asc" ? a.price - b.price : b.price - a.price
  );
}, [books, debouncedKeyword, categoryId, priceRange, sortOrder]);
```

---

## Phần Thử Thách (Cộng Điểm)

### BT7.C1 — Wishlist & Adapter Pattern
**Yêu cầu:** Wishlist: viết `toggleWishlist` trong `wishlistSlice`, thêm nút ♡/♥ ở `BookDetail` dùng `useWishlist()`. Giải thích vì sao nếu sau này đổi thư viện state thì phần giao diện không phải sửa.

**1. Code toggleWishlist (`src/store/wishlistSlice.ts`):**
```ts
toggleWishlist(state, action: PayloadAction<number>) {
  const i = state.ids.indexOf(action.payload);
  if (i >= 0) {
    state.ids.splice(i, 1);
  } else {
    state.ids.push(action.payload);
  }
}
```

**2. Gắn nút ♡/♥ tại `BookDetailScreen.tsx`:**
```tsx
const { isFavorite, toggle } = useWishlist();
const fav = isFavorite(book.id);

<Pressable style={styles.favBtn} onPress={() => toggle(book.id)}>
  <Text style={[styles.favIcon, fav && styles.favIconActive]}>
    {fav ? "♥" : "♡"}
  </Text>
</Pressable>
```

**3. Giải thích tại sao đổi thư viện State thì giao diện không cần sửa:**
- Nhờ thiết kế theo **Adapter Pattern**, các UI component (như `BookDetailScreen`) không kết nối trực tiếp đến Redux (không gọi `useDispatch`, `useSelector` hay `dispatch(action)`).
- Thay vào đó, component chỉ giao tiếp thông qua custom hook trung gian là `useWishlist()` đặt trong `src/store/hooks.ts`. Hook này cung cấp một giao diện chuẩn (`ids`, `isFavorite`, `toggle`).
- Nếu sau này dự án thay đổi thư viện quản lý state (chẳng hạn chuyển sang **Zustand**, **Jotai**, **MobX** hay **Context API**), lập trình viên chỉ cần cập nhật lại phần cài đặt bên trong file `hooks.ts`. Giao diện màn hình `BookDetailScreen` hoàn toàn không bị phụ thuộc vào Redux nên không phải sửa đổi bất kỳ dòng code nào.

---

### BT7.C2 — Lọc theo khoảng giá
**Yêu cầu:** Lọc theo khoảng giá: viết `inRange`, thêm điều kiện giá vào `filterBooks`, làm `PriceFilter` (3 nút, bấm lần nữa để bỏ chọn). Phải dùng chung được với danh mục và từ khoá.

**1. Hàm inRange & filterBooks (`src/utils/filters.ts`):**
```ts
const inRange = (price: number, r: PriceRange): boolean => {
  if (r === null) return true;
  if (r === "lt100") return price < 100000;
  if (r === "100to300") return price >= 100000 && price <= 300000;
  return price > 300000;
};

export function filterBooks(books: Book[], f: BookFilter): Book[] {
  const k = normalize(f.keyword);
  return books.filter(
    (b) =>
      (k === "" || normalize(b.title).includes(k) || normalize(b.author).includes(k)) &&
      (f.categoryId === null || b.categoryId === f.categoryId) &&
      inRange(b.price, f.priceRange)
  );
}
```

**2. Component `PriceFilter.tsx` (`src/components/PriceFilter.tsx`):**
- Hiển thị 3 nút từ `PRICE_RANGES`: "Dưới 100k", "100k–300k", "Trên 300k".
- Nút đang chọn có màu nền cyan (`colors.cyan`), chữ trắng.
- Bấm lần nữa vào nút đang chọn sẽ bỏ lọc (`onChange(active ? null : r.key)`).
- Kết hợp mượt mà với danh mục và từ khóa tìm kiếm (toàn bộ xử lý tại `useMemo` của `HomeScreen`).
