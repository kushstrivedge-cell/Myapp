import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

type PlaceholderScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
};

function PlaceholderScreen({eyebrow, title, description}: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F5F6F8'},
  content: {flex: 1, justifyContent: 'center', paddingHorizontal: 28},
  eyebrow: {color: '#D94F04', fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginBottom: 9},
  title: {color: '#101820', fontSize: 30, lineHeight: 37, fontWeight: '900', marginBottom: 11},
  description: {color: '#65717A', fontSize: 15, lineHeight: 23},
});

export default PlaceholderScreen;
