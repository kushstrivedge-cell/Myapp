import React, {useEffect, useMemo, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ActivityIndicator, FlatList, Pressable, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import ProductCard from '../../components/landingpage/ProductCard';
import {useSearchHistory} from '../context/SearchContext';
import {useCatalogue} from '../context/CatalogueContext';
import {CatalogueProduct} from '../data/products';
import {RootStackParamList} from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'SearchResults'>;

function SearchResultsScreen({navigation, route}: Props) {
  const [query, setQuery] = useState(route.params?.query ?? '');
  const [submittedQuery, setSubmittedQuery] = useState(route.params?.query ?? '');
  const [results, setResults] = useState<CatalogueProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const {history, addSearch, removeSearch, clearHistory} = useSearchHistory();
  const {products, listProducts} = useCatalogue();

  useEffect(() => {
    if (!submittedQuery.trim()) {
      setResults([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    listProducts({q: submittedQuery.trim(), limit: 50})
      .then(result => {
        if (active) setResults(result.items);
      })
      .catch(requestError => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Search failed.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [listProducts, reloadKey, submittedQuery]);

  const suggestions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery || cleanQuery === submittedQuery.trim().toLowerCase()) return [];
    return products
      .filter(product => `${product.name} ${product.category}`.toLowerCase().includes(cleanQuery))
      .slice(0, 5);
  }, [products, query, submittedQuery]);

  const runSearch = (nextQuery = query) => {
    const cleanQuery = nextQuery.trim();
    if (!cleanQuery) return;
    setQuery(cleanQuery);
    setSubmittedQuery(cleanQuery);
    addSearch(cleanQuery);
    navigation.setParams({query: cleanQuery});
  };

  const searchHeader = (
    <View>
      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          <Text style={styles.sectionTitle}>Suggestions</Text>
          {suggestions.map(product => (
            <Pressable key={product.id} onPress={() => runSearch(product.name)} style={styles.suggestion}>
              <Text style={styles.suggestionIcon}>⌕</Text>
              <Text numberOfLines={1} style={styles.suggestionText}>{product.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {submittedQuery.length > 0 && suggestions.length === 0 && (
        <View style={styles.resultHeading}>
          <Text style={styles.resultTitle}>Results for “{submittedQuery}”</Text>
          <Text style={styles.resultCount}>{results.length} products</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            autoFocus={!route.params?.query}
            onChangeText={setQuery}
            onSubmitEditing={() => runSearch()}
            placeholder="Search Cartly"
            placeholderTextColor="#7D878F"
            returnKeyType="search"
            style={styles.input}
            value={query}
          />
          {query.length > 0 && <Pressable onPress={() => {setQuery(''); setSubmittedQuery('');}}><Text style={styles.clear}>×</Text></Pressable>}
        </View>
      </View>

      {!query && !submittedQuery ? (
        <View style={styles.historyWrap}>
          <View style={styles.historyHeading}>
            <Text style={styles.historyTitle}>Recent searches</Text>
            {history.length > 0 && <Pressable onPress={clearHistory}><Text style={styles.clearHistory}>Clear all</Text></Pressable>}
          </View>
          {history.length === 0 ? (
            <View style={styles.noHistory}><Text style={styles.noHistoryTitle}>No recent searches</Text><Text style={styles.noHistoryCopy}>Your searches will appear here.</Text></View>
          ) : history.map(item => (
            <View key={item} style={styles.historyItem}>
              <Pressable onPress={() => runSearch(item)} style={styles.historySearch}><Text style={styles.historyClock}>↺</Text><Text style={styles.historyText}>{item}</Text></Pressable>
              <Pressable accessibilityLabel={`Remove ${item}`} onPress={() => removeSearch(item)}><Text style={styles.removeHistory}>×</Text></Pressable>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          data={suggestions.length > 0 ? [] : results}
          keyExtractor={product => product.id}
          ListEmptyComponent={suggestions.length === 0 ? loading ? <View style={styles.empty}><ActivityIndicator color="#D94F04" size="large" /><Text style={styles.emptyCopy}>Searching products…</Text></View> : error ? <View style={styles.empty}><Text style={styles.emptyTitle}>Search unavailable</Text><Text style={styles.emptyCopy}>{error}</Text><Pressable onPress={() => setReloadKey(value => value + 1)} style={styles.browseButton}><Text style={styles.browseText}>Try again</Text></Pressable></View> : <View style={styles.empty}><Text style={styles.emptySymbol}>?</Text><Text style={styles.emptyTitle}>Nothing matched your search</Text><Text style={styles.emptyCopy}>Check the spelling or try a broader term.</Text><Pressable onPress={() => navigation.navigate('MainTabs', {screen: 'Categories'})} style={styles.browseButton}><Text style={styles.browseText}>Browse all products</Text></Pressable></View> : null}
          ListHeaderComponent={searchHeader}
          numColumns={2}
          renderItem={({item}) => <ProductCard onPress={() => navigation.navigate('ProductDetails', {productId: item.id})} product={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F5F6F8'}, searchWrap: {backgroundColor: '#101820', paddingHorizontal: 13, paddingBottom: 13},
  searchBar: {height: 47, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 9, paddingHorizontal: 11}, searchIcon: {color: '#34414A', fontSize: 24, marginRight: 7},
  input: {flex: 1, color: '#101820', fontSize: 13, paddingVertical: 0}, clear: {color: '#69747C', fontSize: 24, paddingHorizontal: 5},
  listContent: {paddingBottom: 25}, row: {justifyContent: 'space-between', paddingHorizontal: 12}, suggestions: {backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 15, paddingBottom: 8, marginBottom: 10},
  sectionTitle: {color: '#101820', fontSize: 14, fontWeight: '900', marginBottom: 7}, suggestion: {height: 44, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E1E5E8'}, suggestionIcon: {color: '#7A858D', fontSize: 19, marginRight: 9}, suggestionText: {flex: 1, color: '#43505A', fontSize: 11},
  resultHeading: {paddingHorizontal: 16, paddingVertical: 17}, resultTitle: {color: '#101820', fontSize: 17, fontWeight: '900'}, resultCount: {color: '#7A858D', fontSize: 10, marginTop: 4},
  historyWrap: {backgroundColor: '#FFFFFF', paddingHorizontal: 17, paddingTop: 20}, historyHeading: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}, historyTitle: {color: '#101820', fontSize: 17, fontWeight: '900'}, clearHistory: {color: '#D94F04', fontSize: 10, fontWeight: '800'},
  historyItem: {height: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E4E7'}, historySearch: {flex: 1, flexDirection: 'row', alignItems: 'center'}, historyClock: {color: '#89939A', fontSize: 17, marginRight: 10}, historyText: {color: '#43505A', fontSize: 12}, removeHistory: {color: '#8A949B', fontSize: 22, padding: 7},
  noHistory: {alignItems: 'center', paddingTop: 70}, noHistoryTitle: {color: '#34414A', fontSize: 16, fontWeight: '900'}, noHistoryCopy: {color: '#89939A', fontSize: 10, marginTop: 5},
  empty: {alignItems: 'center', paddingTop: 60, paddingHorizontal: 25}, emptySymbol: {width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF0CE', color: '#A56700', fontSize: 22, fontWeight: '900', textAlign: 'center', textAlignVertical: 'center'}, emptyTitle: {color: '#101820', fontSize: 18, fontWeight: '900', marginTop: 15}, emptyCopy: {color: '#7A858D', fontSize: 11, marginTop: 5},
  browseButton: {backgroundColor: '#101820', borderRadius: 8, paddingHorizontal: 17, paddingVertical: 12, marginTop: 18}, browseText: {color: '#FFFFFF', fontSize: 10, fontWeight: '900'},
});

export default SearchResultsScreen;
