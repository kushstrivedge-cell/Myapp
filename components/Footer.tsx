import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

const footerGroups = [
  {
    title: 'Shop',
    links: ['Today’s Deals', 'Gift Cards', 'New Arrivals', 'Best Sellers'],
  },
  {
    title: 'Let us help you',
    links: ['Your Account', 'Your Orders', 'Returns Centre', 'Help & Support'],
  },
];

type FooterProps = {
  onLinkPress: (link: string) => void;
  onPrivacy: () => void;
  onTerms: () => void;
};

function Footer({ onLinkPress, onPrivacy, onTerms }: FooterProps) {
  const openPlaceholder = (label: string) => {
    Alert.alert(label, `${label} page will open here.`);
  };

  return (
    <View accessibilityRole="summary" style={styles.footer}>
      <View style={styles.main}>
        <View style={styles.brandWrap}>
          <Text style={styles.brand}>cartly</Text>
          <View style={styles.brandDot} />
        </View>
        <Text style={styles.tagline}>Shop smart. Live better.</Text>

        <View style={styles.linkGrid}>
          {footerGroups.map(group => (
            <View key={group.title} style={styles.linkGroup}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.links.map(link => (
                <Pressable
                  accessibilityRole="link"
                  key={link}
                  onPress={() => onLinkPress(link)}
                  style={({ pressed }) => [
                    styles.linkButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.linkText}>{link}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.socialRow}>
          {['f', 'in', 'X', 'ig'].map(social => (
            <Pressable
              accessibilityLabel={`Open ${social} social page`}
              accessibilityRole="link"
              key={social}
              onPress={() => openPlaceholder('Social media')}
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.socialText}>{social}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.legal}>
        <View style={styles.legalLinks}>
          <Pressable onPress={onPrivacy}>
            <Text style={styles.legalText}>Privacy</Text>
          </Pressable>
          <Text style={styles.separator}>•</Text>
          <Pressable onPress={onTerms}>
            <Text style={styles.legalText}>Terms</Text>
          </Pressable>
        </View>
        <Text style={styles.copyright}>
          © {new Date().getFullYear()} Cartly Retail Pvt. Ltd.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { backgroundColor: '#101820' },
  main: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 28 },
  brandWrap: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFB000',
    marginBottom: 5,
    marginLeft: 2,
  },
  tagline: {
    color: '#9EABB5',
    textAlign: 'center',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 30,
  },
  linkGrid: { flexDirection: 'row' },
  linkGroup: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
  groupTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  linkButton: { paddingVertical: 6 },
  linkText: {
    color: '#C9D0D6',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 28,
  },
  socialButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#53616C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  legal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#3A4650',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  legalLinks: { flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  legalText: { color: '#C9D0D6', fontSize: 12, paddingHorizontal: 6 },
  separator: { color: '#65727C', fontSize: 10 },
  copyright: { color: '#7E8B95', fontSize: 11 },
  pressed: { opacity: 0.6 },
});

export default Footer;
