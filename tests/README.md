# Testing Instructions

Set configurations for your test before running these steps in config.ts. Default configurations are provided.

Also ensure your Anchor.toml is set up properly with the wallet address pointing to the right location.

## Build instructions
1. Run `anchor build`
2. Run `anchor keys list`
3. Verify that the key in lib.rs and Anchor.toml matches. If not, update them.
4. Run `anchor build` again
5. Run `solana-test-validator`
6. Run `anchor deploy`

## Run Unit Tests
1. Run `anchor run initcourt`
2. Run `anchor run initrecord`