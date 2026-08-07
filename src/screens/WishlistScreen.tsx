import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import ProductCard from '../../components/landingpage/ProductCard';
import { useWishlist } from '../context/WishlistContext';
import { RootStackParamList } from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'Wishlist'>;

function WishlistScreen({ navigation }: Props) {
  const { items, count, clearWishlist } = useWishlist();

  if (items.length === 0) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#101820" />
        <View style={styles.empty}>
          <View style={styles.heartCircle}>
            <Heart color="#D83B38" size={52} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Save what you love</Text>
          <Text style={styles.emptyCopy}>
            Tap the heart on a product and it will appear in your wishlist.
          </Text>
          <Pressable
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Categories' })
            }
            style={styles.shopButton}
          >
            <Text style={styles.shopText}>Explore products</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <FlatList
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={product => product.id}
        ListHeaderComponent={
          <View style={styles.heading}>
            <View>
              <Text style={styles.eyebrow}>SAVED FOR LATER</Text>
              <Text style={styles.title}>
                {count} {count === 1 ? 'favourite' : 'favourites'}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                Alert.alert(
                  'Clear wishlist?',
                  'This removes all saved products.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: clearWishlist,
                    },
                  ],
                )
              }
            >
              <Text style={styles.clear}>Clear all</Text>
            </Pressable>
          </View>
        }
        numColumns={2}
        renderItem={({ item }) => (
          <ProductCard
            onPress={() =>
              navigation.navigate('ProductDetails', { productId: item.id })
            }
            product={item}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6F8' },
  listContent: { paddingBottom: 25 },
  row: { justifyContent: 'space-between', paddingHorizontal: 12 },
  heading: {
    height: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 17,
    marginBottom: 13,
  },
  eyebrow: {
    color: '#D94F04',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginBottom: 5,
  },
  title: { color: '#101820', fontSize: 23, fontWeight: '900' },
  clear: { color: '#C43D2C', fontSize: 10, fontWeight: '800', padding: 7 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  heartCircle: {
    width: 105,
    height: 105,
    borderRadius: 53,
    backgroundColor: '#FFE7E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#101820',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 20,
  },
  emptyCopy: {
    color: '#76818A',
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
  },
  shopButton: {
    backgroundColor: '#101820',
    borderRadius: 9,
    paddingHorizontal: 19,
    paddingVertical: 13,
    marginTop: 20,
  },
  shopText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
});

export default WishlistScreen;
