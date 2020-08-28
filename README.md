# zkSync: scaling and privacy engine for Ethereum

[![Join the chat at https://gitter.im/matter-labs/zksync](https://badges.gitter.im/matter-labs/zksync.svg)](https://gitter.im/matter-labs/zksync?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

zkSync io [Live on Mainnet!](https://wallet.zksync.io).

zkSync is a scaling and privacy engine for Ethereum. Its current functionality scope includes low gas transfers of ETH and ERC20 tokens in the Ethereum network. This document is a description of the JS library that can be used to interact with zkSync. 

zkSync is built on ZK Rollup architecture. ZK Rollup is an L2 scaling solution in which all funds are held by a smart contract on the mainchain, while computation and storage are performed off-chain. For every Rollup block, a state transition zero-knowledge proof (SNARK) is generated and verified by the mainchain contract. This SNARK includes the proof of the validity of every single transaction in the Rollup block. Additionally, the public data update for every block is published over the mainchain network in the cheap calldata.

This architecture provides the following guarantees:

- The Rollup validator(s) can never corrupt the state or steal funds (unlike Sidechains).
- Users can always retrieve the funds from the Rollup even if validator(s) stop cooperating because the data is available (unlike Plasma).
- Thanks to validity proofs, neither users nor a single other trusted party needs to be online to monitor Rollup blocks in order to prevent fraud.

In other words, ZK Rollup strictly inherits the security guarantees of the underlying L1.

To learn how to use zkSync, please refer to the [zkSync SDK documentation](https://zksync.io).

## Prerequisites

Prepare dev environment prerequisites: see [docs/setup-dev.md](docs/setup-dev.md)

## Setup local dev environment

Setup:

```sh
zksync init
```

During the first initialization you have to download around 8 GB of setup files, this should be done once.
If you have a problem on this step of the initialization, see help for the `zksync plonk-setup` command.

To completely reset the dev environment:

- Stop services:
  ```sh
  zksync dev-down
  ```
- Repeat the setup procedure above

# (Re)deploy db and contraсts:

```sh
zksync redeploy
```

## Environment configurations

Env config files are held in `etc/env/`

List configurations:

```sh
zksync env
```

Switch between configurations:

```sh
zksync env <ENV_NAME>
```

## Build and run server + prover locally for development:

Run server:

```sh
zksync server
```

Server is configured using env files in `./etc/env` directory. 
After the first initialization, file `./etc/env/dev.env` will be created. By default, this file is copied from the `./etc/env/dev.env.example` template.

Server can produce block of different sizes, the list of available sizes is determined by the `SUPPORTED_BLOCK_CHUNKS_SIZES` environment variable.
Block sizes which will actually be produced by the server can be configured using the `BLOCK_CHUNK_SIZES` environment variable.

Note: for proof generation for large blocks requires a lot of resources and an average user machine 
is only capable of creating proofs for the smallest block sizes.

After that you may need to invalidate `cargo` cache by touching the files of `models`:

```sh
touch core/models/**/*.rs
```

This is required, because `models` take the environment variable value at the compile time, and
we have to recompile this module to set correct values.

If you use additional caching systems (like `sccache`), you may have to remove their cache as well.

Run prover:

```sh
zksync prover
```

Run client

```sh
zksync client
```

Client UI will be available at http://localhost:8080.
Make sure you have environment variables set right, you can check it by running:
`zksync env`. You should see `* dev` in output.

## Build and push images to dockerhub:

```sh
zksync dockerhub-push
```

# Development

## Committing changes

`zksync` uses pre-commit git hooks for basic code integrity checks. Hooks are set up automatically
within the workspace initialization process. These hooks will not allow to commit the code which does
not pass several checks.

Currently the following criteria are checked:

- Code should always be formatted via `cargo fmt`.
- Dummy Prover should not be staged for commit (see below for the explanation).

## Database migrations

- 
  ```sh
  cd core/storage
  ```
- Add diesel migration
- Rename `core/storage/schema.rs.generated` to `schema.rs`
- Run tests:
  ```sh
  zksync db-tests
  ```

## Testing

- Running all the `rust` tests:
  
  ```sh
  f cargo test
  ```

- Running the database tests:
  
  ```sh
  zksync db-tests
  ```
- Running the integration test:
  
  ```sh
  zksync server # Has to be run in the 1st terminal
  zksync prover # Has to be run in the 2nd terminal
  zksync integration-simple # Has to be run in the 3rd terminal
  ```

- Running the full integration tests (similar to `integration-simple`, but performs different full exits)
  
  ```sh
  zksync server # Has to be run in the 1st terminal
  zksync prover # Has to be run in the 2nd terminal
  zksync integration-full-exit # Has to be run in the 3rd terminal
  ```

- Running the circuit tests:
  
  ```sh
  zksync circuit-tests
  ```

- Running the prover tests:
  
  ```sh
  zksync prover-tests
  ```

- Running the benchmarks:
  
  ```sh
  f cargo bench
  ```

- Running  the loadtest:

  ```sh
  zksync server # Has to be run in the 1st terminal
  zksync prover # Has to be run in the 2nd terminal
  zksync loadtest # Has to be run in the 3rd terminal
  ```

## Using Dummy Prover

Using the real prover for the development can be not really handy, since it's pretty slow and resource consuming.

Instead, one may want to use the Dummy Prover: lightweight version of prover, which does not actually proves anything,
but acts like it does.

To enable the dummy prover, run:

```sh
zksync dummy-prover enable
```

And after that you will be able to use the dummy prover instead of actual prover:

```sh
zksync dummy-prover # Instead of `zksync prover`
```

**Warning:** `setup-dummy-prover` subcommand changes the `Verifier.sol` contract, which is a part of `git` repository.
Be sure not to commit these changes when using the dummy prover!

If one will need to switch back to the real prover, a following command is required:

```sh
zksync dummy-prover disable
```

This command will revert changes in the contract and redeploy it, so the actual prover will be usable again.

Also you can always check the current status of the dummy verifier:

```sh
$ zksync dummy-prover status
Dummy Verifier status: disabled
```


## Developing circuit

* To generate proofs one must have the universal setup files (which are downloaded during the first initialization).
* To verify generated proofs one must have verification keys. Verification keys are generated for specific circuit & Verifier.sol contract; without these keys it is impossible to verify proofs on the Ethereum network.

Steps to do after updating circuit:
1. Update circuit version by updating `KEY_DIR` in your env file (don't forget to place it to `dev.env.example`)
(last parts of this variable usually means last commit where you updated circuit).
2. Regenerate verification keys and Verifier contract using `zksync verify-keys gen` command.
3. Pack generated verification keys using `zksync verify-keys pack` command and commit resulting file to repo.


## Contracts

### Re-build contracts:

```sh
zksync build-contracts
```

### Publish source code on etherscan

```sh
zksync publish-source
```

# License

zkSync is distributed under the terms of both the MIT license
and the Apache License (Version 2.0).

See [LICENSE-APACHE](LICENSE-APACHE), [LICENSE-MIT](LICENSE-MIT) for details.
