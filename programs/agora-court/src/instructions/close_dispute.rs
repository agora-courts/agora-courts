/*
    1. Check that ends_at blocktime has passed OR abstain votes / all votes = target %
    2. Change dispute status accordingly
    3. Distribute funds from dispute escrow to winning voters/user
    4. Increment reputation scores of winning voters by `dispute.order_price`
    5. Return status
*/