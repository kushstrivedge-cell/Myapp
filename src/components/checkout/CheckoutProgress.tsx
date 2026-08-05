import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

const labels = ['Address', 'Shipping', 'Payment', 'Review'];

function CheckoutProgress({step}: {step: number}) {
  return (
    <View style={styles.wrapper}>
      {labels.map((label, index) => {
        const number = index + 1;
        const active = number <= step;
        return (
          <React.Fragment key={label}>
            {index > 0 && <View style={[styles.line, active && styles.activeLine]} />}
            <View style={styles.step}>
              <View style={[styles.circle, active && styles.activeCircle]}>
                <Text style={[styles.number, active && styles.activeNumber]}>{number < step ? '✓' : number}</Text>
              </View>
              <Text style={[styles.label, number === step && styles.activeLabel]}>{label}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {height: 74, flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingTop: 13},
  step: {width: 56, alignItems: 'center'},
  line: {flex: 1, height: 2, backgroundColor: '#D7DCE0', marginTop: 13, marginHorizontal: -10},
  activeLine: {backgroundColor: '#E85D04'},
  circle: {width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8ECEF', alignItems: 'center', justifyContent: 'center'},
  activeCircle: {backgroundColor: '#E85D04'},
  number: {color: '#76818A', fontSize: 10, fontWeight: '900'},
  activeNumber: {color: '#FFFFFF'},
  label: {color: '#89939A', fontSize: 8, fontWeight: '700', marginTop: 6},
  activeLabel: {color: '#D94F04', fontWeight: '900'},
});

export default CheckoutProgress;
