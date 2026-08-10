import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './navigationTypes';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['cartly://'],
  config: {
    screens: {
      OrderTracking: 'orders/:orderId/track',
    },
  },
};
