import * as anchor from "@project-serum/anchor";
import { Program } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import { expect } from 'chai';
import { AgoraCourt } from "../target/types/agora_court";

describe("Initialize", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const { connection } = provider;
  const program = anchor.workspace.AgoraCourt as Program<AgoraCourt>;

  it("correctly initializes a new court, dispute, and dispute's cases", async () => {

  });
  
  it("attempt to initialize a dispute with invalid end time", async () => {

  });

  it("attempt to initialize a dispute with empty users vector", async () => {

  });

  it("attempt to initialize a case that doesn't belong to the user", async () => {

  });

  it("attempt to initialize a case on an expired dispute", async () => {

  });
});