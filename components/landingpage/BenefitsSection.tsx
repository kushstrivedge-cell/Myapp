import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

const benefits = [
  {symbol: '24', title: 'Fast delivery', detail: 'At your door quickly'},
  {symbol: '✓', title: 'Secure payment', detail: 'Protected checkout'},
  {symbol: '↺', title: 'Easy returns', detail: '7-day return window'},
  {symbol: '?', title: 'We’re here', detail: 'Customer support'},
];

function BenefitsSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Shopping made simple</Text>
      <View style={styles.grid}>
        {benefits.map(benefit => (
          <View key={benefit.title} style={styles.benefit}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>{benefit.symbol}</Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{benefit.title}</Text>
              <Text style={styles.detail}>{benefit.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {paddingHorizontal: 16, paddingTop: 28, paddingBottom: 34},
  heading: {color: '#101820', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 20},
  grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'},
  benefit: {width: '48%', minHeight: 76, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 11, marginBottom: 10},
  iconCircle: {width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0CE', alignItems: 'center', justifyContent: 'center', marginRight: 9},
  icon: {color: '#A56700', fontSize: 13, fontWeight: '900'},
  copy: {flex: 1},
  title: {color: '#26323B', fontSize: 11, fontWeight: '900', marginBottom: 3},
  detail: {color: '#7A858E', fontSize: 9, lineHeight: 13},
});

export default BenefitsSection;
