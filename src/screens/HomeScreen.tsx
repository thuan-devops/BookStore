import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Header } from "../components/Header";
import { SearchBar } from "../components/SearchBar";
import { CategoryChips } from "../components/CategoryChips";
import { PriceFilter } from "../components/PriceFilter";
import { BookGrid } from "../components/BookGrid";
import { FloatingCartButton } from "../components/FloatingCartButton";
import { EmptyState } from "../components/EmptyState";
import { LoadingView } from "../components/LoadingView";
import { ErrorView } from "../components/ErrorView";
import { getBooks } from "../services/bookService";
import { getCategories } from "../services/categoryService";
import { getErrorMessage } from "../api/client";
import { useDebounce } from "../hooks/useDebounce";
import { filterBooks, PriceRange } from "../utils/filters";
import { useCart } from "../store/hooks";
import { TabScreenProps } from "../navigation/types";
import { Book, Category } from "../types";
import { colors, radius } from "../theme";

export function HomeScreen({ navigation, route }: TabScreenProps<"Home">) {
  const { totalQuantity } = useCart();

  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [priceRange, setPriceRange] = useState<PriceRange>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, c] = await Promise.all([getBooks(), getCategories()]);
      setBooks(b);
      setCategories(c);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = route.params?.categoryId;
    if (id !== undefined) {
      setCategoryId(id);
      navigation.setParams({ categoryId: undefined });
    }
  }, [route.params?.categoryId, navigation]);

  const debouncedKeyword = useDebounce(keyword, 400);

  const visibleBooks = useMemo(
    () => filterBooks(books, { keyword: debouncedKeyword, categoryId, priceRange }),
    [books, debouncedKeyword, categoryId, priceRange]
  );

  const hasFilter = keyword !== "" || categoryId !== null || priceRange !== null;

  const clearFilters = () => {
    setKeyword("");
    setCategoryId(null);
    setPriceRange(null);
  };

  return (
    <View style={styles.container}>
      <Header title="📚 BookStore" onSearchPress={() => setSearchOpen((v) => !v)} />
      {searchOpen && (
        <SearchBar
          value={keyword}
          onChangeText={setKeyword}
          onClose={() => {
            setSearchOpen(false);
            setKeyword("");
          }}
        />
      )}
      {loading ? (
        <LoadingView label="Đang tải sách…" />
      ) : error ? (
        <ErrorView message={error} onRetry={load} />
      ) : (
        <>
          <BookGrid
            data={visibleBooks}
            onPressBook={(b) => navigation.navigate("BookDetail", { bookId: b.id })}
            ListHeaderComponent={
              <View>
                <CategoryChips categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
                <PriceFilter value={priceRange} onChange={setPriceRange} />
                {hasFilter && (
                  <View style={styles.filterBar}>
                    <Pressable style={styles.clearBtn} onPress={clearFilters}>
                      <Text style={styles.clearBtnText}>✕ Xóa bộ lọc</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                emoji="🔎"
                title="Không tìm thấy sách phù hợp"
                message="Hãy thử từ khoá khác hoặc bỏ bớt bộ lọc."
                actionLabel="Xóa bộ lọc"
                onAction={clearFilters}
              />
            }
          />
          <FloatingCartButton count={totalQuantity} onPress={() => navigation.navigate("Cart")} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filterBar: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexDirection: "row",
  },
  clearBtn: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  clearBtnText: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 13,
  },
});
