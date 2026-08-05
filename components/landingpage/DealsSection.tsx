import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useCatalogue} from '../../src/context/CatalogueContext';
import ProductCard from './ProductCard';

type DealsSectionProps = {
  onProductPress: (productId: string) => void;
  onViewAll: () => void;
};

function DealsSection({onProductPress, onViewAll}: DealsSectionProps) {
  const {products} = useCatalogue();
  const deals = products.filter(product => product.oldPrice !== undefined).slice(0, 6);
  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.title}>Today’s deals</Text>
          <Text style={styles.subtitle}>Limited-time prices</Text>
        </View>
        <Pressable onPress={onViewAll}>
          <Text style={styles.viewAll}>See all</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.products} horizontal showsHorizontalScrollIndicator={false}>
        {deals.map(product => <ProductCard compact key={product.id} onPress={() => onProductPress(product.id)} product={product} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {paddingTop: 24, paddingBottom: 16},
  headingRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 14},
  title: {color: '#101820', fontSize: 21, fontWeight: '900'},
  subtitle: {color: '#76818A', fontSize: 11, marginTop: 3},
  viewAll: {color: '#D94F04', fontSize: 12, fontWeight: '800'},
  products: {paddingLeft: 16, paddingRight: 4},
});

export default DealsSection;
