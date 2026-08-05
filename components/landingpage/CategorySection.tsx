import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useCatalogue} from '../../src/context/CatalogueContext';

const colors = ['#DDEEFF', '#FFE0E5', '#E3F1DF', '#F2E3F6', '#FFF0CE', '#E0EEEE'];

type CategorySectionProps = {
  onSelectCategory: (category: string) => void;
  onViewAll: () => void;
};

function CategorySection({onSelectCategory, onViewAll}: CategorySectionProps) {
  const {categories} = useCatalogue();
  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={styles.title}>Shop by category</Text>
        <Pressable onPress={onViewAll}>
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categories.map((category, index) => (
          <Pressable
            accessibilityRole="button"
            key={category.name}
            onPress={() => onSelectCategory(category.name)}
            style={({pressed}) => [styles.category, pressed && styles.pressed]}>
            <View style={[styles.categoryArt, {backgroundColor: colors[index % colors.length]}]}>
              <Text style={styles.symbol}>{category.name.charAt(0)}</Text>
            </View>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.productCount}>{category.productCount}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {backgroundColor: '#FFFFFF', paddingTop: 20, paddingBottom: 22},
  headingRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 15},
  title: {color: '#101820', fontSize: 20, fontWeight: '900'},
  viewAll: {color: '#D94F04', fontSize: 12, fontWeight: '800'},
  category: {width: 86, alignItems: 'center', marginLeft: 12},
  categoryArt: {width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginBottom: 8},
  symbol: {color: '#263642', fontSize: 27, fontWeight: '900'},
  categoryName: {color: '#34414B', fontSize: 12, fontWeight: '700', textAlign: 'center'},
  productCount: {color: '#89939A', fontSize: 9, marginTop: 2},
  pressed: {opacity: 0.6},
});

export default CategorySection;
