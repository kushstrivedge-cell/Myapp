import React from 'react';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BenefitsSection from '../../components/landingpage/BenefitsSection';
import CategorySection from '../../components/landingpage/CategorySection';
import DealsSection from '../../components/landingpage/DealsSection';
import FeaturedProducts from '../../components/landingpage/FeaturedProducts';
import HeroBanner from '../../components/landingpage/HeroBanner';
import Footer from '../../components/Footer';
import Navbar from '../../components/Navbar';
import { useSearchHistory } from '../context/SearchContext';
import {
  AppTabParamList,
  RootStackParamList,
} from '../navigation/navigationTypes';
import { useCatalogue } from '../context/CatalogueContext';
import { useAuth } from '../context/AuthContext';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

function HomeScreen({ navigation }: Props) {
  const { addSearch } = useSearchHistory();
  const {
    error: catalogueError,
    loading: catalogueLoading,
    retry: retryCatalogue,
  } = useCatalogue();
  const { user } = useAuth();
  const rootNavigation =
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  const openCategory = (category?: string) => {
    const supportedCategory =
      category === 'Deals' || category === 'Appliances' ? undefined : category;
    navigation.navigate('Categories', { category: supportedCategory });
  };

  return (
    <View style={styles.screen}>
      <Navbar
        onOpenAccount={() => navigation.navigate('Account')}
        onOpenAddresses={() =>
          rootNavigation?.navigate(user ? 'Addresses' : 'Login')
        }
        onOpenCart={() => navigation.navigate('Cart')}
        onOpenCategories={() => openCategory()}
        onOpenWishlist={() => rootNavigation?.navigate('Wishlist')}
        onSearch={query => {
          addSearch(query);
          rootNavigation?.navigate('SearchResults', { query });
        }}
        onSelectCategory={openCategory}
      />
      <ScrollView contentContainerStyle={styles.page}>
        <HeroBanner onShopNow={() => openCategory()} />
        <CategorySection
          onSelectCategory={openCategory}
          onViewAll={() => openCategory()}
        />
        {catalogueLoading && (
          <View style={styles.catalogueState}>
            <ActivityIndicator color="#D94F04" />
            <Text style={styles.stateText}>Loading today’s catalogue…</Text>
          </View>
        )}
        {catalogueError && (
          <View style={styles.catalogueState}>
            <Text style={styles.errorText}>{catalogueError}</Text>
            <Pressable onPress={retryCatalogue} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
        <DealsSection
          onProductPress={productId =>
            rootNavigation?.navigate('ProductDetails', { productId })
          }
          onViewAll={() => openCategory()}
        />
        <FeaturedProducts
          onProductPress={productId =>
            rootNavigation?.navigate('ProductDetails', { productId })
          }
          onViewAll={() => openCategory()}
        />
        <BenefitsSection />
        <Footer
          onLinkPress={link => {
            if (link === 'Your Account') navigation.navigate('Account');
            else if (link === 'Your Orders') rootNavigation?.navigate('Orders');
            else if (link === 'Returns Centre')
              rootNavigation?.navigate('Returns');
            else if (link === 'Help & Support')
              rootNavigation?.navigate('HelpSupport');
            else openCategory();
          }}
          onPrivacy={() =>
            rootNavigation?.navigate('Legal', { document: 'privacy' })
          }
          onTerms={() =>
            rootNavigation?.navigate('Legal', { document: 'terms' })
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F8' },
  page: { flexGrow: 1 },
  catalogueState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  stateText: { color: '#69757D', fontSize: 11, marginTop: 8 },
  errorText: { color: '#A52A20', fontSize: 11, textAlign: 'center' },
  retryButton: {
    backgroundColor: '#101820',
    borderRadius: 7,
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  retryText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
});

export default HomeScreen;
