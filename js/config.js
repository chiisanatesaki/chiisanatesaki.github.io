export const STORE_URL = 'https://chiisanatesaki.stores.jp';
// 商品登録済み（2026-08-22）。ストア公開までは商品ページはクローズ表示になる
export const PRODUCT_URLS = {
  hagaki: 'https://chiisanatesaki.stores.jp/items/6a8985439025334a6a19a9ec',
  a4: 'https://chiisanatesaki.stores.jp/items/6a8988748ae1789238f6d3c3',
  wrapping: 'https://chiisanatesaki.stores.jp/items/6a8988e52dbf2b48473631f3',
  canvas: 'https://chiisanatesaki.stores.jp/items/6a89a1ae508a10d3710a3325',
};

export function productUrl(size) {
  return PRODUCT_URLS[size] || STORE_URL;
}
