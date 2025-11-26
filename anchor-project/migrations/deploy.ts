import * as anchor from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Connection,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";

interface BookInput {
  title: string;
  author: string;
  isbn: string;
  image: string;
  publisher: string;
  publication_date: string; // ISO date string e.g. "2023-01-01"
  format: string;
  genre: string;
}

function loadKeypairFromFile(filePath: string): Keypair {
  const resolved = filePath.startsWith("~")
    ? path.join(os.homedir(), filePath.slice(1))
    : filePath;
  const raw = fs.readFileSync(resolved, "utf-8");
  const arr = JSON.parse(raw) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

function loadBooksFromJson(filePath: string): BookInput[] {
  const resolved = path.resolve(__dirname, filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Books JSON file not found: ${resolved}`);
  }
  const raw = fs.readFileSync(resolved, "utf-8");
  return JSON.parse(raw) as BookInput[];
}

async function ensureAirdropIfNeeded(
  connection: Connection,
  pubkey: PublicKey,
  minSol = 1
) {
  const bal = await connection.getBalance(pubkey, "confirmed");
  if (bal < minSol * LAMPORTS_PER_SOL) {
    console.log(`Airdropping ${minSol} SOL to ${pubkey.toBase58()}...`);
    const sig = await connection.requestAirdrop(
      pubkey,
      minSol * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(sig, "confirmed");
  }
}

async function main() {
  // admin keypair path (override with ADMIN_KEYPAIR_PATH env var)
  const adminKeypairPath =
    process.env.ADMIN_KEYPAIR_PATH ||
    path.join(os.homedir(), ".config/solana/id.json");
  if (!fs.existsSync(adminKeypairPath)) {
    throw new Error(
      `Admin keypair file not found: ${adminKeypairPath}. Set ADMIN_KEYPAIR_PATH env or create the file.`
    );
  }

  const adminKp = loadKeypairFromFile(adminKeypairPath);
  console.log("Using admin key:", adminKp.publicKey.toBase58());

  const rpc = process.env.SOLANA_RPC_URL || "http://127.0.0.1:8899";
  const connection = new anchor.web3.Connection(rpc, "confirmed");

  // ensure admin has some SOL
  await ensureAirdropIfNeeded(connection, adminKp.publicKey, 2);

  const wallet = new anchor.Wallet(adminKp);
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    anchor.AnchorProvider.defaultOptions()
  );
  anchor.setProvider(provider);

  const program = anchor.workspace.book as anchor.Program;

  // derive config PDA
  const [configPda] = await PublicKey.findProgramAddress(
    [Buffer.from("config")],
    program.programId
  );
  const cfgInfo = await connection.getAccountInfo(configPda);
  if (!cfgInfo) {
    console.log(
      "Config not found on chain. Initializing config with admin:",
      adminKp.publicKey.toBase58()
    );
    const tx = await program.methods
      .initializeConfig()
      .accounts({
        config: configPda,
        authority: adminKp.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([adminKp])
      .rpc();
    console.log("initializeConfig tx:", tx);
  } else {
    console.log("Config already exists at", configPda.toBase58());
  }

  // load books from JSON file
  const booksJsonPath = process.env.BOOKS_JSON_PATH || "./books.json";
  const books = loadBooksFromJson(booksJsonPath);
  console.log(`Loaded ${books.length} books from ${booksJsonPath}`);

  for (const b of books) {
    // derive PDA using the ISBN string (ensure ISBN <= 32 bytes)
    const isbnSeed = Buffer.from(b.isbn, "utf8");
    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from("book"), isbnSeed],
      program.programId
    );

    // convert ISO date string to unix timestamp
    const publicationTimestamp = Math.floor(
      new Date(b.publication_date).getTime() / 1000
    );

    try {
      const tx = await program.methods
        .createBook(
          b.title,
          b.author,
          b.isbn,
          b.image,
          b.publisher,
          new anchor.BN(publicationTimestamp),
          b.format,
          b.genre
        )
        .accounts({
          book: pda,
          config: configPda,
          authority: adminKp.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([adminKp])
        .rpc();

      console.log(`Created book "${b.title}" tx:`, tx, "pda:", pda.toBase58());
    } catch (err: any) {
      console.error(
        `Failed to create book "${b.title}":`,
        err.toString ? err.toString() : err
      );
    }
  }

  console.log("Done populating books.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
