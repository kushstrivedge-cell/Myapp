import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useCatalogue} from '../../src/context/CatalogueContext';
import ProductCard from './ProductCard';

type FeaturedProductsProps = {
  onProductPress: (productId: string) => void;
  onViewAll: () => void;
};

function FeaturedProducts({onProductPress, onViewAll}: FeaturedProductsProps) {
  const {products} = useCatalogue();
  const featured = products.slice(3, 7);
  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.title}>Featured for you</Text>
          <Text style={styles.subtitle}>Popular choices across Cartly</Text>
        </View>
        <Pressable onPress={onViewAll}>
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {featured.map(product => <ProductCard key={product.id} onPress={() => onProductPress(product.id)} product={product} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {backgroundColor: '#FFFFFF', paddingTop: 24, paddingBottom: 15},
  headingRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 15},
  title: {color: '#101820', fontSize: 21, fontWeight: '900'},
  subtitle: {color: '#76818A', fontSize: 11, marginTop: 3},
  viewAll: {color: '#D94F04', fontSize: 12, fontWeight: '800'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 12},
});

export default FeaturedProducts;
