import {apiPost} from './apiClient';
export type RazorpaySession = {keyId:string;providerOrderId:string;amount:number;currency:string;demo:true};
export type RazorpaySuccess = {razorpay_payment_id:string;razorpay_order_id:string;razorpay_signature:string};
export const paymentApi = {
  initialize:(orderId:string,idempotencyKey:string)=>apiPost<RazorpaySession>('/payments/initialize',{orderId,idempotencyKey}),
  verify:(orderId:string,result:RazorpaySuccess)=>apiPost<{verified:true;demo:true}>('/payments/verify',{orderId,...result}),
  failed:(orderId:string,failure:{razorpay_order_id?:string;code?:string;description?:string})=>apiPost<{retryAllowed:boolean}>('/payments/failed',{orderId,...failure}),
};
