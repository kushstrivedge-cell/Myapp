import React, { useEffect, useMemo, useState } from 'react';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProductCard from '../../components/landingpage/ProductCard';
import { AsyncStateView } from '../components/feedback/AsyncStateView';
import { useCatalogue } from '../context/CatalogueContext';
import { CatalogueProduct } from '../data/products';
import {
  AppTabParamList,
  RootStackParamList,
} from '../navigation/navigationTypes';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, 'Categories'>,
  NativeStackScreenProps<RootStackParamList>
>;

type SortOption = 'popular' | 'priceLow' | 'priceHigh' | 'rating';
type FilterOption = 'all' | 'under1000' | 'rating4' | 'discounted';

const sortLabels: Record<SortOption, string> = {
  popular: 'Most popular',
  priceLow: 'Price: low to high',
  priceHigh: 'Price: high to low',
  rating: 'Customer rating',
};

const filterLabels: Record<FilterOption, string> = {
  all: 'All products',
  under1000: 'Under ₹1,000',
  rating4: 'Rated 4+',
  discounted: 'On sale',
};

function CategoriesScreen({ navigation, route }: Props) {
  const rootNavigation =
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const { categories: apiCategories, listProducts } = useCatalogue();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState<SortOption>('popular');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortOpen, setSortOpen] = useState(false);
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setCategory(route.params?.category ?? 'All');
  }, [route.params?.category]);

  const categories = useMemo(
    () => ['All', ...apiCategories.map(item => item.name)],
    [apiCategories],
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const selectedCategory = apiCategories.find(
          item => item.name === category,
        );
        const result = await listProducts({
          q: query.trim() || undefined,
          category: selectedCategory?.slug,
          ...(filter === 'under1000' ? { maxPrice: 999 } : {}),
          ...(filter === 'rating4' ? { minRating: 4 } : {}),
          ...(filter === 'discounted' ? { onSale: true } : {}),
          sort:
            sort === 'priceLow'
              ? 'price_asc'
              : sort === 'priceHigh'
              ? 'price_desc'
              : sort === 'rating'
              ? 'rating'
              : 'popular',
          page: 1,
          limit: 50,
        });
        if (active) {
          setProducts(result.items);
          setPage(1);
          setHasNextPage(result.pagination.hasNextPage);
        }
      } catch (requestError) {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load products.',
          );
      } finally {
        if (active) setLoading(false);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [apiCategories, category, filter, listProducts, query, reloadKey, sort]);

  const loadMore = async () => {
    if (loading || loadingMore || !hasNextPage) return;
    setLoadingMore(true);
    try {
      const selectedCategory = apiCategories.find(
        item => item.name === category,
      );
      const nextPage = page + 1;
      const result = await listProducts({
        q: query.trim() || undefined,
        category: selectedCategory?.slug,
        ...(filter === 'under1000' ? { maxPrice: 999 } : {}),
        ...(filter === 'rating4' ? { minRating: 4 } : {}),
        ...(filter === 'discounted' ? { onSale: true } : {}),
        sort:
          sort === 'priceLow'
            ? 'price_asc'
            : sort === 'priceHigh'
            ? 'price_desc'
            : sort === 'rating'
            ? 'rating'
            : 'popular',
        page: nextPage,
        limit: 50,
      });
      setProducts(current => [
        ...current,
        ...result.items.filter(
          product => !current.some(existing => existing.id === product.id),
        ),
      ]);
      setPage(nextPage);
      setHasNextPage(result.pagination.hasNextPage);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load more products.',
      );
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && products.length === 0)
    return <AsyncStateView loading loadingLabel="Loading products…" />;
  if (error && products.length === 0)
    return (
      <AsyncStateView
        error={error}
        onRetry={() => setReloadKey(value => value + 1)}
      />
    );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <FlatList
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        data={products}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              color="#D94F04"
              size="small"
              style={styles.loadingMore}
            />
          ) : null
        }
        keyExtractor={product => product.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>?</Text>
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyCopy}>
              Try another search, category or filter.
            </Text>
            <Pressable
              onPress={() => {
                setQuery('');
                setCategory('All');
                setFilter('all');
              }}
              style={styles.resetButton}
            >
              <Text style={styles.resetText}>Reset filters</Text>
            </Pressable>
          </View>
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>DISCOVER</Text>
              <Text style={styles.title}>Shop all products</Text>
              <Text style={styles.subtitle}>
                Find something made for your everyday.
              </Text>
              <View style={styles.searchBar}>
                <Text style={styles.searchSymbol}>⌕</Text>
                <TextInput
                  accessibilityLabel="Search the catalogue"
                  onChangeText={setQuery}
                  placeholder="Search products"
                  placeholderTextColor="#7B858D"
                  returnKeyType="search"
                  style={styles.searchInput}
                  value={query}
                />
                {query.length > 0 && (
                  <Pressable
                    accessibilityLabel="Clear search"
                    onPress={() => setQuery('')}
                  >
                    <Text style={styles.clear}>×</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.categoryContent}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {categories.map(item => (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.categoryChip,
                    category === item && styles.activeCategory,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      category === item && styles.activeCategoryText,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView
              contentContainerStyle={styles.filterContent}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {(Object.keys(filterLabels) as FilterOption[]).map(option => (
                <Pressable
                  key={option}
                  onPress={() => setFilter(option)}
                  style={[
                    styles.filterChip,
                    filter === option && styles.activeFilter,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === option && styles.activeFilterText,
                    ]}
                  >
                    {filterLabels[option]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.resultRow}>
              <Text style={styles.resultCount}>{products.length} products</Text>
              <Pressable
                onPress={() => setSortOpen(true)}
                style={styles.sortButton}
              >
                <Text style={styles.sortText}>Sort: {sortLabels[sort]} ▾</Text>
              </Pressable>
            </View>
          </View>
        }
        numColumns={2}
        renderItem={({ item }) => (
          <ProductCard
            onPress={() =>
              rootNavigation?.navigate('ProductDetails', { productId: item.id })
            }
            product={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}
        transparent
        visible={sortOpen}
      >
        <Pressable
          onPress={() => setSortOpen(false)}
          style={styles.modalBackdrop}
        >
          <Pressable style={styles.sortSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sort products</Text>
            {(Object.keys(sortLabels) as SortOption[]).map(option => (
              <Pressable
                key={option}
                onPress={() => {
                  setSort(option);
                  setSortOpen(false);
                }}
                style={styles.sortOption}
              >
                <Text
                  style={[
                    styles.optionText,
                    sort === option && styles.selectedOptionText,
                  ]}
                >
                  {sortLabels[option]}
                </Text>
                <View
                  style={[
                    styles.radio,
                    sort === option && styles.selectedRadio,
                  ]}
                />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6F8' },
  listContent: { paddingBottom: 20 },
  loadingMore: { paddingVertical: 20 },
  row: { justifyContent: 'space-between', paddingHorizontal: 12 },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  eyebrow: {
    color: '#D94F04',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  title: {
    color: '#101820',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: { color: '#74808A', fontSize: 12, marginTop: 4 },
  searchBar: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F5',
    borderRadius: 10,
    marginTop: 17,
    paddingHorizontal: 12,
  },
  searchSymbol: { color: '#3C4851', fontSize: 25, marginRight: 7 },
  searchInput: { flex: 1, color: '#101820', fontSize: 14, paddingVertical: 0 },
  clear: { color: '#68737C', fontSize: 24, paddingHorizontal: 4 },
  categoryContent: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingBottom: 13,
  },
  categoryChip: {
    height: 35,
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F1F3F4',
    paddingHorizontal: 15,
    marginHorizontal: 4,
  },
  activeCategory: { backgroundColor: '#101820' },
  categoryText: { color: '#56616A', fontSize: 11, fontWeight: '700' },
  activeCategoryText: { color: '#FFFFFF' },
  filterContent: { paddingHorizontal: 12, paddingTop: 13, paddingBottom: 8 },
  filterChip: {
    height: 32,
    justifyContent: 'center',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#D7DDE1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  activeFilter: { borderColor: '#E85D04', backgroundColor: '#FFF2EB' },
  filterText: { color: '#65717A', fontSize: 10, fontWeight: '700' },
  activeFilterText: { color: '#C84800' },
  resultRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  resultCount: { color: '#45515A', fontSize: 11, fontWeight: '700' },
  sortButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sortText: { color: '#34414B', fontSize: 10, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 30 },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF0CE',
    color: '#A56700',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 22,
    fontWeight: '900',
  },
  emptyTitle: {
    color: '#101820',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 14,
  },
  emptyCopy: { color: '#74808A', fontSize: 12, marginTop: 5 },
  resetButton: {
    backgroundColor: '#101820',
    borderRadius: 8,
    paddingHorizontal: 17,
    paddingVertical: 11,
    marginTop: 18,
  },
  resetText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sortSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 30,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4D9DD',
    marginBottom: 19,
  },
  sheetTitle: {
    color: '#101820',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 9,
  },
  sortOption: {
    height: 49,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E8EA',
  },
  optionText: { color: '#52606A', fontSize: 13 },
  selectedOptionText: { color: '#D94F04', fontWeight: '800' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#BCC4CA',
  },
  selectedRadio: { borderWidth: 5, borderColor: '#E85D04' },
});

export default CategoriesScreen;
