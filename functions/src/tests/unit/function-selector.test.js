const {
  selectRelevantFunctions,
  scoreFunctionRelevance,
  tokenize,
} = require('../../ai/function-calling/function-selector');
const env = require('../../config/env');

describe('Smart Function Selector (Blueprint Sec 21 Step 8, 64)', () => {
  const sampleFunctions = [
    { name: 'check_order_status', description: 'Check tracking status of an order' },
    { name: 'cancel_order', description: 'Cancel an unpaid or processing order' },
    { name: 'track_shipping_courier', description: 'Get live shipping details from courier' },
    { name: 'get_weather_forecast', description: 'Get 5-day weather forecast for city' },
    { name: 'update_user_profile', description: 'Update profile email and phone' },
    { name: 'redeem_loyalty_points', description: 'Redeem user loyalty points for discounts' },
    { name: 'search_catalog_products', description: 'Search products by query or category' },
    { name: 'apply_promo_coupon', description: 'Apply promotional coupon code to checkout' },
    { name: 'get_store_locations', description: 'List nearest physical store locations' },
    { name: 'calculate_tax_rate', description: 'Calculate sales tax for shipping address' },
  ];

  test('tokenizes user query and function names properly', () => {
    const tokens = tokenize('Cek status pesanan saya ORD-123!');
    expect(tokens.has('cek')).toBe(true);
    expect(tokens.has('status')).toBe(true);
    expect(tokens.has('pesanan')).toBe(true);
    expect(tokens.has('ord')).toBe(true);
    expect(tokens.has('123')).toBe(true);
  });

  test('returns all functions when total count <= FUNCTION_INJECT_LIMIT', () => {
    const smallList = sampleFunctions.slice(0, 3);
    const selected = selectRelevantFunctions(smallList, 'random query');
    expect(selected.length).toBe(3);
    expect(selected).toEqual(smallList);
  });

  test('filters and ranks the most relevant functions when count > FUNCTION_INJECT_LIMIT', () => {
    // Total sampleFunctions = 10, limit = 8
    const query = 'Saya ingin cek status pesanan dan tracking pengiriman barang';
    const selected = selectRelevantFunctions(sampleFunctions, query);

    expect(selected.length).toBe(env.FUNCTION_INJECT_LIMIT); // exactly 8

    // The order and shipping functions must be ranked in the top results
    const selectedNames = selected.map(f => f.name);
    expect(selectedNames).toContain('check_order_status');
    expect(selectedNames).toContain('track_shipping_courier');

    // Relevance score check
    const queryTokens = tokenize(query);
    const orderScore = scoreFunctionRelevance(sampleFunctions[0], queryTokens);
    const weatherScore = scoreFunctionRelevance(sampleFunctions[3], queryTokens);
    expect(orderScore).toBeGreaterThan(weatherScore);
  });

  test('handles empty functions or empty query gracefully', () => {
    expect(selectRelevantFunctions([], 'hello')).toEqual([]);
    expect(selectRelevantFunctions(null, 'hello')).toEqual([]);

    const selectedWithEmptyQuery = selectRelevantFunctions(sampleFunctions, '');
    expect(selectedWithEmptyQuery.length).toBe(env.FUNCTION_INJECT_LIMIT);
  });
});
