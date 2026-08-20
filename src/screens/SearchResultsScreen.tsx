import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProductCard from '../../components/landingpage/ProductCard';
import { useSearchHistory } from '../context/SearchContext';
import { useCatalogue } from '../context/CatalogueContext';
import { CatalogueProduct } from '../data/products';
import { RootStackParamList } from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'SearchResults'>;
type CategoryOption = { name: string; slug: string };

function SearchResultsScreen({ navigation, route }: Props) {
  const initialQuery = route.params?.query ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [results, setResults] = useState<CatalogueProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const { history, addSearch, removeSearch, clearHistory } = useSearchHistory();
  const { products, categories, listProducts } = useCatalogue();

  const categoryOptions = useMemo<CategoryOption[]>(
    () =>
      categories.flatMap(category => [
        { name: category.name, slug: category.slug },
        ...category.children.map(child => ({
          name: child.name,
          slug: child.slug,
        })),
      ]),
    [categories],
  );
  const selectedCategory = useMemo(() => {
    const value = submittedQuery.trim().toLowerCase();
    return categoryOptions.find(
      category =>
        category.name.toLowerCase() === value ||
        category.slug.toLowerCase() === value,
    );
  }, [categoryOptions, submittedQuery]);

  useEffect(() => {
    const search = submittedQuery.trim();
    if (!search) {
      setResults([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    listProducts(
      selectedCategory
        ? { category: selectedCategory.slug, limit: 50 }
        : { q: search, limit: 50 },
    )
      .then(result => {
        if (active) setResults(result.items);
      })
      .catch(requestError => {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Search failed.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [listProducts, reloadKey, selectedCategory, submittedQuery]);

  const suggestions = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value || value === submittedQuery.trim().toLowerCase()) return [];
    const categoryMatches = categoryOptions
      .filter(category => category.name.toLowerCase().includes(value))
      .map(category => ({
        key: `category-${category.slug}`,
        label: category.name,
        meta: 'Category',
      }));
    const productMatches = products
      .filter(product =>
        `${product.name} ${product.category} ${product.slug}`
          .toLowerCase()
          .includes(value),
      )
      .map(product => ({
        key: `product-${product.id}`,
        label: product.name,
        meta: product.category,
      }));
    return [...categoryMatches, ...productMatches]
      .sort(
        (a, b) =>
          Number(!a.label.toLowerCase().startsWith(value)) -
          Number(!b.label.toLowerCase().startsWith(value)),
      )
      .slice(0, 7);
  }, [categoryOptions, products, query, submittedQuery]);

  const runSearch = (nextQuery = query) => {
    const clean = nextQuery.trim();
    if (!clean) return;
    setQuery(clean);
    setSubmittedQuery(clean);
    addSearch(clean);
    navigation.setParams({ query: clean });
  };
  const clearSearch = () => {
    setQuery('');
    setSubmittedQuery('');
    setResults([]);
    navigation.setParams({ query: undefined });
  };

  const listHeader =
    suggestions.length > 0 ? (
      <View style={styles.suggestionsCard}>
        <Text style={styles.suggestionTitle}>Search suggestions</Text>
        {suggestions.map(suggestion => (
          <Pressable
            key={suggestion.key}
            onPress={() => runSearch(suggestion.label)}
            style={({ pressed }) => [
              styles.suggestionRow,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.suggestionIcon}>
              <Text style={styles.suggestionIconText}>⌕</Text>
            </View>
            <View style={styles.suggestionCopy}>
              <Text numberOfLines={1} style={styles.suggestionText}>
                {suggestion.label}
              </Text>
              <Text style={styles.suggestionMeta}>{suggestion.meta}</Text>
            </View>
            <Text style={styles.suggestionArrow}>›</Text>
          </Pressable>
        ))}
      </View>
    ) : submittedQuery ? (
      <View style={styles.resultHeading}>
        <View style={styles.resultEyebrowRow}>
          <Text style={styles.resultEyebrow}>
            {selectedCategory ? 'CATEGORY' : 'SEARCH RESULTS'}
          </Text>
          {selectedCategory && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {selectedCategory.name}
              </Text>
            </View>
          )}
        </View>
        <Text numberOfLines={2} style={styles.resultTitle}>
          Results for “{submittedQuery}”
        </Text>
        <Text style={styles.resultCount}>
          {loading
            ? 'Finding the best matches…'
            : `${results.length} ${
                results.length === 1 ? 'product' : 'products'
              } found`}
        </Text>
      </View>
    ) : null;

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            autoFocus={!initialQuery}
            accessibilityLabel="Search products and categories"
            onChangeText={setQuery}
            onSubmitEditing={() => runSearch()}
            placeholder="Search products and categories"
            placeholderTextColor="#77828A"
            returnKeyType="search"
            style={styles.input}
            value={query}
          />
          {query.length > 0 && (
            <Pressable
              accessibilityLabel="Clear search"
              hitSlop={8}
              onPress={clearSearch}
            >
              <Text style={styles.clear}>×</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityLabel="Submit search"
            onPress={() => runSearch()}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitPressed,
            ]}
          >
            <Text style={styles.submitText}>Search</Text>
          </Pressable>
        </View>
      </View>

      {!query && !submittedQuery ? (
        <View style={styles.historyCard}>
          <View style={styles.historyHeading}>
            <Text style={styles.historyTitle}>Recent searches</Text>
            {history.length > 0 && (
              <Pressable onPress={clearHistory}>
                <Text style={styles.clearHistory}>Clear all</Text>
              </Pressable>
            )}
          </View>
          {history.length === 0 ? (
            <View style={styles.noHistory}>
              <Text style={styles.noHistoryIcon}>⌕</Text>
              <Text style={styles.noHistoryTitle}>Start searching Cartly</Text>
              <Text style={styles.noHistoryCopy}>
                Products and categories you search for will appear here.
              </Text>
            </View>
          ) : (
            history.map(item => (
              <View key={item} style={styles.historyItem}>
                <Pressable
                  onPress={() => runSearch(item)}
                  style={styles.historySearch}
                >
                  <Text style={styles.historyClock}>↺</Text>
                  <Text style={styles.historyText}>{item}</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Remove ${item}`}
                  onPress={() => removeSearch(item)}
                >
                  <Text style={styles.removeHistory}>×</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      ) : (
        <FlatList
          columnWrapperStyle={
            results.length > 0 && suggestions.length === 0
              ? styles.productRow
              : undefined
          }
          contentContainerStyle={styles.listContent}
          data={suggestions.length > 0 ? [] : results}
          keyExtractor={product => product.id}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            suggestions.length > 0 ? null : loading ? (
              <View style={styles.stateCard}>
                <ActivityIndicator color="#D94F04" size="large" />
                <Text style={styles.stateTitle}>Searching Cartly</Text>
                <Text style={styles.stateCopy}>
                  Checking products and categories…
                </Text>
              </View>
            ) : error ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateIcon}>!</Text>
                <Text style={styles.stateTitle}>Search is unavailable</Text>
                <Text style={styles.stateCopy}>{error}</Text>
                <Pressable
                  onPress={() => setReloadKey(value => value + 1)}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.stateCard}>
                <Text style={styles.stateIcon}>⌕</Text>
                <Text style={styles.stateTitle}>No matching products</Text>
                <Text style={styles.stateCopy}>
                  {selectedCategory
                    ? `There are currently no active products in ${selectedCategory.name}.`
                    : 'Try a shorter product name, another category, or check the spelling.'}
                </Text>
                <Pressable
                  onPress={() =>
                    navigation.navigate('MainTabs', { screen: 'Categories' })
                  }
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>
                    Browse all products
                  </Text>
                </Pressable>
              </View>
            )
          }
          numColumns={2}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ProductCard
              onPress={() =>
                navigation.navigate('ProductDetails', { productId: item.id })
              }
              product={item}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F5F7' },
  searchWrap: {
    backgroundColor: '#101820',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  searchBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingLeft: 14,
    overflow: 'hidden',
  },
  searchIcon: { color: '#34434D', fontSize: 25, marginRight: 9 },
  input: { flex: 1, color: '#101820', fontSize: 15, paddingVertical: 0 },
  clear: { color: '#748089', fontSize: 25, paddingHorizontal: 9 },
  submitButton: {
    height: 54,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB000',
  },
  submitPressed: { backgroundColor: '#E99F00' },
  submitText: { color: '#101820', fontSize: 12, fontWeight: '900' },
  listContent: { flexGrow: 1, paddingBottom: 28 },
  productRow: { justifyContent: 'space-between', paddingHorizontal: 12 },
  resultHeading: { paddingHorizontal: 17, paddingTop: 22, paddingBottom: 17 },
  resultEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultEyebrow: {
    color: '#B64C0A',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  categoryBadge: {
    backgroundColor: '#FFF0D1',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: { color: '#875700', fontSize: 9, fontWeight: '800' },
  resultTitle: {
    color: '#101820',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    marginTop: 7,
  },
  resultCount: { color: '#76828A', fontSize: 12, marginTop: 5 },
  suggestionsCard: {
    margin: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDE2E5',
  },
  suggestionTitle: {
    color: '#101820',
    fontSize: 13,
    fontWeight: '900',
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 8,
  },
  suggestionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E8EA',
  },
  rowPressed: { backgroundColor: '#F1F3F4' },
  suggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F3F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionIconText: { color: '#43515B', fontSize: 18 },
  suggestionCopy: { flex: 1, marginLeft: 11 },
  suggestionText: { color: '#26333C', fontSize: 13, fontWeight: '700' },
  suggestionMeta: { color: '#849099', fontSize: 10, marginTop: 2 },
  suggestionArrow: { color: '#9AA4AA', fontSize: 24 },
  historyCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  historyHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: { color: '#101820', fontSize: 19, fontWeight: '900' },
  clearHistory: { color: '#C34E08', fontSize: 11, fontWeight: '800' },
  historyItem: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E1E5E8',
  },
  historySearch: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  historyClock: { color: '#89949C', fontSize: 18, marginRight: 11 },
  historyText: { color: '#3D4A53', fontSize: 13 },
  removeHistory: { color: '#87929A', fontSize: 22, padding: 8 },
  noHistory: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 28 },
  noHistoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF1F3',
    color: '#52616B',
    fontSize: 25,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  noHistoryTitle: {
    color: '#26333C',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 16,
  },
  noHistoryCopy: {
    color: '#7A868E',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  stateCard: {
    alignItems: 'center',
    margin: 12,
    paddingTop: 62,
    paddingHorizontal: 30,
  },
  stateIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFF0CE',
    color: '#A56700',
    fontSize: 27,
    fontWeight: '900',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  stateTitle: {
    color: '#101820',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 17,
  },
  stateCopy: {
    color: '#78848C',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
  },
  primaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101820',
    borderRadius: 10,
    paddingHorizontal: 22,
    marginTop: 20,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
});

export default SearchResultsScreen;
