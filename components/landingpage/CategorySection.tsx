import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Headphones,
  House,
  type LucideIcon,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
} from 'lucide-react-native';
import { useCatalogue } from '../../src/context/CatalogueContext';

const categoryIcons: Record<string, LucideIcon> = {
  mobiles: Smartphone,
  electronics: Headphones,
  fashion: Shirt,
  home: House,
  beauty: Sparkles,
  grocery: ShoppingBasket,
};

type CategorySectionProps = {
  onSelectCategory: (category: string) => void;
  onViewAll: () => void;
};

function CategorySection({
  onSelectCategory,
  onViewAll,
}: CategorySectionProps) {
  const { categories } = useCatalogue();

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={styles.title}>Shop by category</Text>
        <Pressable onPress={onViewAll}>
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categories.map(category => {
          const CategoryIcon =
            categoryIcons[category.name.toLowerCase()] ?? ShoppingBag;

          return (
            <Pressable
              accessibilityLabel={`Shop ${category.name}`}
              accessibilityRole="button"
              key={category.name}
              onPress={() => onSelectCategory(category.name)}
              style={({ pressed }) => [
                styles.category,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.categoryArt}>
                <CategoryIcon color="#34414B" size={34} strokeWidth={1.8} />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: '#FFFFFF', paddingTop: 20, paddingBottom: 22 },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  title: { color: '#101820', fontSize: 20, fontWeight: '900' },
  viewAll: { color: '#D94F04', fontSize: 12, fontWeight: '800' },
  category: { width: 86, alignItems: 'center', marginLeft: 12 },
  categoryArt: {
    width: 70,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryName: {
    color: '#34414B',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: { opacity: 0.55 },
});

export default CategorySection;
