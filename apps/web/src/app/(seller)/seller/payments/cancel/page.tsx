import { Suspense } from 'react';
import { SellerPaymentReturn } from '@/components/listing-commerce/seller-payment-return';

export default function SellerPaymentCancelPage() {
  return (
    <Suspense>
      <SellerPaymentReturn outcome="cancel" />
    </Suspense>
  );
}
