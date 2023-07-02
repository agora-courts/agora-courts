# Testing Instructions

Set configurations for your test before running these steps in config.ts. Default configurations are provided.

Also ensure your Anchor.toml is set up properly with the wallet address pointing to the right location.

## Build instructions
1. Run `anchor build`
2. Run `anchor keys list`
3. Verify that the key in lib.rs and Anchor.toml matches. If not, update them and run `anchor build` again.

## Select Network URL
1. Go to tests/config.ts and select localNet or devNet for networkURL.
2. Go to Anchor.toml and select either devnet or localnet for provider cluster.

## Information on Test Inputs
All test inputs are configurable through config.ts. Set the court name, the max number of concurrent disputes, and more.
User select is the biggest option. This will give you control over choosing 3 wallets to call a certain instruction.

## Run Unit Tests
1. Run `anchor run initcourt`
2. Run `anchor run initrecord`