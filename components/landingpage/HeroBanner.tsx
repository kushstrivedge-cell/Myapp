import React, {useEffect, useRef, useState} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const slides = [
  {
    eyebrow: 'FRESH PICKS',
    title: 'Big style.\nSmaller prices.',
    subtitle: 'Save up to 50% on this week’s favourites.',
    button: 'Shop now',
    letter: 'C',
    background: '#FFF0D4',
    circle: '#FFD36A',
    product: '#E85D04',
  },
  {
    eyebrow: 'TECH WEEK',
    title: 'Upgrade your\neveryday.',
    subtitle: 'Smart gadgets and accessories from ₹499.',
    button: 'Explore tech',
    letter: 'T',
    background: '#DCEEFF',
    circle: '#9BCBFA',
    product: '#286A9E',
  },
  {
    eyebrow: 'HOME REFRESH',
    title: 'Make space\nfeel like home.',
    subtitle: 'Fresh finds for every room, up to 40% off.',
    button: 'Shop home',
    letter: 'H',
    background: '#E4F1DF',
    circle: '#B5D5A7',
    product: '#477A43',
  },
];

function HeroBanner({onShopNow}: {onShopNow: () => void}) {
  const {width} = useWindowDimensions();
  const bannerWidth = width - 32;
  const sliderRef = useRef<ScrollView>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextSlide = (activeSlide + 1) % slides.length;
      sliderRef.current?.scrollTo({
        x: nextSlide * bannerWidth,
        animated: true,
      });
      setActiveSlide(nextSlide);
    }, 3500);

    return () => clearTimeout(timer);
  }, [activeSlide, bannerWidth]);

  const updateActiveSlide = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextSlide = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
    setActiveSlide(nextSlide);
  };

  const goToSlide = (index: number) => {
    sliderRef.current?.scrollTo({x: index * bannerWidth, animated: true});
    setActiveSlide(index);
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={updateActiveSlide}
        pagingEnabled
        ref={sliderRef}
        showsHorizontalScrollIndicator={false}>
        {slides.map((slide, index) => (
          <View
            key={slide.eyebrow}
            style={[styles.banner, {width: bannerWidth, backgroundColor: slide.background}]}>
            <View style={styles.copyArea}>
              <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={onShopNow}
                style={({pressed}) => [styles.button, pressed && styles.pressed]}>
                <Text style={styles.buttonText}>{slide.button}  →</Text>
              </Pressable>
            </View>

            <View
              accessibilityLabel={`Slide ${index + 1} product illustration`}
              style={styles.artArea}>
              <View style={[styles.sun, {backgroundColor: slide.circle}]} />
              <View style={styles.bagHandle} />
              <View style={[styles.bag, {backgroundColor: slide.product}]}>
                <Text style={styles.bagLetter}>{slide.letter}</Text>
              </View>
              <View style={styles.smallBox} />
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {slides.map((slide, index) => (
          <Pressable
            accessibilityLabel={`Go to banner ${index + 1}`}
            accessibilityRole="button"
            hitSlop={8}
            key={slide.eyebrow}
            onPress={() => goToSlide(index)}
            style={[styles.dot, activeSlide === index && styles.activeDot]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6},
  banner: {minHeight: 220, borderRadius: 18, overflow: 'hidden', flexDirection: 'row'},
  copyArea: {flex: 1.15, paddingLeft: 22, paddingVertical: 25, zIndex: 2},
  eyebrow: {color: '#D94F04', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 8},
  title: {color: '#101820', fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: -0.8},
  subtitle: {color: '#5F5445', fontSize: 12, lineHeight: 17, marginTop: 8, maxWidth: 180},
  button: {alignSelf: 'flex-start', backgroundColor: '#101820', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 11, marginTop: 17},
  buttonText: {color: '#FFFFFF', fontSize: 12, fontWeight: '800'},
  artArea: {flex: 0.85, justifyContent: 'center', alignItems: 'center'},
  sun: {position: 'absolute', width: 155, height: 155, borderRadius: 80, right: -25, top: 25},
  bagHandle: {position: 'absolute', width: 58, height: 48, borderWidth: 8, borderColor: '#101820', borderBottomWidth: 0, borderTopLeftRadius: 29, borderTopRightRadius: 29, top: 55, right: 32},
  bag: {width: 98, height: 112, borderRadius: 12, alignItems: 'center', justifyContent: 'center', transform: [{rotate: '5deg'}]},
  bagLetter: {color: '#FFFFFF', fontSize: 45, fontWeight: '900'},
  smallBox: {position: 'absolute', width: 41, height: 41, backgroundColor: '#FFFFFF', borderRadius: 7, right: 6, bottom: 17, transform: [{rotate: '-9deg'}]},
  dots: {height: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  dot: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#CBD0D4'},
  activeDot: {width: 20, backgroundColor: '#E85D04'},
  pressed: {opacity: 0.7},
});

export default HeroBanner;
