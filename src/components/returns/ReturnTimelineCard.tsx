import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ReturnRequest } from '../../services/fulfilmentApi';

type Props = { item: ReturnRequest; onSchedulePickup: () => void };
const progress = [
  'REQUESTED',
  'APPROVED',
  'PICKUP_SCHEDULED',
  'RECEIVED',
  'REFUNDED',
] as const;
const labels: Record<ReturnRequest['status'], string> = {
  REQUESTED: 'Return requested',
  APPROVED: 'Return approved',
  REJECTED: 'Return rejected',
  PICKUP_SCHEDULED: 'Pickup scheduled',
  RECEIVED: 'Item received',
  REFUNDED: 'Refund completed',
};

export default function ReturnTimelineCard({ item, onSchedulePickup }: Props) {
  const rejected = item.status === 'REJECTED';
  const steps: readonly ReturnRequest['status'][] = rejected
    ? ['REQUESTED', 'REJECTED']
    : progress;
  const currentIndex = Math.max(0, steps.indexOf(item.status));
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.order}>{item.order.number}</Text>
          <Text style={styles.reason}>{item.reason}</Text>
        </View>
        <View style={[styles.badge, rejected && styles.rejectedBadge]}>
          <Text style={[styles.badgeText, rejected && styles.rejectedText]}>
            {rejected ? '×' : '✓'} {labels[item.status]}
          </Text>
        </View>
      </View>
      <View style={styles.timeline}>
        {steps.map((status, index) => {
          const reached = index <= currentIndex;
          const current = index === currentIndex;
          const event = item.events.find(value => value.status === status);
          return (
            <View key={status} style={styles.step}>
              <View style={styles.markerColumn}>
                <View
                  style={[
                    styles.dot,
                    reached && styles.reachedDot,
                    rejected && current && styles.rejectedDot,
                  ]}
                >
                  {reached && (
                    <Text style={styles.check}>
                      {rejected && current ? '×' : '✓'}
                    </Text>
                  )}
                </View>
                {index < steps.length - 1 && (
                  <View
                    style={[
                      styles.line,
                      index < currentIndex && styles.reachedLine,
                    ]}
                  />
                )}
              </View>
              <View style={styles.stepCopy}>
                <Text
                  style={[
                    styles.stepTitle,
                    !reached && styles.future,
                    rejected && current && styles.rejectedText,
                  ]}
                >
                  {labels[status]}
                  {current ? ' · Current' : ''}
                </Text>
                {(status === 'REQUESTED' || current) && (
                  <Text style={styles.date}>
                    {new Date(
                      event?.createdAt ??
                        (status === 'REQUESTED'
                          ? item.createdAt
                          : item.updatedAt),
                    ).toLocaleString('en-IN')}
                  </Text>
                )}
                {!!event?.message && (
                  <Text style={styles.eventMessage}>{event.message}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
      {!!item.adminNote && (
        <Text style={styles.note}>Admin: {item.adminNote}</Text>
      )}
      <Text style={styles.refund}>
        Refund: {item.refundStatus.replaceAll('_', ' ')}
      </Text>
      {item.status === 'APPROVED' && (
        <Pressable onPress={onSchedulePickup} style={styles.button}>
          <Text style={styles.buttonText}>Schedule pickup</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headingCopy: { flex: 1 },
  order: { color: '#26343D', fontSize: 11, fontWeight: '900' },
  reason: { color: '#7B858D', fontSize: 9, marginTop: 4 },
  badge: {
    backgroundColor: '#E2F4EB',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  badgeText: { color: '#19714C', fontSize: 8, fontWeight: '900' },
  rejectedBadge: { backgroundColor: '#FDE7E5' },
  rejectedText: { color: '#B7352C' },
  timeline: { marginTop: 16 },
  step: { minHeight: 52, flexDirection: 'row' },
  markerColumn: { width: 27, alignItems: 'center' },
  dot: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CAD1D5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reachedDot: { borderColor: '#23835C', backgroundColor: '#23835C' },
  rejectedDot: { borderColor: '#C43D2C', backgroundColor: '#C43D2C' },
  check: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', lineHeight: 11 },
  line: { width: 2, flex: 1, backgroundColor: '#DCE1E4' },
  reachedLine: { backgroundColor: '#23835C' },
  stepCopy: { flex: 1, paddingBottom: 12 },
  stepTitle: { color: '#2E3C45', fontSize: 10, fontWeight: '900' },
  future: { color: '#98A1A7' },
  date: { color: '#8A949B', fontSize: 8, marginTop: 4 },
  eventMessage: {
    color: '#65717A',
    fontSize: 8,
    lineHeight: 13,
    marginTop: 3,
  },
  note: {
    color: '#59666F',
    backgroundColor: '#F3F5F6',
    borderRadius: 7,
    fontSize: 9,
    lineHeight: 14,
    padding: 9,
  },
  refund: { color: '#65717A', fontSize: 8, fontWeight: '800', marginTop: 9 },
  button: {
    height: 39,
    borderRadius: 8,
    backgroundColor: '#23835C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 11,
  },
  buttonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
});
