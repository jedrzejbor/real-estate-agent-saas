import { Suspense } from 'react';
import { SellerPaymentReturn } from '@/components/listing-commerce/seller-payment-return';

export default function SellerPaymentSuccessPage() {
  return (
    <Suspense>
      <SellerPaymentReturn outcome="success" />
    </Suspense>
  );
}
