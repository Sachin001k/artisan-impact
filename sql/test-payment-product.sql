-- TEMPORARY — run this in Supabase SQL Editor to turn "Grandmother's Garden"
-- into a ₹1 test product so you can confirm the payment flow works without
-- risking a real amount once you switch to Razorpay Live Mode.
--
-- ₹1 = 100 paise, which is exactly Razorpay's minimum chargeable amount
-- (api/create-order.js rejects anything below 100 paise), so this is the
-- cheapest possible real-money test once you're live.

UPDATE products
SET title = 'Test Payment — Do Not Buy',
    price_inr = 1,
    image_url = '/images/test-payment.svg'
WHERE title = 'Grandmother''s Garden';

-- =============================================================================
-- TO REVERT once you're done testing (restores the original product):
-- =============================================================================
-- UPDATE products
-- SET title = 'Grandmother''s Garden',
--     price_inr = 1800,
--     image_url = 'https://picsum.photos/400/300?random=5'
-- WHERE title = 'Test Payment — Do Not Buy';
-- =============================================================================
