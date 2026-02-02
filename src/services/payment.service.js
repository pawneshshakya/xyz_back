const { Cashfree, CFEnvironment } = require('cashfree-pg');

const cf = new Cashfree();
cf.XClientId = process.env.CASHFREE_APP_ID;
cf.XClientSecret = process.env.CASHFREE_SECRET_KEY;
cf.XEnvironment = process.env.CASHFREE_ENV === 'PROD' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;

const createOrder = async (userId, amount, customerPhone, customerEmail) => {
    try {
        const uniqueOrderId = `ORDER_${userId}_${Date.now()}`;
        
        const request = {
            order_amount: amount,
            order_currency: 'INR',
            order_id: uniqueOrderId,
            customer_details: {
                customer_id: userId.toString(),
                customer_phone: customerPhone || '9999999999',
                customer_email: customerEmail || 'test@example.com'
            },
            order_meta: {
                return_url: `https://www.google.com/` // Stub return URL for WebView detection
            }
        };

        const response = await cf.PGCreateOrder(request);
        return response.data;
    } catch (error) {
        console.error('Cashfree createOrder error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to initiate payment');
    }
};

const verifyOrder = async (orderId) => {
    try {
        const response = await cf.PGFetchOrder(orderId);
        
        if (response.data.order_status === 'PAID') {
            return {
                success: true,
                payment_id: response.data.cf_order_id,
                amount: response.data.order_amount
            };
        }
        return { success: false };
    } catch (error) {
        console.error('Cashfree verifyOrder error:', error.response?.data || error.message);
        throw new Error('Payment verification failed');
    }
};

module.exports = {
    createOrder,
    verifyOrder
};
