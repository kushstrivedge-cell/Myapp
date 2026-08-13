declare module 'react-native-razorpay' {
  type Success = {razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string};
  type Failure = {code?: string | number; description?: string; metadata?: {order_id?: string; payment_id?: string}};
  export default class RazorpayCheckout {
    static open(options: Record<string, unknown>): Promise<Success>;
  }
}
