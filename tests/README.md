# Testing Instructions

Set configurations for your test before running these steps in config.ts. Default configurations are provided.

Also ensure your Anchor.toml is set up properly with the wallet address pointing to the right location.

## Build instructions
1. Run `anchor build`
2. Run `anchor keys list`
3. Verify that the key in lib.rs and Anchor.toml matches. If not, update them and run `anchor build` again.

## Information on Test Inputs
The default config is set through config.ts. Set the court name, the max number of concurrent disputes, and more to test further.

## Run Unit Tests
1. Run `anchor test`