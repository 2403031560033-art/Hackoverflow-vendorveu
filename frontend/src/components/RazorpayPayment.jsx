import { useState } from 'react';
import axios from 'axios';

export default function RazorpayPayment({ 
  amount, 
  description, 
  onSuccess, 
  onError,
  customerPhone,
  orderId,
  type = 'order' // 'order' or 'wallet'
}) {
  const [loading, setLoading] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay');
      }

      // Create order on backend
      const orderResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/payment/create-order`,
        {
          amount,
          customerId: customerPhone,
          orderId,
          receipt: `${type}_${Date.now()}`
        }
      );

      const { orderId: razorpayOrderId, key_id } = orderResponse.data;

      // Razorpay options
      const options = {
        key: key_id,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: 'vendorvue',
        description: description || 'Payment for VendorVue',
        order_id: razorpayOrderId,
        prefill: {
          contact: customerPhone,
        },
        handler: async (response) => {
          try {
            // Verify payment on backend
            const verifyResponse = await axios.post(
              `${import.meta.env.VITE_API_URL}/api/payment/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId,
                customerId: customerPhone
              }
            );

            if (verifyResponse.data.success) {
              onSuccess(verifyResponse.data);
            } else {
              onError('Payment verification failed');
            }
          } catch (error) {
            onError(error.response?.data?.error || 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            onError('Payment cancelled');
          }
        },
        theme: {
          color: '#EA580C' // VendorVue orange color
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      onError(error.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading || !amount || amount <= 0}
      className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <span className="animate-spin">⏳</span>
          Processing...
        </>
      ) : (
        <>
          💳 Pay ₹{amount.toFixed(2)} via Razorpay
        </>
      )}
    </button>
  );
}
