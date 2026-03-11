const CART_KEY = 'vendorvue_cart';

export const getCart = () => {
  const cart = localStorage.getItem(CART_KEY);
  return cart ? JSON.parse(cart) : [];
};

export const addToCart = (item, vendorId) => {
  const cart = getCart();
  
  // Check if adding item from different vendor
  if (cart.length > 0 && cart[0].vendorId !== vendorId) {
    return { error: 'Cannot add items from different vendors. Please clear cart first.' };
  }

  const existingItem = cart.find(cartItem => cartItem.menuItemId === item._id);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      menuItemId: item._id,
      vendorId: vendorId,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1,
      preparationTime: item.preparationTime || 10
    });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  return { success: true, cart };
};

export const updateCartItemQuantity = (menuItemId, quantity) => {
  const cart = getCart();
  const item = cart.find(cartItem => cartItem.menuItemId === menuItemId);
  
  if (item) {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return getCart();
    }
    item.quantity = quantity;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }
  
  return cart;
};

export const removeFromCart = (menuItemId) => {
  const cart = getCart().filter(item => item.menuItemId !== menuItemId);
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  return cart;
};

export const clearCart = () => {
  localStorage.removeItem(CART_KEY);
};

export const getCartTotal = () => {
  const cart = getCart();
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
};

export const getCartItemCount = () => {
  const cart = getCart();
  return cart.reduce((count, item) => count + item.quantity, 0);
};

