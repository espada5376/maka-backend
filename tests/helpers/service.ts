export async function createPendingOrder(
  service: OrderService,
): Promise<{
  orderId: string;
  sessionId: string;
}> {
  const context = await createCartContext();

  const product = await createProduct(
    context.store.id,
    context.category.id,
    {
      name: "Produit état",
      price: 10000,
    },
  );

  await addCartItem(context.cart.id, product.id, 1);

  const order = await service.createFromCart(
    context.session.id,
    {
      ...validOrderInput,
      idempotencyKey: `state-${Date.now()}-${Math.random()}`,
    },
  );

  return {
    orderId: order.id,
    sessionId: context.session.id,
  };
}
